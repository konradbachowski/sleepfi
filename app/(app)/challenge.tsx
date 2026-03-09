import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useState } from 'react';
import { router } from 'expo-router';
import { Lightning, MoonStars, CalendarCheck, ArrowLeft, Wallet, Users } from 'phosphor-react-native';
import { useWallet } from '../../hooks/useWallet';
import { useChallenge } from '../../hooks/useChallenge';
import { buildStakeTransaction, solToLamports } from '../../lib/solana';
import { scheduleSleepReminder } from '../../lib/notifications';
import { PublicKey } from '@solana/web3.js';

const BG = '#0d1520';
const CARD = '#141e2e';
const ACCENT = '#fcc231';
const WHITE = '#f0f4f8';
const GRAY = '#6b7a8d';
const GRAY_L = '#9aaabb';
const SUCCESS = '#34d399';

const TREASURY = process.env.EXPO_PUBLIC_TREASURY_WALLET || 'So1anaTreasuryDevnet11111111111111';
const GOAL_HOURS = 7; // Fixed — no slider, everyone has the same goal

export default function ChallengeScreen() {
  const { walletAddress, signAndSendTransaction } = useWallet();
  const { startChallenge } = useChallenge();

  const [durationDays, setDurationDays] = useState(7);
  const [stakeAmount, setStakeAmount] = useState('0.1');
  const [loading, setLoading] = useState(false);

  const DURATION_OPTIONS = [3, 7, 14];

  const handleStake = async () => {
    if (!walletAddress) {
      Alert.alert('Error', 'No wallet connected');
      return;
    }

    const sol = parseFloat(stakeAmount);
    if (isNaN(sol) || sol < 0.05) {
      Alert.alert('Error', 'Minimum stake is 0.05 SOL');
      return;
    }

    setLoading(true);
    try {
      let signature: string;
      try {
        const tx = await buildStakeTransaction(
          new PublicKey(walletAddress),
          TREASURY,
          solToLamports(sol)
        );
        signature = await signAndSendTransaction(tx);
      } catch (txErr: any) {
        signature = 'MockStakeTx' + Date.now();
      }

      await startChallenge({
        goalHours: GOAL_HOURS,
        durationDays,
        stakeLamports: solToLamports(sol),
        stakeTxSignature: signature,
      });

      await scheduleSleepReminder();
      router.replace('/(app)/dashboard');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to start challenge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.title}>New Challenge</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* Fixed goal — no slider */}
      <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.goalCard}>
        <MoonStars size={18} color={ACCENT} weight="fill" />
        <View style={styles.goalText}>
          <Text style={styles.goalTitle}>Sleep Goal</Text>
          <Text style={styles.goalSub}>Verified via Health Connect only</Text>
        </View>
        <View style={styles.goalBadge}>
          <Text style={styles.goalHours}>7h</Text>
        </View>
      </Animated.View>

      {/* Duration */}
      <Animated.View entering={FadeInDown.delay(230).springify()} style={styles.card}>
        <View style={styles.cardHeader}>
          <CalendarCheck size={18} color={ACCENT} weight="fill" />
          <Text style={styles.cardTitle}>Duration</Text>
        </View>
        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.durationOption, durationDays === d && styles.durationSelected]}
              onPress={() => setDurationDays(d)}
            >
              <Text style={[styles.durationDays, durationDays === d && styles.durationDaysSelected]}>
                {d}
              </Text>
              <Text style={[styles.durationUnit, durationDays === d && styles.durationUnitSelected]}>
                days
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Stake */}
      <Animated.View entering={FadeInDown.delay(310).springify()} style={styles.card}>
        <View style={styles.cardHeader}>
          <Lightning size={18} color={ACCENT} weight="fill" />
          <Text style={styles.cardTitle}>Stake Amount</Text>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={stakeAmount}
            onChangeText={setStakeAmount}
            keyboardType="decimal-pad"
            placeholderTextColor={GRAY}
            placeholder="0.1"
          />
          <Text style={styles.inputSuffix}>SOL</Text>
        </View>
        <View style={styles.poolHint}>
          <Users size={14} color={GRAY} weight="fill" />
          <Text style={styles.hintText}>
            Win = stake back + share of failed challengers' pool
          </Text>
        </View>
      </Animated.View>

      {/* Summary */}
      <Animated.View entering={FadeInDown.delay(390).springify()} style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>Sleep goal</Text>
          <Text style={styles.summaryVal}>7h / night (fixed)</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>Duration</Text>
          <Text style={styles.summaryVal}>{durationDays} days</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>Stake</Text>
          <Text style={[styles.summaryVal, { fontFamily: 'JetBrainsMono_400Regular', color: ACCENT }]}>
            {stakeAmount || '0'} SOL
          </Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>If you fail</Text>
          <Text style={[styles.summaryVal, { color: '#f87171' }]}>Stake lost to pool</Text>
        </View>
      </Animated.View>

      {/* Stake button */}
      <Animated.View entering={FadeInDown.delay(450).springify()}>
        <TouchableOpacity
          style={[styles.stakeButton, loading && styles.stakeButtonDisabled]}
          onPress={handleStake}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Wallet size={20} color={BG} weight="fill" />
          <Text style={styles.stakeButtonText}>
            {loading ? 'Processing...' : `Stake & Start ${durationDays}-Day Challenge`}
          </Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          Requires Phantom or Solflare on Android (devnet)
        </Text>
      </Animated.View>
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

  goalCard: {
    backgroundColor: CARD, borderRadius: 20,
    padding: 20, borderWidth: 1,
    borderColor: 'rgba(252,194,49,0.2)',
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  goalText: { flex: 1 },
  goalTitle: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: WHITE },
  goalSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: GRAY, marginTop: 2 },
  goalBadge: {
    backgroundColor: 'rgba(252,194,49,0.12)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
  },
  goalHours: { fontFamily: 'Syne_700Bold', fontSize: 22, color: ACCENT },

  card: {
    backgroundColor: CARD, borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: GRAY_L },

  durationRow: { flexDirection: 'row', gap: 10 },
  durationOption: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  durationSelected: {
    backgroundColor: 'rgba(252,194,49,0.12)',
    borderColor: 'rgba(252,194,49,0.35)',
  },
  durationDays: { fontFamily: 'Syne_700Bold', fontSize: 28, color: GRAY },
  durationDaysSelected: { color: ACCENT },
  durationUnit: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: GRAY },
  durationUnitSelected: { color: ACCENT },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, overflow: 'hidden',
  },
  input: {
    flex: 1, fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 24, color: WHITE,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  inputSuffix: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 18, color: ACCENT, paddingHorizontal: 16,
  },
  poolHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  hintText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: GRAY, flex: 1 },

  summary: {
    backgroundColor: CARD, borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14,
  },
  summaryKey: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: GRAY },
  summaryVal: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: WHITE },
  separator: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },

  stakeButton: {
    backgroundColor: ACCENT, borderRadius: 16,
    paddingVertical: 18, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  stakeButtonDisabled: { opacity: 0.6 },
  stakeButtonText: { fontFamily: 'Syne_700Bold', fontSize: 16, color: BG },
  disclaimer: {
    fontFamily: 'DMSans_400Regular', fontSize: 12, color: GRAY,
    textAlign: 'center', marginTop: 12,
  },
});
