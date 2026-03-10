import { Tabs } from 'expo-router';
import { House, Trophy, Vault } from 'phosphor-react-native';

const BG = '#0d1520';
const CARD = '#141e2e';
const ACCENT = '#fcc231';
const GRAY = '#6b7a8d';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: CARD,
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 16,
          paddingTop: 10,
        },
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: GRAY,
        tabBarLabelStyle: {
          fontFamily: 'DMSans_500Medium',
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <House size={size} color={color} weight="fill" />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color, size }) => <Trophy size={size} color={color} weight="fill" />,
        }}
      />
      <Tabs.Screen
        name="treasury"
        options={{
          title: 'Treasury',
          tabBarIcon: ({ color, size }) => <Vault size={size} color={color} weight="fill" />,
        }}
      />
    </Tabs>
  );
}
