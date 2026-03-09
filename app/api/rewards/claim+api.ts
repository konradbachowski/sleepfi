import { sendSolFromTreasury, calculatePayout } from '../../../lib/treasury';
import { getActiveChallenge, completeChallenge } from '../../../lib/db';

export async function POST(request: Request) {
  try {
    const { userId, challengeId, walletAddress } = await request.json();

    if (!userId || !challengeId || !walletAddress) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify challenge exists and is claimable
    const challenge = await getActiveChallenge(userId);
    if (!challenge || challenge.id !== challengeId) {
      return Response.json({ error: 'Challenge not found or not active' }, { status: 404 });
    }

    const streak = Number(challenge.streak);
    const durationDays = Number(challenge.duration_days);
    const endsAt = new Date(challenge.ends_at);
    const now = new Date();

    // Challenge must be complete (time ended or all days logged)
    const timeUp = now >= endsAt;
    const allDaysLogged = streak >= durationDays;

    if (!timeUp && !allDaysLogged) {
      return Response.json({ error: 'Challenge not yet complete' }, { status: 400 });
    }

    const success = streak >= durationDays;
    const payoutLamports = calculatePayout(Number(challenge.stake_lamports), success);

    if (payoutLamports === 0) {
      // Failed challenge — mark as failed, no payout
      await completeChallenge(challengeId, 'failed');
      return Response.json({ success: false, message: 'Challenge failed. Stake forfeited.' });
    }

    // Send SOL from treasury
    const signature = await sendSolFromTreasury(walletAddress, payoutLamports);

    // Mark challenge as completed
    await completeChallenge(challengeId, 'completed');

    return Response.json({
      success: true,
      signature,
      payoutLamports,
      payoutSol: (payoutLamports / 1_000_000_000).toFixed(4),
      message: `${(payoutLamports / 1_000_000_000).toFixed(4)} SOL sent to your wallet`,
    });
  } catch (e: any) {
    console.error('[POST /api/rewards/claim]', e);
    return Response.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
}
