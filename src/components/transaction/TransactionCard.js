// ============================================================
// Transaction Card Component
// ============================================================
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { formatCurrency, formatCurrencyCompact, formatDateSmart, formatTime } from '@utils/formatters';
import { useTranslation } from '@hooks/useTranslation';
import { useAppTheme } from '@hooks/useAppTheme';

export const TransactionCard = ({ transaction, onPress, onDelete }) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 370;
  const { t, language } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors, { isCompact });
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const isDebt = transaction.type === 'debt';
  const isLinkedDebtFlow = Boolean(transaction.debtMeta?.linkedDebtId);
  const isLargeTransaction = transaction.amount >= 1000000;
  const transferRoute = isTransfer
    ? t('transactionCard.transferRoute', {
        from: transaction.transferMeta?.sourceWalletName || transaction.walletName || '-',
        to: transaction.transferMeta?.destinationWalletName || '-',
      })
    : null;
  const transferFee = isTransfer && Number(transaction.transferMeta?.adminFee || 0) > 0
    ? t('transactionCard.transferFee', {
        amount: formatCurrency(Number(transaction.transferMeta?.adminFee || 0), 'IDR', language),
      })
    : null;
  const amountColor = isTransfer ? colors.primary : isIncome ? colors.income : colors.expense;
  const amountPrefix = isTransfer ? '' : isIncome ? '+' : '-';
  const categoryLabel = isTransfer ? t('common.transfer') : transaction.category;
  const fullAmount = formatCurrency(transaction.amount, 'IDR', language);
  const compactAmount = formatCurrencyCompact(transaction.amount, 'IDR', language);
  const showCompactAmount = isLargeTransaction && compactAmount !== fullAmount;
  const addedByText = language === 'en'
    ? `By ${transaction.createdByName || ''}`
    : `Oleh ${transaction.createdByName || ''}`;
  const debtSubtitle = transaction.debtMeta?.creditorName
    ? t('transactionCard.debtTo', { name: transaction.debtMeta.creditorName })
    : transaction.debtMeta?.dueDate
      ? t('transactionCard.debtDue', {
        date: formatDateSmart(transaction.debtMeta.dueDate, language, {
          today: t('common.today'),
          yesterday: t('common.yesterday'),
        }),
      })
      : null;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => onPress?.(transaction)}
        activeOpacity={0.75}
        style={styles.pressableContent}
      >
        {/* Category Icon */}
        <View style={[styles.iconContainer, { backgroundColor: `${transaction.categoryColor || colors.primary}20` }]}>
          <Text style={styles.categoryIcon}>{transaction.categoryIcon || (isTransfer ? '🔄' : '📦')}</Text>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.category} numberOfLines={1} ellipsizeMode="tail">
            {categoryLabel}
          </Text>
          <Text style={styles.description} numberOfLines={1} ellipsizeMode="tail">
            {transaction.description || transferRoute || debtSubtitle || formatDateSmart(transaction.date, language, {
              today: t('common.today'),
              yesterday: t('common.yesterday'),
            })}
          </Text>
          {isTransfer ? (
            <Text style={styles.walletLine} numberOfLines={1} ellipsizeMode="tail">
              {'↔ '}{transferRoute}
            </Text>
          ) : transaction.walletName ? (
            <Text style={styles.walletLine} numberOfLines={1} ellipsizeMode="tail">
              {'👛 '}{transaction.walletName}
            </Text>
          ) : null}
          {transferFee ? (
            <Text style={styles.transferFeeLine} numberOfLines={1} ellipsizeMode="tail">
              {transferFee}
            </Text>
          ) : null}
          {transaction.createdByName ? (
            <Text style={styles.memberLine} numberOfLines={1} ellipsizeMode="tail">
              {addedByText}
            </Text>
          ) : null}
          <Text style={styles.time} numberOfLines={1} ellipsizeMode="tail">
            {formatDateSmart(transaction.date, language, {
              today: t('common.today'),
              yesterday: t('common.yesterday'),
            })} · {formatTime(transaction.date, language)}
          </Text>
        </View>

        {/* Amount */}
        <View style={styles.amountContainer}>
          <Text
            style={[styles.amount, { color: amountColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            {amountPrefix}{showCompactAmount ? compactAmount : fullAmount}
          </Text>
          {showCompactAmount ? (
            <Text style={styles.amountDetail} numberOfLines={1} ellipsizeMode="tail">
              {amountPrefix}{fullAmount}
            </Text>
          ) : null}
          <View style={styles.badgeRow}>
            {isLargeTransaction ? (
              <View style={[styles.largeBadge, { backgroundColor: `${colors.warning}18` }]}>
                <Text style={[styles.largeBadgeText, { color: colors.warning }]}>
                  {language === 'en' ? 'Large' : 'Besar'}
                </Text>
              </View>
            ) : null}
            <View style={[styles.typeBadge, { backgroundColor: `${amountColor}20` }]}>
              <Text style={[styles.typeText, { color: amountColor }]}>
                {isTransfer
                  ? t('transactionCard.transfer')
                  : isIncome
                    ? t('transactionCard.income')
                    : isDebt
                      ? t('transactionCard.debt')
                      : t('transactionCard.expense')}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {onDelete && !isLinkedDebtFlow && (
        <TouchableOpacity onPress={() => onDelete(transaction.id)} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const createStyles = (colors, { isCompact }) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  pressableContent: {
    flex: 1,
    flexDirection: isCompact ? 'column' : 'row',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  categoryIcon: { fontSize: 22 },
  info: {
    flex: 1,
    flexShrink: 1,
    marginRight: isCompact ? 0 : SPACING.sm,
    minWidth: 0,
    width: '100%',
  },
  category: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: FONT_FAMILY.semibold,
  },
  description: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  memberLine: {
    color: colors.primary,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  walletLine: {
    color: colors.primary,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    marginTop: 2,
  },
  transferFeeLine: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  time: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: isCompact ? 'flex-start' : 'flex-end',
    flexShrink: 1,
    minWidth: isCompact ? 0 : 92,
    maxWidth: isCompact ? '100%' : '44%',
    marginLeft: isCompact ? 0 : 'auto',
    marginTop: isCompact ? SPACING.sm : 0,
    width: isCompact ? '100%' : 'auto',
  },
  amount: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.bold,
    textAlign: isCompact ? 'left' : 'right',
  },
  amountDetail: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    marginTop: 2,
    textAlign: isCompact ? 'left' : 'right',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: isCompact ? 'flex-start' : 'flex-end',
    alignItems: isCompact ? 'flex-start' : 'flex-end',
    gap: 6,
    marginTop: 4,
  },
  typeBadge: {
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: FONT_FAMILY.medium,
  },
  largeBadge: {
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  largeBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.semibold,
  },
  deleteBtn: {
    marginLeft: isCompact ? SPACING.sm : 8,
    padding: 4,
    alignSelf: isCompact ? 'flex-start' : 'center',
  },
});

export default TransactionCard;
