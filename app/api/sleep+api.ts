import { logSleep } from '../../lib/db';
import { submitSleepOnChain } from '../../lib/anchorServer';
import { neon } from '@neondatabase/serverless';

async function getUserWallet(userId: string): Promise<string | null> {
  const url = process.env.DATABASE_URL || process.env.EXPO_PUBLIC_DATABASE_URL;
  if (!url) return null;
  const sql = neon(url);
  const result = await sql`SELECT wallet_address FROM users WHERE id = ${userId} LIMIT 1`;
  return result[0]?.wallet_address ?? null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId, challengeId, date,
      startTime, endTime, durationHours,
      source, goalHours,
    } = body;

    if (!userId || !challengeId || !date || !durationHours) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const record = await logSleep({
      userId,
      challengeId,
      date,
      startTime: startTime || new Date(date + 'T22:00:00Z').toISOString(),
      endTime: endTime || new Date(date + 'T06:00:00Z').toISOString(),
      durationHours: Number(durationHours),
      source: source || 'manual',
      goalHours: Number(goalHours || 7),
    });

    // Submit sleep on-chain as oracle (best-effort, non-blocking)
    const walletAddress = await getUserWallet(userId);
    if (walletAddress) {
      submitSleepOnChain(walletAddress, Number(durationHours), date).catch((err) => {
        console.error('[submit_sleep on-chain]', err?.message || err);
      });
    }

    return Response.json(record);
  } catch (e) {
    console.error('[POST /api/sleep]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
