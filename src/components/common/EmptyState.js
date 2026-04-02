// ============================================================
// Reusable Empty State
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from './Button';
import { FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING } from '@constants/theme';
import { useAppTheme } from '@hooks/useAppTheme';

export const EmptyState = ({ icon = '📭', title, subtitle, actionLabel, onAction }) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} style={styles.btn} fullWidth={false} />
      )}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  icon: { fontSize: 64, marginBottom: SPACING.md },
  title: {
    fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.bold,
    color: colors.textPrimary, textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm, color: colors.textSecondary,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg,
  },
  btn: { paddingHorizontal: SPACING.xl },
});

export default EmptyState;
