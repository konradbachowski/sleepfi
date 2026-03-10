const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081';

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface User {
  id: string;
  wallet_address: string;
  created_at: string;
}

export interface Challenge {
  id: string;
  user_id: string;
  goal_hours: number;
  duration_days: number;
  stake_lamports: number;
  stake_tx_signature: string;
  status: 'active' | 'completed' | 'failed';
  started_at: string;
  ends_at: string;
  streak: number;
  days_logged: number;
  sleep_records: SleepRecord[] | null;
}

export interface SleepRecord {
  id: string;
  user_id: string;
  challenge_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  source: 'manual' | 'health_connect';
  met_goal: boolean;
  created_at: string;
}

export async function getOrCreateUser(walletAddress: string): Promise<User> {
  return apiPost('/api/users', { walletAddress });
}

export async function createChallenge(data: {
  userId: string;
  goalHours: number;
  durationDays: number;
  stakeLamports: number;
  stakeTxSignature: string;
}): Promise<Challenge> {
  return apiPost('/api/challenges', data);
}

export async function getActiveChallenge(userId: string): Promise<Challenge | null> {
  try {
    return await apiGet(`/api/challenges?userId=${userId}`);
  } catch {
    return null;
  }
}

export async function logSleep(data: {
  userId: string;
  challengeId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  source: 'manual' | 'health_connect';
  goalHours: number;
  walletAddress?: string;
  challengeIdOnChain?: number;
}): Promise<SleepRecord> {
  return apiPost('/api/sleep', data);
}

export interface LeaderboardEntry {
  wallet_address: string;
  best_streak: number;
  challenges_completed: number;
  total_staked_lamports: number;
  goal_hours: number | null;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    return await apiGet('/api/leaderboard');
  } catch {
    return [];
  }
}

export interface PoolStats {
  failedPoolLamports: number;
  failedPoolSol: string;
  totalActiveStakeLamports: number;
  totalActiveSol: string;
  estimatedBonusSol: string | null;
}

export async function getPoolStats(stakeLamports?: number): Promise<PoolStats> {
  const query = stakeLamports ? `?stake=${stakeLamports}` : '';
  return apiGet(`/api/pool${query}`);
}

export interface TreasuryStats {
  treasuryBalanceLamports: number;
  treasuryBalanceSol: string;
  treasuryAddress: string | null;
  explorerUrl: string | null;
  failedPoolLamports: number;
  failedPoolSol: string;
  totalActiveStakeLamports: number;
  totalActiveSol: string;
}

export async function getTreasuryStats(): Promise<TreasuryStats> {
  try {
    return await apiGet('/api/treasury');
  } catch {
    return {
      treasuryBalanceLamports: 0,
      treasuryBalanceSol: '0.0000',
      treasuryAddress: null,
      explorerUrl: null,
      failedPoolLamports: 0,
      failedPoolSol: '0.0000',
      totalActiveStakeLamports: 0,
      totalActiveSol: '0.0000',
    };
  }
}

export async function claimReward(data: {
  userId: string;
  challengeId: string;
  walletAddress: string;
}): Promise<{ success: boolean; signature?: string; payoutSol?: string; message: string }> {
  return apiPost('/api/rewards/claim', data);
}
