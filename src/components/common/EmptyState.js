// ============================================================
// Reusable Empty State
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from './Button';
import { Colors, FONT_SIZE, FONT_WEIGHT, SPACING } from '@constants/theme';

export const EmptyState = ({ icon = '📭', title, subtitle, actionLabel, onAction }) => (
  <View style={styles.container}>
    <Text style={styles.icon}>{icon}</Text>
    <Text style={styles.title}>{title}</Text>
    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    {actionLabel && onAction && (
      <Button title={actionLabel} onPress={onAction} style={styles.btn} fullWidth={false} />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  icon: { fontSize: 64, marginBottom: SPACING.md },
  title: {
    fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold,
    color: Colors.textPrimary, textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg,
  },
  btn: { paddingHorizontal: SPACING.xl },
});

export default EmptyState;
