import { useState, useEffect, useCallback } from 'react';
import { Challenge, getActiveChallenge, createChallenge, logSleep } from '../lib/api';
import { useWallet } from './useWallet';

export function useChallenge() {
  const { user } = useWallet();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChallenge = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getActiveChallenge(user.id);
      setChallenge(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load challenge');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  const startChallenge = useCallback(async (data: {
    goalHours: number;
    durationDays: number;
    stakeLamports: number;
    stakeTxSignature: string;
  }) => {
    if (!user?.id) throw new Error('Not connected');
    const newChallenge = await createChallenge({ userId: user.id, ...data });
    setChallenge(newChallenge);
    return newChallenge;
  }, [user?.id]);

  const submitSleep = useCallback(async (sleepData: {
    date: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    source: 'manual' | 'health_connect';
  }) => {
    if (!user?.id || !challenge?.id) throw new Error('No active challenge');
    const record = await logSleep({
      userId: user.id,
      challengeId: challenge.id,
      goalHours: challenge.goal_hours,
      ...sleepData,
    });
    // Refresh challenge to update streak
    await fetchChallenge();
    return record;
  }, [user?.id, challenge, fetchChallenge]);

  return {
    challenge,
    loading,
    error,
    fetchChallenge,
    startChallenge,
    submitSleep,
  };
}
