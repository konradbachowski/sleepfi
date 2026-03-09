import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Dimensions,
} from 'react-native';
import Animated, {
  FadeInDown, FadeInRight,
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import {
  Moon, Lightning, Plus, ArrowRight,
  CheckCircle, Flame,
} from 'phosphor-react-native';
import { useWallet } from '../../hooks/useWallet';
import { useChallenge } from '../../hooks/useChallenge';
import { lamportsToSol, shortenAddress } from '../../lib/solana';

const BG = '#0d1520';
const CARD = '#141e2e';
const ACCENT = '#fcc231';
const WHITE = '#f0f4f8';
const GRAY = '#6b7a8d';
const GRAY_L = '#9aaabb';
const SUCCESS = '#34d399';
const DANGER = '#f87171';

const { width } = Dimensions.get('window');

function BreathingStreak({ value }: { value: number }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text style={[styles.streakNumber, style]}>
      {value}
    </Animated.Text>
  );
}

function SleepBar({ day, hours, goal, index }: {
  day: string;
  hours: number | null;
  goal: number;
  index: number;
}) {
  const maxHours = 10;
  const fillRatio = hours ? Math.min(hours / maxHours, 1) : 0;
  const metGoal = hours !== null && hours >= goal;
  const barWidth = (width - 56 - 48) * fillRatio; // content width * ratio

  return (
    <Animated.View entering={FadeInRight.delay(index * 60).springify()} style={styles.barRow}>
      <Text style={styles.barDay}>{day}</Text>
      <View style={styles.barTrack}>
        {hours !== null ? (
          <View
            style={[
              styles.barFill,
              { width: barWidth, backgroundColor: metGoal ? SUCCESS : DANGER },
            ]}
          />
        ) : null}
      </View>
      <Text style={styles.barHours}>
        {hours !== null ? `${hours}h` : '--'}
      </Text>
    </Animated.View>
  );
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function DashboardScreen() {
  const { walletAddress, user } = useWallet();
  const { challenge, loading, fetchChallenge } = useChallenge();

  const onRefresh = useCallback(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  const streak = challenge ? Number(challenge.streak) : 0;
  const daysLeft = challenge
    ? Math.max(0, Math.ceil((new Date(challenge.ends_at).getTime() - Date.now()) / 86400000))
    : 0;
  const stakedSol = challenge ? lamportsToSol(challenge.stake_lamports) : '0';

  // Build last 7 days bar data from sleep_records
  const sleepBars = DAY_LABELS.map((day, i) => {
    if (!challenge?.sleep_records) return { day, hours: null };
    const record = challenge.sleep_records[challenge.sleep_records.length - 1 - i];
    return { day, hours: record ? Number(record.duration_hours) : null };
  }).reverse();

  const todayLogged = challenge?.sleep_records?.[0] != null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={ACCENT} />
      }
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning</Text>
          <Text style={styles.address}>
            {walletAddress ? shortenAddress(walletAddress) : '...'}
          </Text>
        </View>
        {challenge && (
          <View style={styles.statusDot}>
            <View style={[styles.dot, { backgroundColor: SUCCESS }]} />
            <Text style={styles.statusLabel}>Active</Text>
          </View>
        )}
      </Animated.View>

      {/* Streak Hero — asymmetric: number left, flame right */}
      {challenge ? (
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.streakCard}>
          <View style={styles.streakLeft}>
            <Text style={styles.streakLabel}>CURRENT STREAK</Text>
            <BreathingStreak value={streak} />
            <Text style={styles.streakSuffix}>days</Text>
          </View>
          <View style={styles.streakRight}>
            <Flame size={48} color={ACCENT} weight="fill" />
            <Text style={styles.daysLeft}>{daysLeft}d left</Text>
            <View style={styles.stakeChip}>
              <Lightning size={12} color={ACCENT} weight="fill" />
              <Text style={styles.stakeText}>{stakedSol} SOL</Text>
            </View>
          </View>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.emptyCard}>
          <Moon size={40} color={GRAY} weight="duotone" />
          <Text style={styles.emptyTitle}>No active challenge</Text>
          <Text style={styles.emptyBody}>Stake SOL and commit to 7 nights of quality sleep</Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => router.push('/(app)/challenge')}
          >
            <Plus size={18} color={BG} weight="bold" />
            <Text style={styles.startButtonText}>Start Challenge</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Log sleep CTA — only if active challenge and not yet logged today */}
      {challenge && !todayLogged && (
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <TouchableOpacity
            style={styles.logButton}
            onPress={() => router.push('/(app)/log-sleep')}
          >
            <Moon size={20} color={BG} weight="fill" />
            <Text style={styles.logButtonText}>Log Last Night's Sleep</Text>
            <ArrowRight size={18} color={BG} weight="bold" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {challenge && todayLogged && (
        <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.loggedBadge}>
          <CheckCircle size={18} color={SUCCESS} weight="fill" />
          <Text style={styles.loggedText}>Sleep logged for today</Text>
        </Animated.View>
      )}

      {/* This week */}
      {challenge && (
        <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.barsContainer}>
            {sleepBars.map((bar, i) => (
              <SleepBar
                key={bar.day}
                day={bar.day}
                hours={bar.hours}
                goal={challenge.goal_hours}
                index={i}
              />
            ))}
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: SUCCESS }]} />
              <Text style={styles.legendText}>Goal met</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: DANGER }]} />
              <Text style={styles.legendText}>Missed</Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* New challenge button */}
      {!challenge && (
        <Animated.View entering={FadeInDown.delay(450).springify()} style={styles.footer}>
          <TouchableOpacity
            style={styles.newChallengeBtn}
            onPress={() => router.push('/(app)/challenge')}
          >
            <Plus size={16} color={ACCENT} weight="bold" />
            <Text style={styles.newChallengeBtnText}>New Challenge</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: BG },
  container: { paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 20,
  },
  greeting: { fontFamily: 'Syne_700Bold', fontSize: 22, color: WHITE },
  address: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 12, color: GRAY, marginTop: 2 },
  statusDot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: GRAY_L },

  streakCard: {
    marginHorizontal: 16,
    padding: 28,
    borderRadius: 24,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: 'rgba(252,194,49,0.12)',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  streakLeft: { flex: 1 },
  streakLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: GRAY,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  streakNumber: {
    fontFamily: 'Syne_700Bold',
    fontSize: 96,
    lineHeight: 96,
    color: ACCENT,
    letterSpacing: -4,
  },
  streakSuffix: { fontFamily: 'DMSans_400Regular', fontSize: 18, color: GRAY_L, marginTop: -4 },
  streakRight: { alignItems: 'flex-end', gap: 8 },
  daysLeft: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: GRAY_L },
  stakeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(252,194,49,0.1)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stakeText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 12, color: ACCENT },

  emptyCard: {
    marginHorizontal: 16,
    padding: 32,
    borderRadius: 24,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: { fontFamily: 'Syne_700Bold', fontSize: 20, color: WHITE },
  emptyBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: GRAY,
    textAlign: 'center',
    lineHeight: 20,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 4,
  },
  startButtonText: { fontFamily: 'Syne_700Bold', fontSize: 15, color: BG },

  logButton: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  logButtonText: { fontFamily: 'Syne_700Bold', fontSize: 16, color: BG, flex: 1, marginLeft: 10 },

  loggedBadge: {
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  loggedText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: SUCCESS },

  section: { marginTop: 28, paddingHorizontal: 24 },
  sectionTitle: {
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
    color: WHITE,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  barsContainer: { gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barDay: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: GRAY, width: 30 },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  barHours: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: GRAY_L, width: 28 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: GRAY },

  footer: { marginTop: 24, marginHorizontal: 16 },
  newChallengeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(252,194,49,0.25)',
    borderRadius: 14,
    paddingVertical: 14,
  },
  newChallengeBtnText: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: ACCENT },
});
