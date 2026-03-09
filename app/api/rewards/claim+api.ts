/**
 * On-chain claim is now handled directly from the app via `claimChallenge()` in lib/anchor.ts.
 * The user calls the Anchor `claim` instruction which transfers staked SOL + pool bonus back
 * from the vault PDA to their wallet — no server signature required.
 *
 * This endpoint remains for backward compatibility and returns current pool stats.
 */
import { getPoolStats } from '../../../lib/db';

export async function GET(_request: Request) {
  try {
    const { failedPoolLamports, totalActiveStakeLamports } = await getPoolStats();
    return Response.json({
      failedPoolSol: (failedPoolLamports / 1_000_000_000).toFixed(4),
      totalActiveStakeSol: (totalActiveStakeLamports / 1_000_000_000).toFixed(4),
      failedPoolLamports,
      totalActiveStakeLamports,
    });
  } catch (e: any) {
    console.error('[GET /api/rewards/claim]', e);
    return Response.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(_request: Request) {
  return Response.json(
    {
      deprecated: true,
      message:
        'On-chain claim is now handled directly from the app. Call claimChallenge() from lib/anchor.ts.',
    },
    { status: 410 }
  );
}
