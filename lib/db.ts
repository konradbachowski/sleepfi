import { neon } from '@neondatabase/serverless';

const getDb = () => {
  const url = process.env.DATABASE_URL || process.env.EXPO_PUBLIC_DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  return neon(url);
};

export async function getOrCreateUser(walletAddress: string) {
  const sql = getDb();
  const result = await sql`
    INSERT INTO users (wallet_address)
    VALUES (${walletAddress})
    ON CONFLICT (wallet_address) DO UPDATE SET wallet_address = EXCLUDED.wallet_address
    RETURNING *
  `;
  return result[0] as { id: string; wallet_address: string; created_at: string };
}

export async function createChallenge(
  userId: string,
  opts: {
    goalHours: number;
    durationDays: number;
    stakeLamports: number;
    stakeTxSignature: string;
  }
) {
  const sql = getDb();
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + opts.durationDays);

  const result = await sql`
    INSERT INTO challenges (user_id, goal_hours, duration_days, stake_lamports, stake_tx_signature, ends_at)
    VALUES (${userId}, ${opts.goalHours}, ${opts.durationDays}, ${opts.stakeLamports}, ${opts.stakeTxSignature}, ${endsAt.toISOString()})
    RETURNING *
  `;
  return result[0];
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
}) {
  const sql = getDb();
  const metGoal = data.durationHours >= data.goalHours;
  const result = await sql`
    INSERT INTO sleep_records (user_id, challenge_id, date, start_time, end_time, duration_hours, source, met_goal)
    VALUES (${data.userId}, ${data.challengeId}, ${data.date}, ${data.startTime}, ${data.endTime}, ${data.durationHours}, ${data.source}, ${metGoal})
    ON CONFLICT (user_id, date) DO UPDATE SET
      duration_hours = EXCLUDED.duration_hours,
      met_goal = EXCLUDED.met_goal,
      source = EXCLUDED.source
    RETURNING *
  `;
  return result[0];
}

export async function getActiveChallenge(userId: string) {
  const sql = getDb();
  const result = await sql`
    SELECT c.*,
      COUNT(sr.id) FILTER (WHERE sr.met_goal = true) as streak,
      COUNT(sr.id) as days_logged,
      json_agg(json_build_object(
        'date', sr.date,
        'duration_hours', sr.duration_hours,
        'met_goal', sr.met_goal,
        'source', sr.source
      ) ORDER BY sr.date DESC) FILTER (WHERE sr.id IS NOT NULL) as sleep_records
    FROM challenges c
    LEFT JOIN sleep_records sr ON sr.challenge_id = c.id
    WHERE c.user_id = ${userId} AND c.status = 'active'
    GROUP BY c.id
    ORDER BY c.started_at DESC
    LIMIT 1
  `;
  return result[0] || null;
}

export async function getSleepHistory(userId: string, challengeId: string) {
  const sql = getDb();
  const result = await sql`
    SELECT * FROM sleep_records
    WHERE user_id = ${userId} AND challenge_id = ${challengeId}
    ORDER BY date DESC
    LIMIT 14
  `;
  return result;
}

export async function getPoolStats(): Promise<{
  failedPoolLamports: number;
  totalActiveStakeLamports: number;
}> {
  const sql = getDb();
  const result = await sql`
    SELECT
      COALESCE(SUM(stake_lamports) FILTER (WHERE status = 'failed'), 0) as failed_pool,
      COALESCE(SUM(stake_lamports) FILTER (WHERE status IN ('active', 'completed')), 0) as total_active
    FROM challenges
  `;
  return {
    failedPoolLamports: Number(result[0].failed_pool),
    totalActiveStakeLamports: Number(result[0].total_active),
  };
}

export async function getLeaderboard(limit = 20) {
  const sql = getDb();
  const result = await sql`
    SELECT
      u.wallet_address,
      MAX(CAST(streak_data.streak AS INT)) as best_streak,
      COUNT(DISTINCT c.id) as challenges_completed,
      SUM(c.stake_lamports) FILTER (WHERE c.status = 'completed') as total_staked_lamports,
      (SELECT goal_hours FROM challenges c2
       WHERE c2.user_id = u.id AND c2.status IN ('active', 'completed')
       ORDER BY c2.started_at DESC LIMIT 1) as goal_hours
    FROM users u
    JOIN challenges c ON c.user_id = u.id
    JOIN LATERAL (
      SELECT COUNT(*) FILTER (WHERE sr.met_goal = true) as streak
      FROM sleep_records sr
      WHERE sr.challenge_id = c.id
    ) streak_data ON true
    WHERE c.status IN ('active', 'completed')
    GROUP BY u.id, u.wallet_address
    ORDER BY best_streak DESC, challenges_completed DESC
    LIMIT ${limit}
  `;
  return result;
}

export async function completeChallenge(challengeId: string, status: 'completed' | 'failed') {
  const sql = getDb();
  const result = await sql`
    UPDATE challenges SET status = ${status}
    WHERE id = ${challengeId}
    RETURNING *
  `;
  return result[0];
}
