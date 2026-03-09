import { getOrCreateUser } from '../../lib/db';

export async function POST(request: Request) {
  try {
    const { walletAddress } = await request.json();
    if (!walletAddress || typeof walletAddress !== 'string') {
      return Response.json({ error: 'walletAddress required' }, { status: 400 });
    }
    const user = await getOrCreateUser(walletAddress);
    return Response.json(user);
  } catch (e) {
    console.error('[POST /api/users]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
