import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { MoonStars, Lightning, Trophy, ArrowRight } from 'phosphor-react-native';
import { useWallet } from '../../hooks/useWallet';

const { width, height } = Dimensions.get('window');

const BG = '#0d1520';
const CARD = '#141e2e';
const ACCENT = '#fcc231';
const WHITE = '#f0f4f8';
const GRAY = '#6b7a8d';

function PulsingOrb() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.15);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.22, { duration: 3000 }),
        withTiming(0.12, { duration: 3000 })
      ),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: ACCENT,
          top: height * 0.08,
          right: -80,
        },
        style,
      ]}
    />
  );
}

export default function WelcomeScreen() {
  const { connect, connecting, error } = useWallet();

  const buttonScale = useSharedValue(1);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handlePress = async () => {
    buttonScale.value = withSequence(
      withTiming(0.96, { duration: 100 }),
      withTiming(1, { duration: 150 })
    );
    try {
      await connect();
      router.replace('/(app)/dashboard');
    } catch {}
  };

  const features = [
    { icon: MoonStars, label: 'Track 7+ hours' },
    { icon: Lightning, label: 'Stake SOL on devnet' },
    { icon: Trophy, label: 'Earn sleep rewards' },
  ];

  return (
    <View style={styles.container}>
      <PulsingOrb />

      {/* Top section — left aligned (DESIGN_VARIANCE: 8) */}
      <View style={styles.top}>
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={styles.badge}>
            <MoonStars size={14} color={ACCENT} weight="fill" />
            <Text style={styles.badgeText}>Solana Seeker</Text>
          </View>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(200).springify()} style={styles.title}>
          Sleep.{'\n'}Stake.{'\n'}Earn.
        </Animated.Text>

        <Animated.Text entering={FadeInDown.delay(350).springify()} style={styles.subtitle}>
          Stake SOL on your sleep goal.{'\n'}Hit 7h every night. Collect rewards.
        </Animated.Text>
      </View>

      {/* Feature pills */}
      <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.features}>
        {features.map(({ icon: Icon, label }, i) => (
          <View key={i} style={styles.featurePill}>
            <Icon size={16} color={ACCENT} weight="fill" />
            <Text style={styles.featureText}>{label}</Text>
          </View>
        ))}
      </Animated.View>

      {/* CTA */}
      <Animated.View entering={FadeInUp.delay(650).springify()} style={styles.bottom}>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <Animated.View style={buttonStyle}>
          <TouchableOpacity
            style={[styles.button, connecting && styles.buttonDisabled]}
            onPress={handlePress}
            disabled={connecting}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </Text>
            {!connecting && <ArrowRight size={20} color={BG} weight="bold" />}
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.disclaimer}>
          Phantom or Solflare required on Android
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 28,
    paddingTop: 72,
    paddingBottom: 48,
    overflow: 'hidden',
  },
  top: {
    flex: 1,
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(252, 194, 49, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(252, 194, 49, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    alignSelf: 'flex-start',
    marginBottom: 28,
  },
  badgeText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: ACCENT,
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: 'Syne_700Bold',
    fontSize: 72,
    lineHeight: 72,
    color: WHITE,
    letterSpacing: -2,
    marginBottom: 20,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: GRAY,
    lineHeight: 24,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 40,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
  },
  featureText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: WHITE,
  },
  bottom: {
    gap: 12,
  },
  button: {
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
    color: BG,
  },
  errorText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: '#f87171',
    textAlign: 'center',
  },
  disclaimer: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: GRAY,
    textAlign: 'center',
  },
});
