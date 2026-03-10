import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { Trophy, Flame, Lightning } from 'phosphor-react-native';
import { getLeaderboard, LeaderboardEntry } from '../../../lib/api';
import { lamportsToSol } from '../../../lib/solana';

const BG = '#0d1520';
const CARD = '#141e2e';
const ACCENT = '#fcc231';
const WHITE = '#f0f4f8';
const GRAY = '#6b7a8d';
const GRAY_L = '#9aaabb';
const SUCCESS = '#34d399';

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

function shorten(addr: string) {
  if (addr.length <= 12) return addr;
  return addr.slice(0, 4) + '...' + addr.slice(-4);
}

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard()
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>Top sleepers on devnet</Text>
      </Animated.View>

      {loading ? (
        [0, 1, 2].map(i => (
          <View key={i} style={[styles.row, { opacity: 0.4 }]}>
            <View style={styles.rankBox}><View style={styles.skeletonRank} /></View>
            <View style={styles.info}>
              <View style={styles.skeletonName} />
              <View style={styles.skeletonSub} />
            </View>
          </View>
        ))
      ) : entries.length === 0 ? (
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyState}>
          <Trophy size={40} color={GRAY} />
          <Text style={styles.emptyTitle}>No challengers yet</Text>
          <Text style={styles.emptyText}>Be the first to complete a challenge</Text>
        </Animated.View>
      ) : (
        entries.map((entry, i) => (
          <Animated.View
            key={entry.wallet_address}
            entering={FadeInRight.delay(i * 60).springify()}
            style={[styles.row, i < 3 && styles.rowTop]}
          >
            <View style={[styles.rankBox, i < 3 && { backgroundColor: RANK_COLORS[i] + '18' }]}>
              <Text style={[styles.rank, i < 3 && { color: RANK_COLORS[i] }]}>
                {i + 1}
              </Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.wallet}>{shorten(entry.wallet_address)}</Text>
              <View style={styles.statsRow}>
                {entry.goal_hours && (
                  <Text style={styles.stat}>{entry.goal_hours}h goal</Text>
                )}
              </View>
            </View>
            <View style={styles.rightCol}>
              <View style={styles.streakBadge}>
                <Flame size={13} color={ACCENT} weight="fill" />
                <Text style={styles.streakNum}>{entry.best_streak}</Text>
              </View>
              {entry.total_staked_lamports && (
                <Text style={styles.staked}>
                  {lamportsToSol(entry.total_staked_lamports)} SOL
                </Text>
              )}
            </View>
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: BG },
  container: { paddingHorizontal: 16, paddingTop: 64, paddingBottom: 32, gap: 8 },
  header: { marginBottom: 16 },
  title: { fontFamily: 'Syne_700Bold', fontSize: 28, color: WHITE, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: GRAY, marginTop: 2 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  rowTop: { borderColor: 'rgba(252,194,49,0.12)' },
  rankBox: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  rank: { fontFamily: 'Syne_700Bold', fontSize: 16, color: GRAY_L },
  info: { flex: 1 },
  wallet: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 14, color: WHITE },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  stat: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: GRAY },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(252,194,49,0.12)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  streakNum: { fontFamily: 'Syne_700Bold', fontSize: 14, color: ACCENT },
  staked: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: GRAY },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontFamily: 'Syne_700Bold', fontSize: 20, color: WHITE },
  emptyText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: GRAY },

  skeletonRank: { width: 20, height: 20, borderRadius: 4, backgroundColor: GRAY },
  skeletonName: { width: 120, height: 14, borderRadius: 4, backgroundColor: GRAY, marginBottom: 4 },
  skeletonSub: { width: 80, height: 12, borderRadius: 4, backgroundColor: GRAY + '80' },
});
