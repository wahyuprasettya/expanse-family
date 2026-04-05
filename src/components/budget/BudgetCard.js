// ============================================================
// Budget Card Component
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { formatCurrency } from '@utils/formatters';
import { calcBudgetUsage, getBudgetStatus } from '@utils/calculations';
import { useAppTheme } from '@hooks/useAppTheme';
import { useTranslation } from '@hooks/useTranslation';

export const BudgetCard = ({ budget }) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const { colors } = useAppTheme();
  const { language, t } = useTranslation();
  const styles = createStyles(colors, { isCompact });
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
  const statusLabel = budget.statusLabel || getBudgetStatusLabel(status, t);
  const periodLabel = budget.period === 'monthly'
    ? t('budget.periodMonthly')
    : t('budget.periodWeekly');
  const walletDisplayName = budget.walletDisplayName || budget.walletName || t('budget.allFundingSources');
  const insightText = budget.message || (
    isExceeded
      ? t('budget.exceededBy', {
          amount: formatCurrency(Math.abs(remaining), 'IDR', language),
        })
      : isCritical
        ? t('budget.messageCritical', {
            subject: getBudgetSubject(t, budget.categoryName, walletDisplayName),
          })
        : isWarning
          ? t('budget.messageWarning', {
              subject: getBudgetSubject(t, budget.categoryName, walletDisplayName),
              percent: percentage,
            })
          : t('budget.remainingText', {
              amount: formatCurrency(remaining, 'IDR', language),
            })
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.categoryInfo}>
          <Text style={styles.icon}>{budget.categoryIcon || '📦'}</Text>
          <View style={styles.categoryText}>
            <Text style={styles.categoryName} numberOfLines={2}>{budget.categoryName}</Text>
            <Text style={styles.period}>{periodLabel}</Text>
            <Text style={styles.walletText} numberOfLines={2}>
              {t('budget.fundingSource')}: {walletDisplayName}
            </Text>
          </View>
        </View>
        <View style={styles.amounts}>
          <Text
            style={[styles.spentText, { color: statusColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {formatCurrency(budget.spent, 'IDR', language)}
          </Text>
          <Text style={styles.limitText} numberOfLines={1}>
            / {formatCurrency(budget.amount, 'IDR', language)}
          </Text>
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
        <Text style={styles.remainingText} numberOfLines={2}>
          {isExceeded
            ? t('budget.exceededText', {
                amount: formatCurrency(Math.abs(remaining), 'IDR', language),
              })
            : t('budget.remainingText', {
                amount: formatCurrency(remaining, 'IDR', language),
              })}
        </Text>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: `${statusColor}12` }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>{insightText}</Text>
      </View>
    </View>
  );
};

const createStyles = (colors, { isCompact }) => StyleSheet.create({
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
    flexDirection: isCompact ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isCompact ? 'flex-start' : 'center',
    marginBottom: SPACING.md,
    gap: isCompact ? SPACING.sm : SPACING.md,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    minWidth: 0,
  },
  categoryText: {
    flex: 1,
    minWidth: 0,
  },
  icon: { fontSize: 24, marginRight: 8 },
  categoryName: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: FONT_FAMILY.semibold,
  },
  period: { color: colors.textMuted, fontSize: FONT_SIZE.xs, marginTop: 2, fontFamily: FONT_FAMILY.regular },
  walletText: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.xs,
    marginTop: 4,
    fontFamily: FONT_FAMILY.medium,
  },
  amounts: {
    alignItems: isCompact ? 'flex-start' : 'flex-end',
    alignSelf: isCompact ? 'stretch' : 'auto',
    minWidth: isCompact ? 0 : 110,
  },
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
    flexDirection: isCompact ? 'column' : 'row',
    alignItems: isCompact ? 'flex-start' : 'center',
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
    flex: isCompact ? 0 : 1,
    textAlign: isCompact ? 'left' : 'right',
    alignSelf: isCompact ? 'stretch' : 'auto',
  },
});

const getBudgetStatusLabel = (status, t) => {
  if (status === 'exceeded') return t('budget.statusExceeded');
  if (status === 'critical') return t('budget.statusCritical');
  if (status === 'warning') return t('budget.statusWarning');
  return t('budget.statusSafe');
};

const getBudgetSubject = (t, categoryName, walletName) => (
  walletName && walletName !== t('budget.allFundingSources')
    ? t('budget.subjectWithWallet', { category: categoryName, wallet: walletName })
    : t('budget.subjectDefault', { category: categoryName })
);

export default BudgetCard;
