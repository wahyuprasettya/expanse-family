// ============================================================
// Transaction Card Component
// ============================================================
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING, SHADOWS } from '@constants/theme';
import { formatCurrency, formatDateSmart, formatTime } from '@utils/formatters';
import { useTranslation } from '@hooks/useTranslation';
import { useAppTheme } from '@hooks/useAppTheme';

export const TransactionCard = ({ transaction, onPress, onDelete }) => {
  const { t, language } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? colors.income : colors.expense;
  const amountPrefix = isIncome ? '+' : '-';

  return (
    <TouchableOpacity onPress={() => onPress?.(transaction)} activeOpacity={0.75}>
      <View style={styles.card}>
        {/* Category Icon */}
        <View style={[styles.iconContainer, { backgroundColor: `${transaction.categoryColor || colors.primary}20` }]}>
          <Text style={styles.categoryIcon}>{transaction.categoryIcon || '📦'}</Text>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.category} numberOfLines={1}>{transaction.category}</Text>
          <Text style={styles.description} numberOfLines={1}>
            {transaction.description || formatDateSmart(transaction.date, language, {
              today: t('common.today'),
              yesterday: t('common.yesterday'),
            })}
          </Text>
          {transaction.createdByName ? (
            <Text style={styles.memberLine} numberOfLines={1}>
              Ditambahkan oleh {transaction.createdByName}
            </Text>
          ) : null}
          <Text style={styles.time}>
            {formatDateSmart(transaction.date, language, {
              today: t('common.today'),
              yesterday: t('common.yesterday'),
            })} · {formatTime(transaction.date, language)}
          </Text>
        </View>

        {/* Amount */}
        <View style={styles.amountContainer}>
          <Text style={[styles.amount, { color: amountColor }]}>
            {amountPrefix}{formatCurrency(transaction.amount, 'IDR', language)}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: `${amountColor}20` }]}>
            <Text style={[styles.typeText, { color: amountColor }]}>
              {isIncome ? t('transactionCard.income') : t('transactionCard.expense')}
            </Text>
          </View>
        </View>

        {/* Delete */}
        {onDelete && (
          <TouchableOpacity onPress={() => onDelete(transaction.id)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (colors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
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
  info: { flex: 1, marginRight: SPACING.sm },
  category: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
  description: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
  },
  memberLine: {
    color: colors.primary,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  time: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  amountContainer: { alignItems: 'flex-end' },
  amount: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  typeBadge: {
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  typeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  deleteBtn: {
    marginLeft: 8,
    padding: 4,
  },
});

export default TransactionCard;
