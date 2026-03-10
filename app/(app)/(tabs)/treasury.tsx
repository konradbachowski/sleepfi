import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { Vault, ArrowsClockwise, Lightning, Moon, Coins } from 'phosphor-react-native';
import { getPoolStats, PoolStats } from '../../../lib/api';

const BG = '#0d1520';
const CARD = '#141e2e';
const ACCENT = '#fcc231';
const WHITE = '#f0f4f8';
const GRAY = '#6b7a8d';
const GRAY_L = '#9aaabb';
const SUCCESS = '#34d399';

export default function TreasuryScreen() {
  const [pool, setPool] = useState<PoolStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getPoolStats()
      .then(setPool)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Treasury</Text>
          <Text style={styles.subtitle}>Reward pool stats</Text>
        </View>
        <TouchableOpacity onPress={load} style={styles.refreshBtn}>
          <ArrowsClockwise size={18} color={GRAY} />
        </TouchableOpacity>
      </Animated.View>

      {/* Hero: failed pool */}
      <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.heroCard}>
        <Text style={styles.heroLabel}>FAILED STAKES POOL</Text>
        <Text style={styles.heroValue}>
          {loading ? '—' : pool?.failedPoolSol ?? '0.0000'}
        </Text>
        <Text style={styles.heroUnit}>SOL available to winners</Text>
        <View style={styles.heroDivider} />
        <Text style={styles.heroDesc}>
          Every failed challenge feeds this pool. Winners share it proportionally to their stake.
        </Text>
      </Animated.View>

      {/* Stats row */}
      <Animated.View entering={FadeInDown.delay(230).springify()} style={styles.statsRow}>
        <View style={styles.statCard}>
          <Vault size={18} color={ACCENT} weight="fill" />
          <Text style={styles.statValue}>
            {loading ? '—' : pool?.totalActiveSol ?? '0.0000'}
          </Text>
          <Text style={styles.statLabel}>SOL{'\n'}staked</Text>
        </View>
        <View style={styles.statCard}>
          <Coins size={18} color={SUCCESS} weight="fill" />
          <Text style={[styles.statValue, { color: SUCCESS }]}>
            {loading ? '—' : pool?.failedPoolSol ?? '0.0000'}
          </Text>
          <Text style={styles.statLabel}>SOL{'\n'}in pool</Text>
        </View>
        <View style={styles.statCard}>
          <Lightning size={18} color={ACCENT} weight="fill" />
          <Text style={styles.statValue}>5%</Text>
          <Text style={styles.statLabel}>Platform{'\n'}fee</Text>
        </View>
      </Animated.View>

      {/* How it works */}
      <Animated.View entering={FadeInDown.delay(310).springify()} style={styles.howCard}>
        <Text style={styles.howTitle}>How rewards work</Text>
        {[
          { icon: <Lightning size={16} color={ACCENT} weight="fill" />, step: 'Stake SOL', desc: 'Lock SOL to start a sleep challenge' },
          { icon: <Moon size={16} color={ACCENT} weight="fill" />, step: 'Sleep 7+ hours', desc: 'Hit your goal every night for the duration' },
          { icon: <Coins size={16} color={SUCCESS} weight="fill" />, step: 'Earn rewards', desc: 'Get your stake back + share of failed pool' },
        ].map((item, i) => (
          <View key={i} style={styles.howRow}>
            <View style={styles.howIcon}>{item.icon}</View>
            <View style={styles.howText}>
              <Text style={styles.howStep}>{item.step}</Text>
              <Text style={styles.howDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: BG },
  container: { paddingHorizontal: 16, paddingTop: 64, paddingBottom: 32, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title: { fontFamily: 'Syne_700Bold', fontSize: 28, color: WHITE, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: GRAY, marginTop: 2 },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
  },

  heroCard: {
    backgroundColor: CARD, borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: 'rgba(252,194,49,0.2)',
  },
  heroLabel: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: GRAY, letterSpacing: 1.2, marginBottom: 8 },
  heroValue: { fontFamily: 'Syne_700Bold', fontSize: 56, color: ACCENT, lineHeight: 60, letterSpacing: -1 },
  heroUnit: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: GRAY_L, marginTop: 4 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 16 },
  heroDesc: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: GRAY, lineHeight: 18 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 6,
  },
  statValue: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 18, color: WHITE },
  statLabel: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: GRAY, lineHeight: 15 },

  howCard: {
    backgroundColor: CARD, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  howTitle: { fontFamily: 'Syne_700Bold', fontSize: 16, color: WHITE, marginBottom: 16 },
  howRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
  howIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(252,194,49,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  howText: { flex: 1 },
  howStep: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: WHITE },
  howDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: GRAY, marginTop: 2 },
});
