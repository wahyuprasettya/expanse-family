// ============================================================
// Budget Card Component
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { formatCurrency, formatPercentage } from '@utils/formatters';
import { useAppTheme } from '@hooks/useAppTheme';

export const BudgetCard = ({ budget }) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
  const isWarning = percentage >= 80 && percentage < 100;
  const isExceeded = percentage >= 100;
  const statusColor = isExceeded ? colors.expense : isWarning ? colors.warning : colors.secondary;
  const remaining = budget.amount - budget.spent;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.categoryInfo}>
          <Text style={styles.icon}>{budget.categoryIcon || '📦'}</Text>
          <View>
            <Text style={styles.categoryName}>{budget.categoryName}</Text>
            <Text style={styles.period}>{budget.period === 'monthly' ? 'Monthly limit' : 'Weekly limit'}</Text>
          </View>
        </View>
        <View style={styles.amounts}>
          <Text style={[styles.spentText, { color: statusColor }]}>
            {formatCurrency(budget.spent)}
          </Text>
          <Text style={styles.limitText}>/ {formatCurrency(budget.amount)}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(percentage, 100)}%`, backgroundColor: statusColor },
            ]}
          />
        </View>
        <Text style={[styles.percentageText, { color: statusColor }]}>
          {Math.round(percentage)}%
        </Text>
      </View>

      {/* Status */}
      {(isWarning || isExceeded) && (
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {isExceeded
              ? `⚠️ Exceeded by ${formatCurrency(Math.abs(remaining))}`
              : `⚠️ ${formatCurrency(remaining)} remaining — spending limit near!`}
          </Text>
        </View>
      )}

      {!isWarning && !isExceeded && (
        <Text style={styles.remainingText}>
          {formatCurrency(remaining)} remaining
        </Text>
      )}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  categoryInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  icon: { fontSize: 24, marginRight: 8 },
  categoryName: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: FONT_FAMILY.semibold,
  },
  period: { color: colors.textMuted, fontSize: FONT_SIZE.xs, marginTop: 2, fontFamily: FONT_FAMILY.regular },
  amounts: { alignItems: 'flex-end' },
  spentText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold },
  limitText: { color: colors.textMuted, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceVariant,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  percentageText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.bold,
    width: 40,
    textAlign: 'right',
  },
  statusBadge: {
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginTop: 4,
  },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  remainingText: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 4,
  },
});

export default BudgetCard;
