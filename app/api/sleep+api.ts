import { logSleep } from '../../lib/db';

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

    return Response.json(record);
  } catch (e) {
    console.error('[POST /api/sleep]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
