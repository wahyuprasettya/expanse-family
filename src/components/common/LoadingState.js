// ============================================================
// Reusable Screen Loading State
// ============================================================
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONT_FAMILY, FONT_SIZE, SPACING } from '@constants/theme';
import { useAppTheme } from '@hooks/useAppTheme';
import { useTranslation } from '@hooks/useTranslation';
import LoadingSpinner from './LoadingSpinner';

export const LoadingState = ({ label, compact = false }) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = createStyles(colors);

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <LoadingSpinner size={compact ? 32 : 42} />
      <Text style={styles.label}>{label || t('common.loading')}</Text>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  compactContainer: {
    paddingVertical: SPACING.xl,
    flex: 0,
  },
  label: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
  },
});

export default LoadingState;
