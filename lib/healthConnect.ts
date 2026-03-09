import {
  initialize,
  requestPermission,
  readRecords,
  getSdkStatus,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

export interface SleepData {
  startTime: string;
  endTime: string;
  durationHours: number;
  source: 'health_connect';
}

export async function checkHealthConnect(): Promise<boolean> {
  try {
    const status = await getSdkStatus();
    return status === SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
    return false;
  }
}

export async function requestSleepPermission(): Promise<boolean> {
  const available = await checkHealthConnect();
  if (!available) return false;

  try {
    await initialize();
    const granted = await requestPermission([
      { accessType: 'read', recordType: 'SleepSession' },
    ]);
    return granted.some((p: any) => p.recordType === 'SleepSession');
  } catch {
    return false;
  }
}

export async function getLastNightSleep(): Promise<SleepData | null> {
  try {
    await initialize();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(18, 0, 0, 0); // from 6pm yesterday

    const todayNoon = new Date();
    todayNoon.setHours(14, 0, 0, 0); // to 2pm today

    const { records } = await readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: yesterday.toISOString(),
        endTime: todayNoon.toISOString(),
      },
    });

    if (!records || !records.length) return null;

    const longest = (records as any[]).reduce((a, b) => {
      const aDur = new Date(a.endTime).getTime() - new Date(a.startTime).getTime();
      const bDur = new Date(b.endTime).getTime() - new Date(b.startTime).getTime();
      return aDur > bDur ? a : b;
    });

    const durationMs =
      new Date(longest.endTime).getTime() - new Date(longest.startTime).getTime();
    const durationHours = Math.round((durationMs / (1000 * 60 * 60)) * 10) / 10;

    return {
      startTime: longest.startTime,
      endTime: longest.endTime,
      durationHours,
      source: 'health_connect',
    };
  } catch {
    return null;
  }
}
