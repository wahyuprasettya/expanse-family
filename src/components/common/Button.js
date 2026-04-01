// ============================================================
// Common: Button Component (shadcn-inspired)
// ============================================================
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOWS } from '@constants/theme';
import { useAppTheme } from '@hooks/useAppTheme';

const SIZES = {
  sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: FONT_SIZE.sm },
  md: { paddingVertical: 14, paddingHorizontal: 24, fontSize: FONT_SIZE.md },
  lg: { paddingVertical: 18, paddingHorizontal: 32, fontSize: FONT_SIZE.lg },
};

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  style,
  textStyle,
}) => {
  const { colors } = useAppTheme();
  const styles = createStyles();
  const variants = {
    primary: { gradient: colors.gradients.primary, text: '#FFFFFF' },
    secondary: { gradient: colors.gradients.secondary, text: colors.textPrimary },
    destructive: { gradient: ['#EF4444', '#DC2626'], text: '#FFFFFF' },
    ghost: { gradient: null, text: colors.textSecondary },
    success: { gradient: colors.gradients.income, text: '#FFFFFF' },
  };
  const variantConfig = variants[variant] || variants.primary;
  const sizeConfig = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;

  const content = (
    <View style={[styles.inner, { paddingVertical: sizeConfig.paddingVertical, paddingHorizontal: sizeConfig.paddingHorizontal }]}>
      {loading ? (
        <ActivityIndicator color={variantConfig.text} size="small" />
      ) : (
        <>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={[styles.text, { fontSize: sizeConfig.fontSize, color: variantConfig.text }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </View>
  );

  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        style={[styles.ghostButton, fullWidth && styles.fullWidth, isDisabled && styles.disabled, style]}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.wrapper, fullWidth && styles.fullWidth, isDisabled && styles.disabled, style]}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={variantConfig.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, fullWidth && styles.fullWidth]}
      >
        {content}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const createStyles = () => StyleSheet.create({
  wrapper: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  gradient: {
    borderRadius: BORDER_RADIUS.md,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: FONT_WEIGHT.semibold,
    textAlign: 'center',
  },
  icon: {
    marginRight: 8,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  ghostButton: {
    borderRadius: BORDER_RADIUS.md,
  },
});

export default Button;
