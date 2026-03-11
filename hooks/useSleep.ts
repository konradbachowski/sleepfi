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

  // Read only — safe on mount, no permission dialog
  const fetchFromHealthConnect = useCallback(async (): Promise<SleepEntry | null> => {
    setLoading(true);
    setError(null);
    try {
      const sleepData = await getLastNightSleep();
      if (!sleepData) {
        setError('No sleep data found for last 2 nights. Make sure your tracker synced to Health Connect.');
        return null;
      }
      const entry: SleepEntry = { ...sleepData };
      setData(entry);
      return entry;
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('security')) {
        setError('denied');
      } else {
        setError(msg || 'Health Connect error');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Only call on button press — triggers system permission dialog
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const granted = await requestSleepPermission();
      if (granted) {
        const sleepData = await getLastNightSleep();
        if (sleepData) {
          setData({ ...sleepData });
        } else {
          setError('No sleep data found for last night');
        }
      } else {
        setError('Health Connect permission denied');
      }
      return granted;
    } catch (e: any) {
      setError('Health Connect permission denied');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    fetchFromHealthConnect,
    requestPermissions,
    loading,
    data,
    error,
    reset,
  };
}
