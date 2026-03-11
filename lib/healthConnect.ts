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
  await initialize();

  // Wide window: noon 2 days ago → noon today (covers any sleep tracker timezone offset)
  const from = new Date();
  from.setDate(from.getDate() - 2);
  from.setHours(12, 0, 0, 0);

  const to = new Date();
  to.setHours(14, 0, 0, 0);

  const { records } = await readRecords('SleepSession', {
    timeRangeFilter: {
      operator: 'between',
      startTime: from.toISOString(),
      endTime: to.toISOString(),
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
}
