import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft, TwitterLogo, GithubLogo,
  SignOut, FloppyDisk,
} from 'phosphor-react-native';
import { useWallet } from '../../hooks/useWallet';

const BG = '#0d1520';
const CARD = '#141e2e';
const ACCENT = '#fcc231';
const WHITE = '#f0f4f8';
const GRAY = '#6b7a8d';
const GRAY_L = '#9aaabb';
const DANGER = '#f87171';

export default function ProfileScreen() {
  const { walletAddress, disconnect } = useWallet();
  const [username, setUsername] = useState('');
  const [twitter, setTwitter] = useState('');
  const [github, setGithub] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet(['@sleepfi/username', '@sleepfi/twitter', '@sleepfi/github'])
      .then(pairs => {
        setUsername(pairs[0][1] || '');
        setTwitter(pairs[1][1] || '');
        setGithub(pairs[2][1] || '');
      });
  }, []);

  const handleSave = async () => {
    await AsyncStorage.multiSet([
      ['@sleepfi/username', username],
      ['@sleepfi/twitter', twitter],
      ['@sleepfi/github', github],
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Switch Wallet',
      'Disconnect current wallet and go back to connect screen?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            disconnect();
            router.replace('/(auth)');
          },
        },
      ]
    );
  };

  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : walletAddress
    ? walletAddress.slice(0, 2).toUpperCase()
    : '??';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* Avatar */}
      <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        {walletAddress && (
          <Text style={styles.walletAddr}>
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-6)}
          </Text>
        )}
      </Animated.View>

      {/* Username */}
      <Animated.View entering={FadeInDown.delay(190).springify()} style={styles.field}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="your_username"
          placeholderTextColor={GRAY}
          autoCapitalize="none"
        />
      </Animated.View>

      {/* Socials */}
      <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.card}>
        <Text style={styles.sectionTitle}>Socials</Text>

        <View style={styles.socialRow}>
          <TwitterLogo size={18} color='#1DA1F2' weight="fill" />
          <TextInput
            style={styles.socialInput}
            value={twitter}
            onChangeText={setTwitter}
            placeholder="@handle"
            placeholderTextColor={GRAY}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.socialRow}>
          <GithubLogo size={18} color={GRAY_L} weight="fill" />
          <TextInput
            style={styles.socialInput}
            value={github}
            onChangeText={setGithub}
            placeholder="github_username"
            placeholderTextColor={GRAY}
            autoCapitalize="none"
          />
        </View>
      </Animated.View>

      {/* Save button */}
      <Animated.View entering={FadeInDown.delay(310).springify()}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <FloppyDisk size={18} color={BG} weight="fill" />
          <Text style={styles.saveBtnText}>{saved ? 'Saved!' : 'Save Profile'}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Divider */}
      <View style={styles.sectionDivider} />

      {/* Switch wallet */}
      <Animated.View entering={FadeInDown.delay(370).springify()}>
        <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect} activeOpacity={0.85}>
          <SignOut size={18} color={DANGER} />
          <Text style={styles.disconnectText}>Switch Wallet</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: BG },
  container: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 48, gap: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: 'Syne_700Bold', fontSize: 20, color: WHITE },

  avatarSection: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(252,194,49,0.15)',
    borderWidth: 2, borderColor: 'rgba(252,194,49,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Syne_700Bold', fontSize: 28, color: ACCENT },
  walletAddr: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 12, color: GRAY },

  field: { gap: 6 },
  label: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: GRAY_L },
  input: {
    backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: 'DMSans_400Regular', fontSize: 15, color: WHITE,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },

  card: {
    backgroundColor: CARD, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionTitle: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: GRAY_L, marginBottom: 12 },
  socialRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  socialInput: {
    flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 15, color: WHITE,
    paddingVertical: 8,
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 4 },

  saveBtn: {
    backgroundColor: ACCENT, borderRadius: 16,
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  saveBtnText: { fontFamily: 'Syne_700Bold', fontSize: 16, color: BG },

  sectionDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },

  disconnectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: 16, paddingVertical: 16,
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)',
    backgroundColor: 'rgba(248,113,113,0.06)',
  },
  disconnectText: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: DANGER },
});
