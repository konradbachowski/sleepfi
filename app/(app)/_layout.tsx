import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { useWallet } from '../../hooks/useWallet';

export default function AppLayout() {
  const { isConnected } = useWallet();

  useEffect(() => {
    if (!isConnected) {
      router.replace('/(auth)');
    }
  }, [isConnected]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0d1520' },
        animation: 'fade_from_bottom',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="challenge" options={{ headerShown: false }} />
      <Stack.Screen name="log-sleep" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
}
