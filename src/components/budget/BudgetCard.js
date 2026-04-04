// ============================================================
// Budget Card Component
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { formatCurrency } from '@utils/formatters';
import { calcBudgetUsage, getBudgetStatus } from '@utils/calculations';
import { useAppTheme } from '@hooks/useAppTheme';
import { useTranslation } from '@hooks/useTranslation';

export const BudgetCard = ({ budget }) => {
  const { colors } = useAppTheme();
  const { language } = useTranslation();
  const styles = createStyles(colors);
  const percentage = budget.usagePercentage ?? calcBudgetUsage(budget.spent || 0, budget.amount);
  const status = budget.status || getBudgetStatus(percentage);
  const isExceeded = status === 'exceeded';
  const isWarning = status === 'warning';
  const isCritical = status === 'critical';
  const statusColor = isExceeded
    ? colors.expense
    : isCritical || isWarning
      ? colors.warning
      : colors.secondary;
  const remaining = budget.amount - budget.spent;
  const statusLabel = budget.statusLabel || (
    language === 'en'
      ? isExceeded
        ? 'Exceeded'
        : isCritical
          ? 'Almost gone'
          : isWarning
            ? 'Warning'
            : 'Safe'
      : isExceeded
        ? 'Terlampaui'
        : isCritical
          ? 'Hampir habis'
          : isWarning
            ? 'Waspada'
            : 'Aman'
  );
  const periodLabel = language === 'en'
    ? budget.period === 'monthly'
      ? 'Monthly limit'
      : 'Weekly limit'
    : budget.period === 'monthly'
      ? 'Limit bulanan'
      : 'Limit mingguan';
  const insightText = budget.message || (
    isExceeded
      ? (language === 'en'
          ? `Budget exceeded by ${formatCurrency(Math.abs(remaining), 'IDR', language)}`
          : `Budget melewati ${formatCurrency(Math.abs(remaining), 'IDR', language)}`)
      : isCritical
        ? (language === 'en'
            ? `${budget.categoryName} budget is almost gone`
            : `Budget ${budget.categoryName} hampir habis`)
        : isWarning
          ? (language === 'en'
              ? `${budget.categoryName} budget is already used ${percentage}%`
              : `Budget ${budget.categoryName} sudah terpakai ${percentage}%`)
          : (language === 'en'
              ? `${formatCurrency(remaining, 'IDR', language)} remaining`
              : `Sisa ${formatCurrency(remaining, 'IDR', language)}`)
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.categoryInfo}>
          <Text style={styles.icon}>{budget.categoryIcon || '📦'}</Text>
          <View>
            <Text style={styles.categoryName}>{budget.categoryName}</Text>
            <Text style={styles.period}>{periodLabel}</Text>
          </View>
        </View>
        <View style={styles.amounts}>
          <Text style={[styles.spentText, { color: statusColor }]}>
            {formatCurrency(budget.spent, 'IDR', language)}
          </Text>
          <Text style={styles.limitText}>/ {formatCurrency(budget.amount, 'IDR', language)}</Text>
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

      <View style={styles.statusRow}>
        <View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}>
          <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <Text style={styles.remainingText}>
          {isExceeded
            ? (language === 'en'
                ? `Exceeded ${formatCurrency(Math.abs(remaining), 'IDR', language)}`
                : `Lewat ${formatCurrency(Math.abs(remaining), 'IDR', language)}`)
            : (language === 'en'
                ? `${formatCurrency(remaining, 'IDR', language)} left`
                : `Sisa ${formatCurrency(remaining, 'IDR', language)}`)}
        </Text>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: `${statusColor}12` }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>{insightText}</Text>
      </View>
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  statusPill: {
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.semibold,
  },
  statusBadge: {
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
  },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  remainingText: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    flex: 1,
    textAlign: 'right',
  },
});

export default BudgetCard;
