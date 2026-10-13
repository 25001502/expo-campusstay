export const Colors = {
  navy: '#0F1B2D',
  navy800: '#1a2d47',
  blue: '#2563EB',
  blueLight: '#3B82F6',
  blue50: '#EFF6FF',
  blue100: '#DBEAFE',
  teal: '#0D9488',
  purple: '#7C3AED',
  amber: '#F59E0B',
  background: '#F8FAFC',
  white: '#FFFFFF',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  green100: '#DCFCE7',
  green600: '#16A34A',
  red100: '#FEE2E2',
  red500: '#EF4444',
  red600: '#DC2626',
  amber100: '#FEF3C7',
  amber600: '#D97706',
  purple100: '#F3E8FF',
  purple600: '#9333EA',
  emerald100: '#D1FAE5',
  emerald600: '#059669',
};

export const Fonts = {
  heading: 'Outfit_700Bold',
  headingSemi: 'Outfit_600SemiBold',
  headingMed: 'Outfit_500Medium',
  body: 'Inter_400Regular',
  bodyMed: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
};

export const FontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const Typography = {
  display: { fontSize: 38, lineHeight: 46, fontFamily: Fonts.heading },
  screenTitle: { fontSize: 24, lineHeight: 31, fontFamily: Fonts.heading },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontFamily: Fonts.heading },
  body: { fontSize: 14, lineHeight: 21, fontFamily: Fonts.body },
  bodyMedium: { fontSize: 14, lineHeight: 21, fontFamily: Fonts.bodyMed },
  bodySemibold: { fontSize: 14, lineHeight: 21, fontFamily: Fonts.bodySemi },
  label: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.bodyMed },
  caption: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.body },
} as const;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Semantic foregrounds are intentionally darker than the decorative palette
// so normal-size text meets WCAG AA on the paired light backgrounds.
export const TextColors = {
  primary: Colors.slate900,
  secondary: Colors.slate700,
  muted: Colors.slate600,
  inverse: Colors.white,
  link: '#1D4ED8',
  danger: '#991B1B',
} as const;

export const StatusColors = {
  blue: { background: Colors.blue100, foreground: '#1D4ED8' },
  green: { background: Colors.green100, foreground: '#166534' },
  purple: { background: Colors.purple100, foreground: '#6B21A8' },
  amber: { background: Colors.amber100, foreground: '#92400E' },
  red: { background: Colors.red100, foreground: '#991B1B' },
  gray: { background: Colors.slate100, foreground: Colors.slate700 },
} as const;

export const ControlSize = {
  minimumTouchTarget: 44,
  iconButton: 44,
  inputMinimumHeight: 48,
} as const;

export const Interaction = {
  pressedOpacity: 0.72,
  disabledOpacity: 0.5,
  focusBorderColor: Colors.blue,
  focusBorderWidth: 2,
} as const;
