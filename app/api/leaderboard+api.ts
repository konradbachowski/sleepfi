import { getLeaderboard } from '../../lib/db';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const data = await getLeaderboard(Math.min(limit, 50));
    return Response.json(data);
  } catch (e) {
    console.error('[GET /api/leaderboard]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
