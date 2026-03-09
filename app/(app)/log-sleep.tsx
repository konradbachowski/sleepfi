import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useState } from 'react';
import { router } from 'expo-router';
import { Moon, Lightning, ArrowLeft, CheckCircle, Heartbeat } from 'phosphor-react-native';
import { useWallet } from '../../hooks/useWallet';
import { useChallenge } from '../../hooks/useChallenge';
import { useSleep } from '../../hooks/useSleep';

const BG = '#0d1520';
const CARD = '#141e2e';
const ACCENT = '#fcc231';
const WHITE = '#f0f4f8';
const GRAY = '#6b7a8d';
const GRAY_L = '#9aaabb';
const SUCCESS = '#34d399';
const DANGER = '#f87171';

// Simple time picker
const MINUTES = [0, 15, 30, 45];

function TimeSelector({
  label,
  hour,
  minute,
  onChangeHour,
  onChangeMinute,
}: {
  label: string;
  hour: number;
  minute: number;
  onChangeHour: (h: number) => void;
  onChangeMinute: (m: number) => void;
}) {
  const adjustHour = (delta: number) => {
    onChangeHour((hour + delta + 24) % 24);
  };
  const adjustMinute = (delta: number) => {
    const idx = MINUTES.indexOf(minute);
    const next = MINUTES[(idx + delta + MINUTES.length) % MINUTES.length];
    onChangeMinute(next);
  };

  return (
    <View style={styles.timeSel}>
      <Text style={styles.timeSelLabel}>{label}</Text>
      <View style={styles.timeRow}>
        {/* Hours */}
        <View style={styles.timeColumn}>
          <TouchableOpacity onPress={() => adjustHour(1)} style={styles.timeArrow}>
            <Text style={styles.timeArrowText}>▲</Text>
          </TouchableOpacity>
          <Text style={styles.timeValue}>
            {String(hour).padStart(2, '0')}
          </Text>
          <TouchableOpacity onPress={() => adjustHour(-1)} style={styles.timeArrow}>
            <Text style={styles.timeArrowText}>▼</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.timeSeparator}>:</Text>
        {/* Minutes */}
        <View style={styles.timeColumn}>
          <TouchableOpacity onPress={() => adjustMinute(1)} style={styles.timeArrow}>
            <Text style={styles.timeArrowText}>▲</Text>
          </TouchableOpacity>
          <Text style={styles.timeValue}>
            {String(minute).padStart(2, '0')}
          </Text>
          <TouchableOpacity onPress={() => adjustMinute(-1)} style={styles.timeArrow}>
            <Text style={styles.timeArrowText}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function LogSleepScreen() {
  const { user } = useWallet();
  const { challenge, submitSleep } = useChallenge();
  const { fetchFromHealthConnect, calculateManual, data, loading, error } = useSleep();

  const [bedHour, setBedHour] = useState(23);
  const [bedMinute, setBedMinute] = useState(0);
  const [wakeHour, setWakeHour] = useState(7);
  const [wakeMinute, setWakeMinute] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'auto' | 'manual'>('manual');

  const getSleepData = () => {
    if (mode === 'auto' && data) return data;

    // Build dates for manual
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const bedtime = new Date(yesterday);
    bedtime.setHours(bedHour, bedMinute, 0, 0);

    const waketime = new Date(today);
    waketime.setHours(wakeHour, wakeMinute, 0, 0);

    return calculateManual(bedtime, waketime);
  };

  const currentData = getSleepData();
  const goalHours = challenge?.goal_hours || 7;
  const metGoal = currentData && currentData.durationHours >= goalHours;

  const handleAutoDetect = async () => {
    setMode('auto');
    const result = await fetchFromHealthConnect();
    if (!result) setMode('manual');
  };

  const handleLog = async () => {
    if (!challenge || !user) {
      Alert.alert('Error', 'No active challenge');
      return;
    }

    const sleepData = getSleepData();
    if (!sleepData) return;

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await submitSleep({
        date: today,
        startTime: sleepData.startTime,
        endTime: sleepData.endTime,
        durationHours: sleepData.durationHours,
        source: sleepData.source,
      });
      router.replace('/(app)/dashboard');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to log sleep');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.title}>Log Sleep</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* Auto-detect */}
      <Animated.View entering={FadeInDown.delay(150).springify()}>
        <TouchableOpacity
          style={styles.autoBtn}
          onPress={handleAutoDetect}
          disabled={loading}
        >
          <Heartbeat size={20} color={ACCENT} weight="fill" />
          <Text style={styles.autoBtnText}>
            {loading ? 'Reading Health Connect...' : 'Auto-detect from Health Connect'}
          </Text>
        </TouchableOpacity>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </Animated.View>

      {/* Divider */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or enter manually</Text>
        <View style={styles.dividerLine} />
      </Animated.View>

      {/* Manual time pickers */}
      <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.card}>
        <TimeSelector
          label="Bedtime (last night)"
          hour={bedHour}
          minute={bedMinute}
          onChangeHour={setBedHour}
          onChangeMinute={setBedMinute}
        />
        <View style={styles.cardSeparator} />
        <TimeSelector
          label="Wake time (this morning)"
          hour={wakeHour}
          minute={wakeMinute}
          onChangeHour={setWakeHour}
          onChangeMinute={setWakeMinute}
        />
      </Animated.View>

      {/* Duration display */}
      {currentData && (
        <Animated.View entering={FadeInDown.delay(320).springify()} style={styles.durationCard}>
          <Text style={styles.durationLabel}>DURATION</Text>
          <View style={styles.durationRow}>
            <Text style={styles.durationValue}>{currentData.durationHours}</Text>
            <Text style={styles.durationUnit}>hours</Text>
          </View>
          <View style={[styles.goalBadge, { backgroundColor: metGoal ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)' }]}>
            {metGoal ? (
              <CheckCircle size={14} color={SUCCESS} weight="fill" />
            ) : (
              <Moon size={14} color={DANGER} weight="fill" />
            )}
            <Text style={[styles.goalText, { color: metGoal ? SUCCESS : DANGER }]}>
              {metGoal
                ? `Goal met (+${(currentData.durationHours - goalHours).toFixed(1)}h)`
                : `${(goalHours - currentData.durationHours).toFixed(1)}h below ${goalHours}h goal`}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Log button */}
      <Animated.View entering={FadeInDown.delay(400).springify()}>
        <TouchableOpacity
          style={[styles.logButton, submitting && styles.logButtonDisabled]}
          onPress={handleLog}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <Moon size={20} color={BG} weight="fill" />
          <Text style={styles.logButtonText}>
            {submitting ? 'Saving...' : 'Log Sleep'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: BG },
  container: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 48, gap: 14 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: 'Syne_700Bold', fontSize: 20, color: WHITE },

  autoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: CARD, borderRadius: 16,
    padding: 16, borderWidth: 1,
    borderColor: 'rgba(252,194,49,0.2)',
  },
  autoBtnText: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: WHITE, flex: 1 },
  errorText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: DANGER, marginTop: 8, paddingHorizontal: 4 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: GRAY },

  card: {
    backgroundColor: CARD, borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardSeparator: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 16 },

  timeSel: {},
  timeSelLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: GRAY, marginBottom: 12 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeColumn: { alignItems: 'center', gap: 6 },
  timeArrow: { paddingHorizontal: 16, paddingVertical: 4 },
  timeArrowText: { fontSize: 12, color: GRAY },
  timeValue: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 36,
    color: WHITE, minWidth: 56, textAlign: 'center',
  },
  timeSeparator: { fontFamily: 'Syne_700Bold', fontSize: 32, color: GRAY, marginBottom: 4 },

  durationCard: {
    backgroundColor: CARD, borderRadius: 20,
    padding: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'flex-start',
  },
  durationLabel: {
    fontFamily: 'DMSans_500Medium', fontSize: 11, color: GRAY,
    letterSpacing: 1.2, marginBottom: 4,
  },
  durationRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 },
  durationValue: { fontFamily: 'Syne_700Bold', fontSize: 64, color: ACCENT, lineHeight: 68 },
  durationUnit: { fontFamily: 'DMSans_400Regular', fontSize: 18, color: GRAY },
  goalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6,
  },
  goalText: { fontFamily: 'DMSans_500Medium', fontSize: 13 },

  logButton: {
    backgroundColor: ACCENT, borderRadius: 16,
    paddingVertical: 18, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  logButtonDisabled: { opacity: 0.6 },
  logButtonText: { fontFamily: 'Syne_700Bold', fontSize: 16, color: BG },
});
