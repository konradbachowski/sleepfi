import { sendSolFromTreasury, calculatePoolPayout } from '../../../lib/treasury';
import { getActiveChallenge, completeChallenge, getPoolStats } from '../../../lib/db';

export async function POST(request: Request) {
  try {
    const { userId, challengeId, walletAddress } = await request.json();

    if (!userId || !challengeId || !walletAddress) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const challenge = await getActiveChallenge(userId);
    if (!challenge || challenge.id !== challengeId) {
      return Response.json({ error: 'Challenge not found or not active' }, { status: 404 });
    }

    const streak = Number(challenge.streak);
    const durationDays = Number(challenge.duration_days);
    const endsAt = new Date(challenge.ends_at);
    const now = new Date();

    const timeUp = now >= endsAt;
    const allDaysLogged = streak >= durationDays;

    if (!timeUp && !allDaysLogged) {
      return Response.json({ error: 'Challenge not yet complete' }, { status: 400 });
    }

    const success = streak >= durationDays;

    if (!success) {
      // Failed — stake stays in treasury as pool for winners
      await completeChallenge(challengeId, 'failed');
      return Response.json({ success: false, message: 'Challenge failed. Stake added to reward pool.' });
    }

    // Get pool stats for proportional payout
    const { failedPoolLamports, totalActiveStakeLamports } = await getPoolStats();
    const userStake = Number(challenge.stake_lamports);

    const payoutLamports = calculatePoolPayout(userStake, failedPoolLamports, totalActiveStakeLamports);

    const signature = await sendSolFromTreasury(walletAddress, payoutLamports);
    await completeChallenge(challengeId, 'completed');

    const bonusLamports = payoutLamports - userStake;

    return Response.json({
      success: true,
      signature,
      payoutLamports,
      payoutSol: (payoutLamports / 1_000_000_000).toFixed(4),
      bonusSol: (bonusLamports / 1_000_000_000).toFixed(4),
      message: `${(payoutLamports / 1_000_000_000).toFixed(4)} SOL sent to your wallet`,
    });
  } catch (e: any) {
    console.error('[POST /api/rewards/claim]', e);
    return Response.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
}
