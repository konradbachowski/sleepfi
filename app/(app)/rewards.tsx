import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Trophy, ArrowLeft, CheckCircle, XCircle, PiggyBank } from 'phosphor-react-native';
import { useChallenge } from '../../hooks/useChallenge';
import { lamportsToSol } from '../../lib/solana';
import { claimReward, getPoolStats, PoolStats } from '../../lib/api';
import { useWallet } from '../../hooks/useWallet';
import { useState, useEffect } from 'react';

const BG = '#0d1520';
const CARD = '#141e2e';
const ACCENT = '#fcc231';
const WHITE = '#f0f4f8';
const GRAY = '#6b7a8d';
const GRAY_L = '#9aaabb';
const SUCCESS = '#34d399';
const DANGER = '#f87171';

export default function RewardsScreen() {
  const { challenge } = useChallenge();
  const { walletAddress, user } = useWallet();
  const [claiming, setClaiming] = useState(false);
  const [pool, setPool] = useState<PoolStats | null>(null);

  useEffect(() => {
    const stake = challenge ? Number(challenge.stake_lamports) : 0;
    getPoolStats(stake).then(setPool).catch(() => {});
  }, [challenge]);

  const streak = challenge ? Number(challenge.streak) : 0;
  const totalDays = challenge?.duration_days || 7;
  const daysLeft = challenge
    ? Math.max(0, Math.ceil((new Date(challenge.ends_at).getTime() - Date.now()) / 86400000))
    : 0;
  const isComplete = challenge?.status === 'completed' || (daysLeft === 0 && !!challenge);
  const progressPercent = totalDays > 0 ? (streak / totalDays) * 100 : 0;
  const stakedSol = challenge ? lamportsToSol(challenge.stake_lamports) : '0';

  const handleClaim = async () => {
    if (!challenge || !user || !walletAddress) return;
    setClaiming(true);
    try {
      const result = await claimReward({
        userId: user.id,
        challengeId: challenge.id,
        walletAddress,
      });
      if (result.success) {
        Alert.alert(
          'Rewards Claimed!',
          `${result.payoutSol} SOL sent to your wallet.\nTx: ${result.signature?.slice(0, 20)}...`,
          [{ text: 'Sweet', onPress: () => router.replace('/(app)/(tabs)') }]
        );
      } else {
        Alert.alert('Challenge Failed', result.message);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to claim rewards');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.title}>Rewards</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {!challenge ? (
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.emptyCard}>
          <Trophy size={48} color={GRAY} weight="duotone" />
          <Text style={styles.emptyTitle}>No active challenge</Text>
          <Text style={styles.emptyBody}>Start a challenge to earn sleep rewards</Text>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => router.push('/(app)/challenge')}
          >
            <Text style={styles.startBtnText}>Start Challenge</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <>
          {/* Progress card */}
          <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>CHALLENGE PROGRESS</Text>
              <Text style={styles.progressDays}>{daysLeft}d remaining</Text>
            </View>
            <View style={styles.progressNumbers}>
              <Text style={styles.progressStreak}>{streak}</Text>
              <Text style={styles.progressOf}>/ {totalDays}</Text>
            </View>
            <Text style={styles.progressSubtitle}>nights goal met</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` as any }]} />
            </View>
          </Animated.View>

          {/* Live pool */}
          {pool && (
            <Animated.View entering={FadeInDown.delay(210).springify()} style={styles.poolCard}>
              <View style={styles.poolRow}>
                <PiggyBank size={16} color={ACCENT} weight="fill" />
                <Text style={styles.poolTitle}>Reward Pool</Text>
                <Text style={styles.poolSol}>{pool.failedPoolSol} SOL</Text>
              </View>
              {pool.estimatedBonusSol && parseFloat(pool.estimatedBonusSol) > 0 && (
                <Text style={styles.poolBonus}>
                  Your share if you succeed: <Text style={{ color: SUCCESS }}>+{pool.estimatedBonusSol} SOL</Text>
                </Text>
              )}
            </Animated.View>
          )}

          {/* Stake info */}
          <Animated.View entering={FadeInDown.delay(230).springify()} style={styles.stakeCard}>
            <View style={styles.stakeRow}>
              <Text style={styles.stakeKey}>Staked</Text>
              <Text style={styles.stakeVal}>{stakedSol} SOL</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stakeRow}>
              <Text style={styles.stakeKey}>Pool bonus (on success)</Text>
              <Text style={[styles.stakeVal, { color: SUCCESS }]}>from failed challengers</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stakeRow}>
              <Text style={styles.stakeKey}>If you fail</Text>
              <Text style={[styles.stakeVal, { color: DANGER }]}>stake lost to pool</Text>
            </View>
          </Animated.View>

          {/* Sleep log */}
          {challenge.sleep_records && challenge.sleep_records.length > 0 && (
            <Animated.View entering={FadeInDown.delay(310).springify()} style={styles.logsSection}>
              <Text style={styles.logsTitle}>Sleep Log</Text>
              {challenge.sleep_records.slice(0, 7).map((record: any, i: number) => (
                <View key={i} style={styles.logRow}>
                  {record.met_goal ? (
                    <CheckCircle size={18} color={SUCCESS} weight="fill" />
                  ) : record.duration_hours ? (
                    <XCircle size={18} color={DANGER} weight="fill" />
                  ) : (
                    <CheckCircle size={18} color={GRAY} weight="regular" />
                  )}
                  <Text style={styles.logDate}>{record.date || `Night ${i + 1}`}</Text>
                  <Text style={[
                    styles.logHours,
                    { color: record.met_goal ? SUCCESS : record.duration_hours ? DANGER : GRAY }
                  ]}>
                    {record.duration_hours ? `${record.duration_hours}h` : '--'}
                  </Text>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Claim button */}
          {isComplete && (
            <Animated.View entering={FadeInDown.delay(390).springify()}>
              <TouchableOpacity
                style={[styles.claimButton, claiming && { opacity: 0.6 }]}
                onPress={handleClaim}
                disabled={claiming}
              >
                <Trophy size={20} color={BG} weight="fill" />
                <Text style={styles.claimButtonText}>
                  {claiming ? 'Claiming...' : `Claim ${stakedSol} SOL + pool bonus`}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: BG },
  container: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 48, gap: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: 'Syne_700Bold', fontSize: 20, color: WHITE },

  emptyCard: {
    backgroundColor: CARD, borderRadius: 24,
    padding: 32, alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyTitle: { fontFamily: 'Syne_700Bold', fontSize: 20, color: WHITE },
  emptyBody: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: GRAY, textAlign: 'center' },
  startBtn: {
    backgroundColor: ACCENT, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 8,
  },
  startBtnText: { fontFamily: 'Syne_700Bold', fontSize: 15, color: BG },

  progressCard: {
    backgroundColor: CARD, borderRadius: 24,
    padding: 24, borderWidth: 1, borderColor: 'rgba(252,194,49,0.12)',
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressLabel: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: GRAY, letterSpacing: 1.2 },
  progressDays: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: GRAY_L },
  progressNumbers: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  progressStreak: { fontFamily: 'Syne_700Bold', fontSize: 72, color: ACCENT, lineHeight: 76 },
  progressOf: { fontFamily: 'Syne_700Bold', fontSize: 28, color: GRAY },
  progressSubtitle: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: GRAY_L, marginTop: 4, marginBottom: 16 },
  progressTrack: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 3 },

  poolCard: {
    backgroundColor: 'rgba(252,194,49,0.06)', borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: 'rgba(252,194,49,0.15)', gap: 6,
  },
  poolRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  poolTitle: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: GRAY_L, flex: 1 },
  poolSol: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 14, color: ACCENT },
  poolBonus: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: GRAY },

  stakeCard: {
    backgroundColor: CARD, borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  stakeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  stakeKey: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: GRAY },
  stakeVal: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: WHITE },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },

  logsSection: { gap: 2 },
  logsTitle: { fontFamily: 'Syne_700Bold', fontSize: 18, color: WHITE, marginBottom: 10 },
  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  logDate: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, color: GRAY_L },
  logHours: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 14 },

  claimButton: {
    backgroundColor: ACCENT, borderRadius: 16,
    paddingVertical: 18, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  claimButtonText: { fontFamily: 'Syne_700Bold', fontSize: 17, color: BG },
});
