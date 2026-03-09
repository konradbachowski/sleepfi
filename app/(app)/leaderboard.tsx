import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { ArrowLeft, Trophy, Flame } from 'phosphor-react-native';
import { getLeaderboard, LeaderboardEntry } from '../../lib/api';
import { shortenAddress, lamportsToSol } from '../../lib/solana';

const BG = '#0d1520';
const CARD = '#141e2e';
const ACCENT = '#fcc231';
const WHITE = '#f0f4f8';
const GRAY = '#6b7a8d';
const GRAY_L = '#9aaabb';

const RANK_COLORS = ['#fcc231', '#9aaabb', '#cd7f32']; // gold, silver, bronze
const RANK_BG = ['rgba(252,194,49,0.1)', 'rgba(154,170,187,0.08)', 'rgba(205,127,50,0.08)'];

function RankBadge({ rank }: { rank: number }) {
  const color = rank <= 3 ? RANK_COLORS[rank - 1] : GRAY;
  const bg = rank <= 3 ? RANK_BG[rank - 1] : 'rgba(255,255,255,0.04)';
  return (
    <View style={[styles.rankBadge, { backgroundColor: bg }]}>
      <Text style={[styles.rankText, { color }]}>#{rank}</Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const data = await getLeaderboard();
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={ACCENT} />}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.title}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.subheader}>
        <Trophy size={16} color={ACCENT} weight="fill" />
        <Text style={styles.subheaderText}>Top sleepers by streak</Text>
      </Animated.View>

      {entries.length === 0 && !loading && (
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyCard}>
          <Trophy size={40} color={GRAY} weight="duotone" />
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptyBody}>Be the first to complete a challenge</Text>
        </Animated.View>
      )}

      {entries.map((entry, i) => (
        <Animated.View
          key={entry.wallet_address}
          entering={FadeInDown.delay(150 + i * 60).springify()}
          style={[styles.row, i === 0 && styles.rowFirst]}
        >
          <RankBadge rank={i + 1} />
          <View style={styles.rowInfo}>
            <Text style={styles.rowAddress}>{shortenAddress(entry.wallet_address, 6)}</Text>
            <Text style={styles.rowSub}>
              {entry.challenges_completed} challenge{entry.challenges_completed !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.rowStats}>
            <View style={styles.streakChip}>
              <Flame size={12} color={ACCENT} weight="fill" />
              <Text style={styles.streakChipText}>{entry.best_streak}d</Text>
            </View>
            {entry.goal_hours && (
              <Text style={styles.goalText}>{entry.goal_hours}h goal</Text>
            )}
            {entry.total_staked_lamports > 0 && (
              <Text style={styles.stakedText}>
                {lamportsToSol(Number(entry.total_staked_lamports))} SOL
              </Text>
            )}
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: BG },
  container: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 48, gap: 8 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: 'Syne_700Bold', fontSize: 20, color: WHITE },
  subheader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 4, marginBottom: 8,
  },
  subheaderText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: GRAY_L },

  emptyCard: {
    backgroundColor: CARD, borderRadius: 24, padding: 32,
    alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyTitle: { fontFamily: 'Syne_700Bold', fontSize: 18, color: WHITE },
  emptyBody: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: GRAY, textAlign: 'center' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  rowFirst: {
    borderColor: 'rgba(252,194,49,0.2)',
    backgroundColor: 'rgba(252,194,49,0.04)',
  },
  rankBadge: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  rankText: { fontFamily: 'Syne_700Bold', fontSize: 14 },
  rowInfo: { flex: 1 },
  rowAddress: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, color: WHITE },
  rowSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: GRAY, marginTop: 2 },
  rowStats: { alignItems: 'flex-end', gap: 4 },
  streakChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(252,194,49,0.12)', borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  streakChipText: { fontFamily: 'Syne_700Bold', fontSize: 13, color: ACCENT },
  goalText: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: GRAY },
  stakedText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: GRAY },
});
