// ============================================================
// Transaction Detail Screen
// ============================================================
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useTransactions } from '@hooks/useTransactions';
import { selectCategories } from '@store/categorySlice';
import { selectTransactions, selectTransactionsLoading } from '@store/transactionSlice';
import { formatCurrency, formatDate, formatTime } from '@utils/formatters';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { useAppTheme } from '@hooks/useAppTheme';
import { useTranslation } from '@hooks/useTranslation';
import LoadingState from '@components/common/LoadingState';

export const TransactionDetailScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 380;
  const isNarrow = width < 350;
  const { deleteTransaction } = useTransactions();
  const transactions = useSelector(selectTransactions);
  const transactionsLoading = useSelector(selectTransactionsLoading);
  const categories = useSelector(selectCategories);
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const styles = createStyles(colors, { isCompact, isNarrow, bottomInset: insets.bottom });
  const transactionId = route.params?.transactionId || route.params?.transaction?.id;
  const transaction = transactions.find((item) => item.id === transactionId) || route.params?.transaction || null;

  if (!transaction && transactionsLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerPlain}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, styles.headerTitlePlain]} numberOfLines={1}>{t('transaction.title')}</Text>
          <View style={styles.deleteBtn} />
        </View>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerPlain}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, styles.headerTitlePlain]} numberOfLines={1}>{t('transaction.title')}</Text>
          <View style={styles.deleteBtn} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={36} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{t('receipt.notFound')}</Text>
          <Text style={styles.emptyText}>{t('transaction.notFoundMessage')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isIncome = transaction.type === 'income';
  const isDebt = transaction.type === 'debt';
  const typeColor = isIncome ? colors.income : colors.expense;
  const gradientColors = isIncome ? colors.gradients.income : colors.gradients.expense;
  const category = categories.find((item) => item.id === transaction.categoryId);
  const categoryName = category?.isDefault && category?.id
    ? (() => {
        const translatedName = t(`categories.names.${category.id}`);
        return translatedName !== `categories.names.${category.id}` ? translatedName : category.name;
      })()
    : category?.name || transaction.category;
  const transactionActorName = transaction.createdByName || t('profile.fallbackUser');

  const handleDelete = () => {
    Alert.alert(t('transaction.deleteTitle'), t('transaction.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(transaction.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleEdit = () => {
    navigation.navigate('AddTransaction', {
      transactionId: transaction.id,
      transaction,
    });
  };

  const DetailRow = ({ label, value, valueColor }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header with gradient */}
      <LinearGradient colors={gradientColors} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{t('transaction.title')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEdit} style={styles.headerIconBtn}>
            <Ionicons name="create-outline" size={21} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerIconBtn}>
            <Ionicons name="trash-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Amount Card */}
      <View style={styles.amountSection}>
        <LinearGradient colors={gradientColors} style={styles.amountCard}>
          <Text style={styles.categoryIcon}>{transaction.categoryIcon || '📦'}</Text>
          <Text style={styles.amountLabel}>
            {isIncome ? t('common.income') : isDebt ? t('common.debt') : t('common.expense')}
          </Text>
          <Text
            style={styles.amountValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            {isIncome ? '+' : '-'}{formatCurrency(transaction.amount, 'IDR', language)}
          </Text>
          <Text style={styles.categoryName} numberOfLines={2}>{categoryName}</Text>
        </LinearGradient>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailCard}>
          <DetailRow label={t('common.date')} value={formatDate(transaction.date, 'EEEE, dd MMMM yyyy', language)} />
          <DetailRow label={t('common.time')} value={formatTime(transaction.date, language)} />
          <DetailRow label={t('common.category')} value={categoryName} />
          {transaction.walletName ? (
            <DetailRow label={t('wallets.wallet')} value={transaction.walletName} />
          ) : null}
          <DetailRow label={t('transaction.type')} value={t(`transaction.typeValue.${transaction.type}`)} valueColor={typeColor} />
          {transaction.createdByName ? (
            <DetailRow label={t('transaction.addedBy')} value={transaction.createdByName} />
          ) : null}
          {transaction.debtMeta?.creditorName ? (
            <DetailRow label={t('transaction.creditorName')} value={transaction.debtMeta.creditorName} />
          ) : null}
          {transaction.debtMeta?.dueDate ? (
            <DetailRow label={t('transaction.dueDate')} value={formatDate(transaction.debtMeta.dueDate, 'EEEE, dd MMMM yyyy', language)} />
          ) : null}
          {transaction.debtMeta?.remindDaysBefore ? (
            <DetailRow
              label={t('transaction.reminder')}
              value={t('transaction.reminderValue', { count: transaction.debtMeta.remindDaysBefore })}
            />
          ) : null}
          {transaction.description ? (
            <DetailRow label={t('common.description')} value={transaction.description} />
          ) : null}
          <DetailRow label={t('transaction.id')} value={transaction.id.slice(0, 12) + '...'} />
        </View>

        {/* Quick Stats: last 3 same-category transactions */}
        <View style={styles.relatedSection}>
          <Text style={styles.relatedTitle}>{t('transaction.aboutCategory')}</Text>
          <View style={[styles.relatedCard, { borderColor: typeColor }]}>
            <Text style={styles.relatedText}>
              {t('transaction.categoryInfo', {
                actorName: transactionActorName,
                category: categoryName,
                type: transaction.type,
                amount: formatCurrency(transaction.amount, 'IDR', language),
              })}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors, { isCompact, isNarrow, bottomInset }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, 
  },
  headerPlain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: colors.background,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: SPACING.sm,
  },
  headerTitlePlain: { color: colors.textPrimary },
  deleteBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  amountSection: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, marginTop: 20 },
  amountCard: {
    borderRadius: BORDER_RADIUS.xl, padding: isCompact ? SPACING.lg : SPACING.xl,
    alignItems: 'center', ...SHADOWS.lg,
  },
  categoryIcon: { fontSize: 48, marginBottom: SPACING.sm },
  amountLabel: { color: 'rgba(255,255,255,0.75)', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  amountValue: {
    color: '#FFF',
    fontSize: isNarrow ? 32 : 42,
    fontFamily: FONT_FAMILY.extrabold,
    letterSpacing: -1,
    marginVertical: 8,
    width: '100%',
    textAlign: 'center',
  },
  categoryName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: FONT_FAMILY.semibold,
    textAlign: 'center',
  },
  content: { flex: 1 },
  contentContainer: { padding: SPACING.lg, paddingBottom: Math.max(bottomInset + SPACING.xl, SPACING.xxl) },
  detailCard: {
    backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...SHADOWS.sm,
    marginBottom: SPACING.lg,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular
  },
  detailRow: {
    flexDirection: isCompact ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: isCompact ? 6 : SPACING.sm,
  },
  detailLabel: { color: colors.textMuted, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, flex: 1 },
  detailValue: {
    color: colors.textPrimary, fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: FONT_FAMILY.semibold,
    flex: isCompact ? 0 : 2,
    textAlign: isCompact ? 'left' : 'right',
    width: isCompact ? '100%' : 'auto',
  },
  relatedSection: { marginBottom: SPACING.xxl },
  relatedTitle: { color: colors.textSecondary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, fontFamily: FONT_FAMILY.semibold, marginBottom: SPACING.sm },
  relatedCard: {
    backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, borderWidth: 1,
  },
  relatedText: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, lineHeight: 22 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TransactionDetailScreen;
