import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, TextInput,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Moon, ArrowLeft, CheckCircle, Heartbeat, Warning } from 'phosphor-react-native';
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

export default function LogSleepScreen() {
  const { user } = useWallet();
  const { challenge, submitSleep } = useChallenge();
  const { fetchFromHealthConnect, calculateManual, data, loading, error } = useSleep();
  const [submitting, setSubmitting] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [bedtimeStr, setBedtimeStr] = useState('23:00');
  const [wakeStr, setWakeStr] = useState('06:30');

  // Auto-fetch on mount
  useEffect(() => {
    fetchFromHealthConnect();
  }, []);

  const handleManualSubmit = () => {
    const [bH, bM] = bedtimeStr.split(':').map(Number);
    const [wH, wM] = wakeStr.split(':').map(Number);
    if (isNaN(bH) || isNaN(bM) || isNaN(wH) || isNaN(wM)) {
      Alert.alert('Invalid time', 'Use HH:MM format e.g. 23:00');
      return;
    }
    const bedtime = new Date();
    bedtime.setHours(bH, bM, 0, 0);
    const wakeTime = new Date();
    wakeTime.setHours(wH, wM, 0, 0);
    calculateManual(bedtime, wakeTime);
    setShowManual(false);
  };

  const goalHours = 7;
  const metGoal = data && data.durationHours >= goalHours;

  const handleLog = async () => {
    if (!challenge || !user) {
      Alert.alert('Error', 'No active challenge');
      return;
    }
    if (!data) {
      Alert.alert('No data', 'Health Connect data not available. Make sure you have a sleep tracker connected.');
      return;
    }

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await submitSleep({
        date: today,
        startTime: data.startTime,
        endTime: data.endTime,
        durationHours: data.durationHours,
        source: 'health_connect',
      });
      router.replace('/(app)/(tabs)');
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

      {/* Health Connect status */}
      <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.hcCard}>
        <Heartbeat size={20} color={ACCENT} weight="fill" />
        <View style={styles.hcText}>
          <Text style={styles.hcTitle}>Health Connect</Text>
          <Text style={styles.hcSub}>
            {loading
              ? 'Reading last night\'s sleep...'
              : data
              ? 'Sleep data loaded'
              : 'No data found for last night'}
          </Text>
        </View>
        {!loading && (
          <TouchableOpacity onPress={fetchFromHealthConnect} style={styles.retryBtn}>
            <Text style={styles.retryText}>Refresh</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* No HC data warning */}
      {!loading && !data && (
        <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.warningCard}>
          <Warning size={18} color={ACCENT} weight="fill" />
          <Text style={styles.warningText}>
            No sleep session found. Make sure you have Samsung Health, Sleep as Android, or another Health Connect app installed and tracking your sleep.
          </Text>
        </Animated.View>
      )}

      {error && (
        <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.warningCard}>
          <Warning size={18} color={DANGER} weight="fill" />
          <Text style={[styles.warningText, { color: DANGER }]}>{error}</Text>
        </Animated.View>
      )}

      {/* Grant permission CTA */}
      {error && error.toLowerCase().includes('denied') && (
        <Animated.View entering={FadeInDown.springify()} style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Health Connect Access Required</Text>
          <Text style={styles.permissionText}>
            SleepFi needs access to your sleep data from Health Connect.
            Make sure Health Connect is installed and grant permission.
          </Text>
          <TouchableOpacity onPress={fetchFromHealthConnect} style={styles.permissionBtn}>
            <Heartbeat size={18} color={BG} weight="fill" />
            <Text style={styles.permissionBtnText}>Grant Access</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Manual fallback */}
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <TouchableOpacity
          onPress={() => setShowManual(!showManual)}
          style={styles.manualToggle}
        >
          <Text style={styles.manualToggleText}>
            {showManual ? 'Hide manual entry' : 'Enter sleep time manually'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {showManual && (
        <Animated.View entering={FadeInDown.springify()} style={styles.manualCard}>
          <Text style={styles.manualLabel}>Bedtime (HH:MM)</Text>
          <TextInput
            style={styles.manualInput}
            value={bedtimeStr}
            onChangeText={setBedtimeStr}
            placeholder="23:00"
            placeholderTextColor={GRAY}
            keyboardType="numeric"
            maxLength={5}
          />
          <Text style={styles.manualLabel}>Wake time (HH:MM)</Text>
          <TextInput
            style={styles.manualInput}
            value={wakeStr}
            onChangeText={setWakeStr}
            placeholder="06:30"
            placeholderTextColor={GRAY}
            keyboardType="numeric"
            maxLength={5}
          />
          <TouchableOpacity onPress={handleManualSubmit} style={styles.manualBtn}>
            <Text style={styles.manualBtnText}>Use this data</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Duration display */}
      {data && (
        <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.durationCard}>
          <Text style={styles.durationLabel}>LAST NIGHT</Text>
          <View style={styles.durationRow}>
            <Text style={styles.durationValue}>{data.durationHours}</Text>
            <Text style={styles.durationUnit}>hours</Text>
          </View>
          <View style={[
            styles.goalBadge,
            { backgroundColor: metGoal ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)' }
          ]}>
            {metGoal ? (
              <CheckCircle size={14} color={SUCCESS} weight="fill" />
            ) : (
              <Moon size={14} color={DANGER} weight="fill" />
            )}
            <Text style={[styles.goalText, { color: metGoal ? SUCCESS : DANGER }]}>
              {metGoal
                ? `Goal met — streak continues`
                : `${(goalHours - data.durationHours).toFixed(1)}h below 7h goal — streak broken`}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Log button */}
      <Animated.View entering={FadeInDown.delay(380).springify()}>
        <TouchableOpacity
          style={[styles.logButton, (!data || submitting) && styles.logButtonDisabled]}
          onPress={handleLog}
          disabled={!data || submitting}
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

  hcCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(252,194,49,0.2)',
  },
  hcText: { flex: 1 },
  hcTitle: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: WHITE },
  hcSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: GRAY, marginTop: 2 },
  retryBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  retryText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: GRAY },

  warningCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(252,194,49,0.06)', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(252,194,49,0.12)',
  },
  warningText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: GRAY, flex: 1, lineHeight: 18 },

  durationCard: {
    backgroundColor: CARD, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
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
    alignSelf: 'flex-start',
  },
  goalText: { fontFamily: 'DMSans_500Medium', fontSize: 13 },

  logButton: {
    backgroundColor: ACCENT, borderRadius: 16,
    paddingVertical: 18, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  logButtonDisabled: { opacity: 0.4 },
  logButtonText: { fontFamily: 'Syne_700Bold', fontSize: 16, color: BG },

  permissionCard: {
    backgroundColor: 'rgba(252,194,49,0.08)', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: 'rgba(252,194,49,0.25)', gap: 12,
  },
  permissionTitle: { fontFamily: 'Syne_700Bold', fontSize: 16, color: WHITE },
  permissionText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: GRAY_L, lineHeight: 18 },
  permissionBtn: {
    backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  permissionBtnText: { fontFamily: 'Syne_700Bold', fontSize: 15, color: BG },
  manualToggle: { alignItems: 'center', paddingVertical: 8 },
  manualToggleText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: GRAY_L, textDecorationLine: 'underline' },
  manualCard: {
    backgroundColor: CARD, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 8,
  },
  manualLabel: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: GRAY_L },
  manualInput: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14,
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 20, color: WHITE,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    textAlign: 'center',
  },
  manualBtn: {
    backgroundColor: 'rgba(252,194,49,0.12)', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
    borderWidth: 1, borderColor: 'rgba(252,194,49,0.2)',
  },
  manualBtnText: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: ACCENT },
});
