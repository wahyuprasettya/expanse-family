// ============================================================
// Home Screen (Dashboard)
// ============================================================
import React, { useEffect, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, useWindowDimensions, Animated, Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectUser } from '@store/authSlice';
import { selectBalance, selectTotalIncome, selectTotalExpense, selectTransactions, selectTransactionsLoading } from '@store/transactionSlice';
import { selectCategories } from '@store/categorySlice';
import { selectDebtSummary } from '@store/debtSlice';
import { selectTotalWalletBalance, selectWallets } from '@store/walletSlice';
import { selectUpcomingReminders, selectRemindersLoading } from '@store/reminderSlice';
import { selectBudgetsLoading } from '@store/budgetSlice';
import { selectUnreadAppNotificationCount } from '@store/appNotificationSlice';
import { formatCurrency, formatCurrencyFull, formatDateSmart } from '@utils/formatters';
import TransactionCard from '@components/transaction/TransactionCard';
import LoadingState from '@components/common/LoadingState';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { useInsights } from '@hooks/useInsights';
import { useTransactions } from '@hooks/useTransactions';
import { useTranslation } from '@hooks/useTranslation';
import { useAppTheme } from '@hooks/useAppTheme';

export const HomeScreen = ({ navigation }) => {
  const { t, language } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 390;
  const isNarrow = width < 350;
  const { colors, isDark } = useAppTheme();
  const styles = createStyles(colors, { isCompact, isNarrow, bottomInset: insets.bottom });
  const user = useSelector(selectUser);
  const balance = useSelector(selectBalance);
  const wallets = useSelector(selectWallets);
  const totalWalletBalance = useSelector(selectTotalWalletBalance);
  const totalIncome = useSelector(selectTotalIncome);
  const totalExpense = useSelector(selectTotalExpense);
  const transactions = useSelector(selectTransactions);
  const transactionsLoading = useSelector(selectTransactionsLoading);
  const categories = useSelector(selectCategories);
  const debtSummary = useSelector(selectDebtSummary);
  const upcomingReminders = useSelector(selectUpcomingReminders);
  const remindersLoading = useSelector(selectRemindersLoading);
  const budgetsLoading = useSelector(selectBudgetsLoading);
  const activeNotifications = useSelector(selectUnreadAppNotificationCount);
  const insights = useInsights();
  const { deleteTransaction } = useTransactions();
  const celestialDrift = useRef(new Animated.Value(0)).current;
  const celestialPulse = useRef(new Animated.Value(1)).current;
  const bellShake = useRef(new Animated.Value(0)).current;
  const notificationBadgeLabel = activeNotifications > 99 ? '99+' : String(activeNotifications);
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
    const transaction = transactions.find((item) => item.id === transactionId);
    if (transaction?.debtMeta?.linkedDebtId) {
      Alert.alert(t('transactions.managedByDebtTitle'), t('transactions.managedByDebtMessage'));
      return;
    }

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
  const displayBalance = wallets.length > 0 ? totalWalletBalance : balance;

  const hour = new Date().getHours();
  const isNightGreeting = hour < 5 || hour >= 18;
  const greeting = hour < 12
    ? t('home.morning')
    : hour < 15
      ? t('home.afternoon')
      : hour < 18
        ? t('home.evening')
        : t('home.night');
  const isBrightGreeting = !isNightGreeting;
  const greetingTheme = useMemo(() => {
    if (isBrightGreeting) {
      return {
        colors: isDark ? ['#1D4ED8', '#0EA5E9', '#FBBF24'] : ['#FFF7D6', '#FDE68A', '#FDBA74'],
        titleColor: isDark ? '#F8FAFC' : '#7C2D12',
        subtitleColor: isDark ? 'rgba(248,250,252,0.84)' : '#9A3412',
        badgeBackground: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.58)',
        badgeBorder: isDark ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.74)',
        glowPrimary: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.52)',
        glowSecondary: isDark ? 'rgba(251,191,36,0.28)' : 'rgba(253,230,138,0.54)',
        dividerColor: isDark ? 'rgba(255,255,255,0.24)' : 'rgba(154,52,18,0.18)',
        bellBackground: isDark ? 'rgba(255,255,255,0.24)' : '#FFFFFF',
        bellBorder: isDark ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.88)',
        bellIcon: isDark ? '#F8FAFC' : '#9A3412',
        shadowColor: isDark ? '#0EA5E9' : '#FDBA74',
        emoji: '☀️',
      };
    }

    return {
      colors: isDark ? ['#0F172A', '#1E1B4B', '#312E81'] : ['#312E81', '#4338CA', '#1E3A8A'],
      titleColor: '#F8FAFC',
      subtitleColor: isDark ? 'rgba(226,232,240,0.82)' : 'rgba(224,231,255,0.9)',
      badgeBackground: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.14)',
      badgeBorder: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(224,231,255,0.28)',
      glowPrimary: isDark ? 'rgba(96,165,250,0.16)' : 'rgba(255,255,255,0.18)',
      glowSecondary: isDark ? 'rgba(165,180,252,0.18)' : 'rgba(129,140,248,0.28)',
      dividerColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(224,231,255,0.24)',
      bellBackground: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.22)',
      bellBorder: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(224,231,255,0.34)',
      bellIcon: '#F8FAFC',
      shadowColor: isDark ? '#6366F1' : '#4338CA',
      emoji: '🌙',
    };
  }, [isBrightGreeting, isDark]);
  useEffect(() => {
    let motionLoop;
    let pulseLoop;

    celestialDrift.stopAnimation();
    celestialPulse.stopAnimation();
    celestialDrift.setValue(0);
    celestialPulse.setValue(1);

    if (isBrightGreeting) {
      motionLoop = Animated.loop(
        Animated.timing(celestialDrift, {
          toValue: 1,
          duration: 12000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(celestialPulse, {
            toValue: 1.08,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(celestialPulse, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
    } else {
      motionLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(celestialDrift, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(celestialDrift, {
            toValue: 0,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(celestialPulse, {
            toValue: 1.04,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(celestialPulse, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
    }

    motionLoop.start();
    pulseLoop.start();

    return () => {
      motionLoop?.stop();
      pulseLoop?.stop();
      celestialDrift.stopAnimation();
      celestialPulse.stopAnimation();
    };
  }, [celestialDrift, celestialPulse, isBrightGreeting]);

  useEffect(() => {
    let bellLoop;

    bellShake.stopAnimation();
    bellShake.setValue(0);

    if (activeNotifications > 0) {
      bellLoop = Animated.loop(
        Animated.sequence([
          Animated.delay(1600),
          Animated.timing(bellShake, {
            toValue: 1,
            duration: 110,
            easing: Easing.out(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(bellShake, {
            toValue: -1,
            duration: 110,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(bellShake, {
            toValue: 0.8,
            duration: 100,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(bellShake, {
            toValue: -0.5,
            duration: 100,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(bellShake, {
            toValue: 0,
            duration: 120,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.delay(2400),
        ])
      );

      bellLoop.start();
    }

    return () => {
      bellLoop?.stop();
      bellShake.stopAnimation();
      bellShake.setValue(0);
    };
  }, [activeNotifications, bellShake]);

  const celestialTransform = isBrightGreeting
    ? [
        {
          rotate: celestialDrift.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '360deg'],
          }),
        },
        { scale: celestialPulse },
      ]
    : [
        {
          translateY: celestialDrift.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, -6, 0],
          }),
        },
        {
          rotate: celestialDrift.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: ['-8deg', '2deg', '-8deg'],
          }),
        },
        { scale: celestialPulse },
      ];
  const bellTransform = [
    {
      rotate: bellShake.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['-14deg', '0deg', '14deg'],
      }),
    },
    {
      translateY: bellShake.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [-1, 0, -1],
      }),
    },
  ];
  const budgetWarningCards = insights.budgetWarnings.slice(0, 3);
  const spendingInsightCards = insights.insightCards || [];
  const featuredInsight = spendingInsightCards[0] || null;
  const showInitialLoading =
    (transactionsLoading || remindersLoading || budgetsLoading) &&
    transactions.length === 0 &&
    upcomingReminders.length === 0 &&
    budgetWarningCards.length === 0;

  if (showInitialLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.containerContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient colors={colors.gradients.header} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerInfo}>
              <View
                style={[
                  styles.greetingCardShell,
                  { shadowColor: greetingTheme.shadowColor },
                ]}
              >
                <LinearGradient
                  colors={greetingTheme.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.greetingCard}
                >
                  <View
                    pointerEvents="none"
                    style={[styles.greetingGlow, styles.greetingGlowPrimary, { backgroundColor: greetingTheme.glowPrimary }]}
                  />
                  <View
                    pointerEvents="none"
                    style={[styles.greetingGlow, styles.greetingGlowSecondary, { backgroundColor: greetingTheme.glowSecondary }]}
                  />
                  <View style={styles.greetingCardContent}>
                    <View style={styles.greetingLead}>
                      <View style={styles.greetingTextBlock}>
                        <Text style={[styles.greeting, { color: greetingTheme.titleColor }]}>
                          {greeting}, {firstName}
                        </Text>
                        <Text style={[styles.headerSubtitle, styles.greetingSubtitle, { color: greetingTheme.subtitleColor }]}>
                          {t('home.financialSummary')}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.greetingEmojiWrap,
                          {
                            backgroundColor: greetingTheme.badgeBackground,
                            borderColor: greetingTheme.badgeBorder,
                          },
                        ]}
                      >
                        <Animated.View style={[styles.greetingEmojiMotion, { transform: celestialTransform }]}>
                          <Text style={styles.greetingEmoji}>{greetingTheme.emoji}</Text>
                        </Animated.View>
                      </View>
                    </View>
                    <View style={styles.greetingActions}>
                      <View
                        style={[
                          styles.greetingActionDivider,
                          { backgroundColor: greetingTheme.dividerColor },
                        ]}
                      />
                      <Animated.View style={[styles.greetingBellMotion, { transform: bellTransform }]}>
                        <TouchableOpacity
                          onPress={() => navigation.navigate('Notifications')}
                          activeOpacity={0.8}
                          style={[
                            styles.greetingBellBtn,
                            {
                              backgroundColor: greetingTheme.bellBackground,
                              borderColor: greetingTheme.bellBorder,
                            },
                          ]}
                        >
                          <Ionicons name="notifications-outline" size={22} color={greetingTheme.bellIcon} />
                          {activeNotifications > 0 ? (
                            <View style={styles.badge}>
                              <Text style={styles.badgeText}>{notificationBadgeLabel}</Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      </Animated.View>
                    </View>
                  </View>
                </LinearGradient>
              </View>
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
            <Text
              style={styles.balanceAmount}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {formatCurrencyFull(displayBalance, 'IDR', language)}
            </Text>

            <View style={styles.balanceRow}>
              <View style={styles.balanceStat}>
                <View style={styles.statIcon}>
                  <Ionicons name="arrow-down-circle" size={16} color={colors.income} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>{t('home.income')}</Text>
                  <Text
                    style={[styles.statValue, { color: colors.income }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                  >
                    +{formatCurrencyFull(totalIncome, 'IDR', language)}
                  </Text>
                </View>
              </View>
              <View style={styles.balanceStat}>
                <View style={styles.statIcon}>
                  <Ionicons name="arrow-up-circle" size={16} color={colors.expense} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>{t('home.expenses')}</Text>
                  <Text
                    style={[styles.statValue, { color: colors.expense }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                  >
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
          {budgetWarningCards.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚠️ {t('home.budgetAlerts')}</Text>
              {budgetWarningCards.map((budget) => (
                <TouchableOpacity
                  key={budget.id}
                  style={styles.alertCard}
                  onPress={() => navigation.navigate('Budget')}
                >
                  <Text style={styles.alertIcon}>{budget.categoryIcon || '📦'}</Text>
                  <View style={styles.alertInfo}>
                    <Text style={styles.alertTitle}>{budget.categoryName}</Text>
                    <Text style={styles.alertSource}>
                      {t('budget.fundingSource')}: {budget.walletDisplayName}
                    </Text>
                    <Text style={styles.alertSubtitle}>{budget.message}</Text>
                  </View>
                  <View style={styles.alertMeta}>
                    <Text style={styles.alertMetaValue}>{budget.usagePercentage}%</Text>
                    <Text style={styles.alertMetaStatus}>{budget.statusLabel}</Text>
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
                  <View style={styles.reminderInfo}>
                    <Text style={styles.reminderName} numberOfLines={2}>
                      {r.name}
                    </Text>
                    <Text style={styles.reminderDate} numberOfLines={1}>
                      {t('home.dueLabel', {
                        date: formatDateSmart(r.dueDate, language, {
                          today: t('common.today'),
                          yesterday: t('common.yesterday'),
                        }),
                      })}
                    </Text>
                  </View>
                  <Text style={[styles.reminderAmount, { color: colors.expense }]}>
                    {formatCurrency(r.amount, 'IDR', language)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {(debtSummary.activeCount > 0 || debtSummary.paidCount > 0) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🧾 {t('home.debtOverview')}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Debts')}>
                  <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.debtOverviewCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Debts')}
              >
                <View style={styles.debtOverviewRow}>
                  <View style={styles.debtPill}>
                    <Text style={styles.debtPillLabel}>{t('debts.summaryDebt')}</Text>
                    <Text style={[styles.debtPillValue, { color: colors.expense }]}>
                      {formatCurrency(debtSummary.debtOutstanding, 'IDR', language)}
                    </Text>
                  </View>
                  <View style={styles.debtPill}>
                    <Text style={styles.debtPillLabel}>{t('debts.summaryReceivable')}</Text>
                    <Text style={[styles.debtPillValue, { color: colors.income }]}>
                      {formatCurrency(debtSummary.receivableOutstanding, 'IDR', language)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.debtOverviewText}>
                  {t('home.debtOverviewHelper', {
                    active: debtSummary.activeCount,
                    due: debtSummary.dueSoonCount + debtSummary.overdueCount,
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Spending Insights */}
          {featuredInsight && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📊 {t('home.spendingInsights')}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Insights')}>
                  <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.insightCard}>
                <Text style={styles.insightText}>
                  {featuredInsight.icon} {featuredInsight.title}
                </Text>
                {featuredInsight.subtitle ? (
                  <Text style={styles.insightSubtext}>{featuredInsight.subtitle}</Text>
                ) : null}
                {spendingInsightCards.length > 1 ? (
                  <Text style={styles.insightHint}>
                    {t('insights.moreCount', { count: spendingInsightCards.length - 1 })}
                  </Text>
                ) : null}
              </View>
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
          <View style={styles.bottomSpacer} />
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

const createStyles = (colors, { isCompact, isNarrow, bottomInset }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  containerContent: { paddingBottom: Math.max(bottomInset + 110, 140) },
  header: {
    paddingHorizontal: 0,
    paddingBottom: isCompact ? SPACING.md : SPACING.lg,
  },
  headerTop: {
    paddingTop: 0,
    marginBottom: SPACING.lg,
  },
  headerInfo: { width: '100%' },
  greetingCardShell: {
    marginHorizontal: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.32,
    shadowRadius: 28,
    elevation: 18,
  },
  greetingCard: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
    minHeight: isCompact ? 96 : 112,
  },
  greetingCardContent: {
    flexDirection: isNarrow ? 'column' : 'row',
    alignItems: isNarrow ? 'stretch' : 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isNarrow ? SPACING.sm : isCompact ? SPACING.md : SPACING.lg,
    paddingVertical: isNarrow ? SPACING.sm : isCompact ? SPACING.md : SPACING.lg,
    gap: isNarrow ? SPACING.sm : SPACING.md,
  },
  greetingLead: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: isNarrow ? 'flex-start' : 'center',
    gap: isNarrow ? SPACING.xs : SPACING.sm,
    paddingRight: isNarrow ? 0 : SPACING.xs,
    width: '100%',
  },
  greetingTextBlock: { flex: 1, minWidth: 0 },
  greetingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isNarrow ? 2 : SPACING.xs,
    flexShrink: 0,
    alignSelf: isNarrow ? 'flex-end' : 'auto',
  },
  greetingGlow: {
    position: 'absolute',
    borderRadius: BORDER_RADIUS.full,
  },
  greetingGlowPrimary: {
    width: 140,
    height: 140,
    top: -56,
    right: -36,
  },
  greetingGlowSecondary: {
    width: 120,
    height: 120,
    bottom: -54,
    left: -26,
  },
  greeting: {
    fontSize: isNarrow ? FONT_SIZE.md : FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    color: colors.textPrimary,
    flexShrink: 1,
    lineHeight: isNarrow ? 24 : 32,
  },
  greetingSubtitle: { marginTop: 6 },
  greetingEmojiWrap: {
    width: isNarrow ? 44 : isCompact ? 58 : 68,
    height: isNarrow ? 44 : isCompact ? 58 : 68,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  greetingBellBtn: {
    width: isNarrow ? 42 : isCompact ? 48 : 54,
    height: isNarrow ? 42 : isCompact ? 48 : 54,
    marginLeft: isNarrow ? SPACING.xs : SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  greetingBellMotion: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingActionDivider: {
    width: 1,
    height: isNarrow ? 22 : isCompact ? 28 : 32,
    borderRadius: BORDER_RADIUS.full,
    opacity: 0.9,
  },
  greetingEmoji: { fontSize: isNarrow ? 24 : isCompact ? 28 : 34 },
  greetingEmojiMotion: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: isNarrow ? FONT_SIZE.xs : FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.expense,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: colors.background,
    zIndex: 2,
    elevation: 2,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontFamily: FONT_FAMILY.bold, lineHeight: 12 },
  avatar: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  balanceCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: isCompact ? SPACING.md : SPACING.lg,
    marginHorizontal: isCompact ? SPACING.md : SPACING.lg,
    ...SHADOWS.lg,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  balanceAmount: {
    fontSize: isNarrow ? FONT_SIZE.xxl : isCompact ? FONT_SIZE.xxxl : FONT_SIZE.display,
    fontFamily: FONT_FAMILY.extrabold,
    color: '#FFFFFF',
    marginVertical: 8,
    letterSpacing: -1,
  },
  balanceRow: {
    flexDirection: isCompact ? 'column' : 'row',
    gap: isCompact ? SPACING.md : SPACING.lg,
    marginTop: SPACING.md,
  },
  balanceStat: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: isCompact ? 0 : 1, minWidth: 0 },
  statContent: { flex: 1, minWidth: 0 },
  statIcon: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular },
  statValue: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold },
  content: { padding: isCompact ? SPACING.md : SPACING.lg },
  savingsCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1, borderColor: colors.border,
    gap: SPACING.sm,
  },
  savingsLabel: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, flex: 1, paddingRight: SPACING.sm },
  savingsValue: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold },
  section: { marginBottom: SPACING.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: isCompact ? 'flex-start' : 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: isCompact ? FONT_SIZE.md : FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: FONT_FAMILY.semibold,
    flex: 1,
    minWidth: 0,
  },
  seeAll: { color: colors.primary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium, flexShrink: 0 },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${colors.warning}10`,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: `${colors.warning}30`,
  },
  alertIcon: { fontSize: 24, marginRight: SPACING.sm, marginTop: 2 },
  alertInfo: { flex: 1, minWidth: 0, paddingRight: SPACING.xs },
  alertTitle: { color: colors.textPrimary, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  alertSource: { color: colors.textSecondary, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.medium, marginTop: 2 },
  alertSubtitle: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, marginTop: 2 },
  alertMeta: { alignItems: 'flex-end', marginRight: SPACING.xs, flexShrink: 0 },
  alertMetaValue: { color: colors.warning, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.bold },
  alertMetaStatus: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.medium, marginTop: 2 },
  debtOverviewCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  debtOverviewRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  debtPill: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  debtPillLabel: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
  },
  debtPillValue: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    marginTop: 4,
  },
  debtOverviewText: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 20,
    marginTop: SPACING.sm,
  },
  reminderCard: {
    flexDirection: isCompact ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isCompact ? 'flex-start' : 'center',
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: colors.border,
    gap: isCompact ? SPACING.xs : SPACING.sm,
  },
  reminderInfo: { flex: 1, minWidth: 0, width: '100%' },
  reminderName: { color: colors.textPrimary, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium, flex: 1 },
  reminderDate: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular },
  reminderAmount: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.bold,
    marginLeft: isCompact ? 0 : 8,
    alignSelf: isCompact ? 'flex-end' : 'auto',
  },
  insightCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  insightText: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, lineHeight: 20 },
  insightSubtext: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, marginTop: 6 },
  insightHint: { color: colors.primary, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.medium, marginTop: 8 },
  transactionsList: { width: '100%' },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { color: colors.textPrimary, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, fontFamily: FONT_FAMILY.semibold },
  emptySubtext: { color: colors.textMuted, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: Math.max(bottomInset + 24, 90),
    right: isCompact ? SPACING.md : SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.lg,
  },
  fabGradient: {
    width: 60, height: 60,
    borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  bottomSpacer: { height: Math.max(bottomInset + 32, 96) },
});

export default HomeScreen;
