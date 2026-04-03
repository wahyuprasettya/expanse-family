// ============================================================
// Home Screen (Dashboard)
// ============================================================
import React, { useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { selectUser } from '@store/authSlice';
import { selectBalance, selectTotalIncome, selectTotalExpense, selectTransactions } from '@store/transactionSlice';
import { selectCategories } from '@store/categorySlice';
import { selectUpcomingReminders } from '@store/reminderSlice';
import { selectBudgetWarnings } from '@store/budgetSlice';
import { selectUnreadAppNotificationCount } from '@store/appNotificationSlice';
import { formatCurrency, formatCurrencyFull, formatDateSmart } from '@utils/formatters';
import TransactionCard from '@components/transaction/TransactionCard';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { useInsights } from '@hooks/useInsights';
import { useTransactions } from '@hooks/useTransactions';
import { useTranslation } from '@hooks/useTranslation';
import { useAppTheme } from '@hooks/useAppTheme';

export const HomeScreen = ({ navigation }) => {
  const { t, language } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const user = useSelector(selectUser);
  const balance = useSelector(selectBalance);
  const totalIncome = useSelector(selectTotalIncome);
  const totalExpense = useSelector(selectTotalExpense);
  const transactions = useSelector(selectTransactions);
  const categories = useSelector(selectCategories);
  const upcomingReminders = useSelector(selectUpcomingReminders);
  const budgetWarnings = useSelector(selectBudgetWarnings);
  const unreadNotifications = useSelector(selectUnreadAppNotificationCount);
  const insights = useInsights();
  const { deleteTransaction } = useTransactions();
  const getCategoryDisplayName = (category) => {
    if (category?.isDefault && category?.id) {
      const translatedName = t(`categories.names.${category.id}`);
      return translatedName !== `categories.names.${category.id}` ? translatedName : category.name;
    }
    return category?.name || '';
  };

  const recentTransactions = useMemo(() => {
    const categoryMap = new Map(categories.map((category) => [category.id, category]));

    return transactions.slice(0, 5).map((transaction) => {
      const category = categoryMap.get(transaction.categoryId);

      return {
        ...transaction,
        category: getCategoryDisplayName(category) || transaction.category,
        categoryIcon: transaction.categoryIcon || category?.icon,
        categoryColor: transaction.categoryColor || category?.color,
      };
    });
  }, [transactions, categories, t]);

  const handleDelete = (transactionId) => {
    Alert.alert(t('transactions.deleteTitle'), t('transactions.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deleteTransaction(transactionId),
      },
    ]);
  };
  const firstName = user?.displayName?.split(' ')[0] || t('home.defaultName');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('home.morning') : hour < 17 ? t('home.afternoon') : t('home.evening');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={colors.gradients.header} style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{greeting}, {firstName} 👋</Text>
              <Text style={styles.headerSubtitle}>{t('home.financialSummary')}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.bellBtn}>
                <Ionicons name="notifications-outline" size={22} color={colors.warning} />
                {unreadNotifications > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadNotifications}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              {/* <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.avatar}>
                <Ionicons name="person" size={22} color="#FFFFFF" />
              </TouchableOpacity> */}
            </View>
          </View>

          {/* Balance Card */}
          <LinearGradient
            colors={colors.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <Text style={styles.balanceLabel}>{t('home.totalBalance')}</Text>
            <Text style={styles.balanceAmount}>{formatCurrencyFull(balance, 'IDR', language)}</Text>

            <View style={styles.balanceRow}>
              <View style={styles.balanceStat}>
                <View style={styles.statIcon}>
                  <Ionicons name="arrow-down-circle" size={16} color={colors.income} />
                </View>
                <View>
                  <Text style={styles.statLabel}>{t('home.income')}</Text>
                  <Text style={[styles.statValue, { color: colors.income }]}>
                    +{formatCurrencyFull(totalIncome, 'IDR', language)}
                  </Text>
                </View>
              </View>
              <View style={styles.balanceStat}>
                <View style={styles.statIcon}>
                  <Ionicons name="arrow-up-circle" size={16} color={colors.expense} />
                </View>
                <View>
                  <Text style={styles.statLabel}>{t('home.expenses')}</Text>
                  <Text style={[styles.statValue, { color: colors.expense }]}>
                    -{formatCurrencyFull(totalExpense, 'IDR', language)}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </LinearGradient>

        <View style={styles.content}>
          {/* Savings Rate */}
          {insights.savingsRate >= 0 && (
            <View style={styles.savingsCard}>
              <Text style={styles.savingsLabel}>💰 {t('home.savingsRate')}</Text>
              <Text style={[styles.savingsValue, { color: insights.savingsRate >= 30 ? colors.income : colors.warning }]}>
                {insights.savingsRate}%
              </Text>
            </View>
          )}

          {/* Budget Warnings */}
          {budgetWarnings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚠️ {t('home.budgetAlerts')}</Text>
              {budgetWarnings.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={styles.alertCard}
                  onPress={() => navigation.navigate('Budget')}
                >
                  <Text style={styles.alertIcon}>{b.categoryIcon || '📦'}</Text>
                  <View style={styles.alertInfo}>
                    <Text style={styles.alertTitle}>{b.categoryName}</Text>
                    <Text style={styles.alertSubtitle}>
                      {t('home.usedLeft', {
                        percent: Math.round((b.spent / b.amount) * 100),
                        amount: formatCurrency(b.amount - b.spent, 'IDR', language),
                      })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.warning} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Upcoming Reminders */}
          {upcomingReminders.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🔔 {t('home.upcomingBills')}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Reminders')}>
                  <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
                </TouchableOpacity>
              </View>
              {upcomingReminders.slice(0, 3).map((r) => (
                <View key={r.id} style={styles.reminderCard}>
                  <Text style={styles.reminderName}>{r.name}</Text>
                  <Text style={styles.reminderDate}>
                    {t('home.dueLabel', {
                      date: formatDateSmart(r.dueDate, language, {
                        today: t('common.today'),
                        yesterday: t('common.yesterday'),
                      }),
                    })}
                  </Text>
                  <Text style={[styles.reminderAmount, { color: colors.expense }]}>
                    {formatCurrency(r.amount, 'IDR', language)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Spending Insights */}
          {insights.overallChange && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 {t('home.spendingInsights')}</Text>
              <View style={styles.insightCard}>
                <Text style={styles.insightText}>
                  {insights.overallChange.direction === 'increased' ? '📈' : '📉'}
                  {' '}{t('home.spendingChanged', {
                    direction: t(`home.${insights.overallChange.direction}`),
                    percentage: insights.overallChange.percentage,
                  })}
                </Text>
              </View>
              {insights.categoryInsights.slice(0, 3).map((ci, i) => (
                <View key={i} style={styles.insightCard}>
                  <Text style={styles.insightText}>
                    {ci.change.direction === 'increased' ? '📈' : '📉'}
                    {' '}{t('home.categorySpendingChanged', {
                      category: ci.categoryName,
                      direction: t(`home.${ci.change.direction}`),
                      percentage: ci.change.percentage,
                    })}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Recent Transactions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📋 {t('home.recentTransactions')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
                <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
              </TouchableOpacity>
            </View>
            {recentTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🧾</Text>
                <Text style={styles.emptyText}>{t('home.noTransactions')}</Text>
                <Text style={styles.emptySubtext}>{t('home.addFirstTransaction')}</Text>
              </View>
            ) : (
              <View style={styles.transactionsList}>
                {recentTransactions.map((tx) => (
                  <TransactionCard
                    key={tx.id}
                    transaction={tx}
                    onPress={(t) => navigation.navigate('TransactionDetail', { transaction: t })}
                    onDelete={handleDelete}
                  />
                ))}
              </View>
            )}
          </View>
          <View style={{height:50}}></View>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTransaction')}
        activeOpacity={0.85}
      >
        <LinearGradient colors={colors.gradients.primary} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { fontSize: FONT_SIZE.xl, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
  headerSubtitle: { color: colors.textMuted, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, marginTop: 2 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: `${colors.warning}18`,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.warning}35`,
  },
  badge: {
    position: 'absolute', top: 1, right: 1,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.expense,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  avatar: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  balanceCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  balanceAmount: {
    fontSize: FONT_SIZE.display,
    // fontWeight: FONT_WEIGHT.extrabold,
    fontFamily: FONT_FAMILY.extrabold,
    color: '#FFFFFF',
    marginVertical: 8,
    letterSpacing: -1,
  },
  balanceRow: { flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.md },
  balanceStat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIcon: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular },
  statValue: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold },
  content: { padding: SPACING.lg },
  savingsCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1, borderColor: colors.border,
  },
  savingsLabel: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular },
  savingsValue: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold },
  section: { marginBottom: SPACING.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { color: colors.textPrimary, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, fontFamily: FONT_FAMILY.semibold },
  seeAll: { color: colors.primary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}10`,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: `${colors.warning}30`,
  },
  alertIcon: { fontSize: 24, marginRight: SPACING.sm },
  alertInfo: { flex: 1 },
  alertTitle: { color: colors.textPrimary, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  alertSubtitle: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular },
  reminderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  reminderName: { color: colors.textPrimary, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium, flex: 1 },
  reminderDate: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular },
  reminderAmount: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold, marginLeft: 8 },
  insightCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  insightText: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, lineHeight: 20 },
  transactionsList: { width: '100%' },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { color: colors.textPrimary, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, fontFamily: FONT_FAMILY.semibold },
  emptySubtext: { color: colors.textMuted, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.lg,
  },
  fabGradient: {
    width: 60, height: 60,
    borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
});

export default HomeScreen;
