export const theme = {
  colors: {
    bg: '#0d1520',
    bgCard: '#141e2e',
    bgCardBorder: 'rgba(252, 194, 49, 0.12)',
    bgCardInner: 'rgba(255, 255, 255, 0.04)',
    accent: '#fcc231',
    accentDim: '#e2a303',
    accentAlpha: 'rgba(252, 194, 49, 0.08)',
    white: '#f0f4f8',
    gray: '#6b7a8d',
    grayLight: '#9aaabb',
    success: '#34d399',
    danger: '#f87171',
    separator: 'rgba(255, 255, 255, 0.06)',
  },
  fonts: {
    display: 'Syne_700Bold',
    body: 'DMSans_400Regular',
    bodyMedium: 'DMSans_500Medium',
    mono: 'JetBrainsMono_400Regular',
  },
  radius: {
    card: 24,
    button: 14,
    pill: 100,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
} as const;

export type Theme = typeof theme;
