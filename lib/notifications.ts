import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Schedule daily 9:00 AM notification to log sleep
export async function scheduleSleepReminder(): Promise<string | null> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return null;

    // Cancel existing reminders first
    await cancelSleepReminder();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Log your sleep',
        body: 'How did you sleep last night? Log it to keep your streak alive.',
        sound: true,
        data: { screen: 'log-sleep' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
      },
    });

    return id;
  } catch (e) {
    console.warn('Failed to schedule notification:', e);
    return null;
  }
}

export async function cancelSleepReminder(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const sleepReminders = scheduled.filter(
      n => n.content.data?.screen === 'log-sleep'
    );
    await Promise.all(
      sleepReminders.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {}
}

export async function sendStreakNotification(streak: number): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: streak > 0 ? `${streak} day streak!` : 'Streak lost',
        body: streak > 0
          ? `You hit your sleep goal ${streak} nights in a row. Keep going.`
          : 'You missed your goal last night. Stake is at risk.',
        sound: true,
        data: { screen: 'dashboard' },
      },
      trigger: null, // immediate
    });
  } catch {}
}
