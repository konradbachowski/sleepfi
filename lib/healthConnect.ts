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

  // Window: 6pm yesterday → noon today
  const from = new Date();
  from.setDate(from.getDate() - 1);
  from.setHours(18, 0, 0, 0);

  const to = new Date();
  to.setHours(14, 0, 0, 0);

  // If "to" is before "from" (i.e. it's before 6pm and we set yesterday 6pm),
  // extend to to end of today
  if (to <= from) to.setHours(23, 59, 59, 0);

  const { records } = await readRecords('SleepSession', {
    timeRangeFilter: {
      operator: 'between',
      startTime: from.toISOString(),
      endTime: to.toISOString(),
    },
  });

  if (!records || !records.length) return null;

  // Filter out junk: sessions under 30min or over 12h
  const valid = (records as any[]).filter(r => {
    const ms = new Date(r.endTime).getTime() - new Date(r.startTime).getTime();
    return ms >= 30 * 60 * 1000 && ms <= 12 * 60 * 60 * 1000;
  });

  if (!valid.length) return null;

  // Pick the longest valid session
  const longest = valid.reduce((a, b) => {
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
