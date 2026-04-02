// ============================================================
// Common: Card Component (glassmorphism style)
// ============================================================
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BORDER_RADIUS, SPACING, SHADOWS } from '@constants/theme';
import { useAppTheme } from '@hooks/useAppTheme';

export const Card = ({
  children,
  style,
  variant = 'default', // 'default' | 'gradient' | 'glass' | 'outlined'
  gradient,
  onPress,
}) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  if (variant === 'gradient') {
    return (
      <View style={[styles.base, styles.gradient, style]}>
        <LinearGradient
          colors={gradient || colors.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {children}
      </View>
    );
  }

  if (variant === 'glass') {
    return (
      <View style={[styles.base, styles.glass, style]}>
        {children}
      </View>
    );
  }

  if (variant === 'outlined') {
    return (
      <View style={[styles.base, styles.outlined, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.base, styles.default, style]}>
      {children}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  base: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    overflow: 'hidden',
  },
  default: {
    backgroundColor: colors.surface,
    ...SHADOWS.sm,
  },
  gradient: {
    ...SHADOWS.lg,
  },
  glass: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.md,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
});

export default Card;
