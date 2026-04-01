// ============================================================
// Reusable Badge
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@constants/theme';

const VARIANTS = {
  income:  { bg: `${Colors.income}20`,   text: Colors.income },
  expense: { bg: `${Colors.expense}20`,  text: Colors.expense },
  warning: { bg: `${Colors.warning}20`,  text: Colors.warning },
  primary: { bg: `${Colors.primary}20`,  text: Colors.primary },
  muted:   { bg: Colors.surfaceVariant,  text: Colors.textMuted },
};

export const Badge = ({ label, variant = 'primary', style }) => {
  const v = VARIANTS[variant] || VARIANTS.primary;
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
  },
});

export default Badge;
