import { createChallenge, getActiveChallenge } from '../../lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, goalHours, durationDays, stakeLamports, stakeTxSignature } = body;

    if (!userId || !goalHours || !durationDays || !stakeLamports || !stakeTxSignature) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const challenge = await createChallenge(userId, {
      goalHours: Number(goalHours),
      durationDays: Number(durationDays),
      stakeLamports: Number(stakeLamports),
      stakeTxSignature,
    });

    return Response.json(challenge);
  } catch (e) {
    console.error('[POST /api/challenges]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    if (!userId) {
      return Response.json({ error: 'userId required' }, { status: 400 });
    }
    const challenge = await getActiveChallenge(userId);
    return Response.json(challenge);
  } catch (e) {
    console.error('[GET /api/challenges]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
