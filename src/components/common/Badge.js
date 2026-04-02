// ============================================================
// Reusable Badge
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY } from '@constants/theme';
import { useAppTheme } from '@hooks/useAppTheme';

export const Badge = ({ label, variant = 'primary', style }) => {
  const { colors } = useAppTheme();
  const variants = {
    income: { bg: `${colors.income}20`, text: colors.income },
    expense: { bg: `${colors.expense}20`, text: colors.expense },
    warning: { bg: `${colors.warning}20`, text: colors.warning },
    primary: { bg: `${colors.primary}20`, text: colors.primary },
    muted: { bg: colors.surfaceVariant, text: colors.textMuted },
  };
  const v = variants[variant] || variants.primary;
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, style]}>
      <Text style={[styles.text, { color: v.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: FONT_FAMILY.semibold,
  },
});

export default Badge;
