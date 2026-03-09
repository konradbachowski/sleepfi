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
    let newChallenge: Challenge;
    try {
      newChallenge = await createChallenge({ userId: user.id, ...data });
    } catch {
      // API unreachable — create local challenge so app stays usable
      const now = new Date();
      const endsAt = new Date(now);
      endsAt.setDate(endsAt.getDate() + data.durationDays);
      newChallenge = {
        id: 'local-' + Date.now(),
        user_id: user.id,
        goal_hours: data.goalHours,
        duration_days: data.durationDays,
        stake_lamports: data.stakeLamports,
        stake_tx_signature: data.stakeTxSignature,
        status: 'active',
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        streak: 0,
        days_logged: 0,
        sleep_records: null,
      };
    }
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
    try {
      await logSleep({
        userId: user.id,
        challengeId: challenge.id,
        goalHours: challenge.goal_hours,
        ...sleepData,
      });
      await fetchChallenge();
    } catch {
      // API unreachable — update streak locally
      const metGoal = sleepData.durationHours >= challenge.goal_hours;
      setChallenge(prev => prev ? {
        ...prev,
        streak: metGoal ? prev.streak + 1 : prev.streak,
        days_logged: prev.days_logged + 1,
      } : prev);
    }
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
