import { useState, useCallback } from 'react';
import { requestSleepPermission, getLastNightSleep, SleepData } from '../lib/healthConnect';

export interface SleepEntry {
  startTime: string;
  endTime: string;
  durationHours: number;
  source: 'manual' | 'health_connect';
}

export function useSleep() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SleepEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFromHealthConnect = useCallback(async (): Promise<SleepEntry | null> => {
    setLoading(true);
    setError(null);
    try {
      const granted = await requestSleepPermission();
      if (!granted) {
        setError('Health Connect permission denied');
        return null;
      }
      const sleepData = await getLastNightSleep();
      if (!sleepData) {
        setError('No sleep data found for last night');
        return null;
      }
      const entry: SleepEntry = { ...sleepData };
      setData(entry);
      return entry;
    } catch (e: any) {
      setError(e?.message || 'Failed to read Health Connect');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateManual = useCallback((bedtime: Date, wakeTime: Date): SleepEntry => {
    // Handle crossing midnight
    let diff = wakeTime.getTime() - bedtime.getTime();
    if (diff < 0) diff += 24 * 60 * 60 * 1000; // add 24h if negative

    const durationHours = Math.round((diff / (1000 * 60 * 60)) * 10) / 10;
    const entry: SleepEntry = {
      startTime: bedtime.toISOString(),
      endTime: wakeTime.toISOString(),
      durationHours,
      source: 'manual',
    };
    setData(entry);
    return entry;
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    fetchFromHealthConnect,
    calculateManual,
    loading,
    data,
    error,
    reset,
  };
}
