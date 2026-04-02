// ============================================================
// Design System – Colors & Theme
// Inspired by shadcn/ui adapted for React Native
// ============================================================

const SHARED_COLORS = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  secondary: '#10B981',
  secondaryLight: '#34D399',
  secondaryDark: '#059669',
  income: '#10B981',
  expense: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  chart: [
    '#6366F1', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
    '#06B6D4', '#84CC16',
  ],
};

export const COLOR_PALETTES = {
  dark: {
    ...SHARED_COLORS,
    background: '#0F172A',
    surface: '#1E293B',
    surfaceVariant: '#334155',
    elevated: '#0F172A',
    border: '#334155',
    borderLight: '#475569',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textInverse: '#0F172A',
    gradients: {
      primary: ['#6366F1', '#8B5CF6'],
      income: ['#10B981', '#34D399'],
      expense: ['#EF4444', '#F87171'],
      card: ['#1E293B', '#0F172A'],
      header: ['#1E293B', '#0F172A'],
      dark: ['#1E293B', '#0F172A'],
      gold: ['#F59E0B', '#FBBF24'],
      secondary: ['#1E293B', '#334155'],
    },
    overlay: 'rgba(0,0,0,0.6)',
    overlayLight: 'rgba(0,0,0,0.3)',
  },
  light: {
    ...SHARED_COLORS,
    background: '#F3F7FF',
    surface: '#FFFFFF',
    surfaceVariant: '#E2E8F0',
    elevated: '#FFFFFF',
    border: '#D7E0F0',
    borderLight: '#C2CDDF',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    textInverse: '#F8FAFC',
    gradients: {
      primary: ['#6366F1', '#8B5CF6'],
      income: ['#10B981', '#34D399'],
      expense: ['#EF4444', '#F87171'],
      card: ['#FFFFFF', '#E8EEF9'],
      header: ['#F8FBFF', '#E9F1FF'],
      dark: ['#CBD5E1', '#E2E8F0'],
      gold: ['#F59E0B', '#FBBF24'],
      secondary: ['#FFFFFF', '#E2E8F0'],
    },
    overlay: 'rgba(15,23,42,0.18)',
    overlayLight: 'rgba(15,23,42,0.08)',
  },
};

export const getThemeColors = (theme = 'dark') => COLOR_PALETTES[theme] || COLOR_PALETTES.dark;
export const Colors = COLOR_PALETTES.dark;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 38,
};

export const FONT_WEIGHT = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const FONT_FAMILY = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extrabold: 'Poppins_800ExtraBold',
};

// Helper: returns fontFamily + fontWeight + optional fontSize in one call
// Usage: ...typography('bold', FONT_SIZE.md)
export const typography = (weight = 'regular', size) => ({
  fontFamily: FONT_FAMILY[weight] || FONT_FAMILY.regular,
  fontWeight: FONT_WEIGHT[weight] || FONT_WEIGHT.regular,
  ...(size !== undefined ? { fontSize: size } : {}),
});

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
};
