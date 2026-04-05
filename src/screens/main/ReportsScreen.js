// ============================================================
// Reports Screen (Charts + Monthly Summary)
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useSelector } from 'react-redux';
import { selectProfile, selectUser } from '@store/authSlice';
import { selectAssets, selectAssetsLoading } from '@store/assetSlice';
import { selectCategories, selectCategoriesLoading } from '@store/categorySlice';
import { selectTransactions } from '@store/transactionSlice';
import { getMonthlyReport } from '@services/firebase/transactions';
import { formatCurrency, formatCurrencyCompact, formatDate } from '@utils/formatters';
import { buildMonthlyExpenseData, getChangeStats, sumExpenses } from '@utils/calculations';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { exportToCSV, exportToPDF } from '@services/export';
import { useTranslation } from '@hooks/useTranslation';
import { useAppTheme } from '@hooks/useAppTheme';
import LoadingState from '@components/common/LoadingState';

export const ReportsScreen = () => {
  const { t, language } = useTranslation();
  const { colors } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const assets = useSelector(selectAssets);
  const assetsLoading = useSelector(selectAssetsLoading);
  const categories = useSelector(selectCategories);
  const categoriesLoading = useSelector(selectCategoriesLoading);
  const transactions = useSelector(selectTransactions);
  const accountId = profile?.householdId || user?.uid;
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const isNarrowScreen = windowWidth < 360;
  const isCompactScreen = windowWidth < 420;
  const isTabletScreen = windowWidth >= 768;
  const styles = createStyles(colors, {
    isCompactScreen,
    isNarrowScreen,
    bottomInset: insets.bottom,
  });
  const chartWidth = Math.max(
    Math.min(windowWidth, 920) - (SPACING.lg * 2) - (SPACING.md * 2),
    220
  );

  // Asset calculations
  const assetRows = useMemo(() => assets.map((asset) => {
    const qty = Number(asset.quantity) || 0;
    const buyPrice = Number(asset.buyPrice) || 0;
    const currentPrice = Number(asset.currentPrice) || 0;
    const cost = qty * buyPrice;
    const value = qty * currentPrice;
    const profit = value - cost;
    const profitPct = cost > 0 ? (profit / cost) * 100 : 0;
    return { ...asset, qty, buyPrice, currentPrice, cost, value, profit, profitPct };
  }), [assets]);

  const totalAssetValue = assetRows.reduce((sum, item) => sum + item.value, 0);
  const totalAssetCost = assetRows.reduce((sum, item) => sum + item.cost, 0);
  const totalAssetProfit = totalAssetValue - totalAssetCost;

  const fetchReport = async () => {
    if (!accountId) return;
    setLoading(true);
    const { report: monthlyReport } = await getMonthlyReport(accountId, selectedYear, selectedMonth);
    setReport(monthlyReport);
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, [selectedYear, selectedMonth, accountId]);

  const chartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: () => colors.textSecondary,
    strokeWidth: 2,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  const assetPieData = assetRows
    ?.filter((asset) => asset.value > 0)
    ?.sort((a, b) => b.value - a.value)
    ?.slice(0, 6)
    ?.map((asset, index) => {
      const translatedType = asset.type ? t(`assets.types.${asset.type}`) : '';
      const fallbackName = asset.name.length > 8 ? asset.name.substring(0, 8) + '...' : asset.name;
      const displayName = translatedType && translatedType !== `assets.types.${asset.type}`
        ? translatedType
        : fallbackName;

      return {
        name: displayName,
        value: asset.value,
        color: colors.chart[index % colors.chart.length],
        legendFontColor: colors.textSecondary,
        legendFontSize: 12,
      };
    }) || [];

  const getCategoryDisplayName = (category) => {
    if (category?.isDefault && category?.id) {
      const translatedName = t(`categories.names.${category.id}`);
      return translatedName !== `categories.names.${category.id}` ? translatedName : category.name;
    }
    return category?.name || '';
  };

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const reportCategories = useMemo(
    () => (report?.byCategory || []).map((category) => {
      const categoryFromStore = categoryMap.get(category.categoryId);

      return {
        ...category,
        displayName: getCategoryDisplayName(categoryFromStore) || category.name,
      };
    }),
    [report?.byCategory, categoryMap, t]
  );

  const pieData = reportCategories
    ?.filter((category) => category.type === 'expense' || category.type === 'debt')
    ?.slice(0, 6)
    ?.map((category, index) => ({
      name: category.displayName.split(' ')[0],
      amount: category.total,
      color: colors.chart[index % colors.chart.length],
      legendFontColor: colors.textSecondary,
      legendFontSize: 12,
    })) || [];

  const selectedDate = useMemo(
    () => new Date(selectedYear, selectedMonth - 1, 1),
    [selectedYear, selectedMonth]
  );

  const selectedMonthTransactions = useMemo(
    () => transactions.filter((transaction) => {
      const date = new Date(transaction.date);
      return date.getFullYear() === selectedYear && date.getMonth() + 1 === selectedMonth;
    }),
    [selectedMonth, selectedYear, transactions]
  );

  const previousMonthTransactions = useMemo(() => {
    const previousMonthDate = new Date(selectedYear, selectedMonth - 2, 1);
    return transactions.filter((transaction) => {
      const date = new Date(transaction.date);
      return (
        date.getFullYear() === previousMonthDate.getFullYear() &&
        date.getMonth() === previousMonthDate.getMonth()
      );
    });
  }, [selectedMonth, selectedYear, transactions]);

  const expenseCategories = useMemo(
    () => reportCategories
      .filter((category) => category.type === 'expense' || category.type === 'debt')
      .sort((first, second) => second.total - first.total),
    [reportCategories]
  );

  const topExpenseCategory = expenseCategories[0] || null;
  const categoryInsightMessages = useMemo(() => {
    if (!topExpenseCategory || !report?.expense) return [];

    const percentage = Math.round((topExpenseCategory.total / report.expense) * 100);
    const messages = [
      t('reports.categoryShare', {
        percentage,
        category: topExpenseCategory.displayName,
      }),
      t('reports.topCategory', {
        category: topExpenseCategory.displayName,
        amount: formatCurrency(topExpenseCategory.total, 'IDR', language),
      }),
    ];

    if (percentage > 50) {
      messages.push(t('reports.spendingConcentrated'));
    }

    return messages;
  }, [language, report?.expense, t, topExpenseCategory]);

  const selectedMonthExpenseTotal = useMemo(
    () => sumExpenses(selectedMonthTransactions),
    [selectedMonthTransactions]
  );
  const previousMonthExpenseTotal = useMemo(
    () => sumExpenses(previousMonthTransactions),
    [previousMonthTransactions]
  );
  const monthlyChange = useMemo(
    () => getChangeStats(selectedMonthExpenseTotal, previousMonthExpenseTotal),
    [previousMonthExpenseTotal, selectedMonthExpenseTotal]
  );
  const monthlySummaryCards = useMemo(() => {
    if (!selectedMonthExpenseTotal && !previousMonthExpenseTotal) return [];

    if (!monthlyChange.hasComparison) {
      return [
        {
          title: t('reports.noPreviousComparison'),
          subtitle: t('reports.currentSpendingAmount', {
            amount: formatCurrency(selectedMonthExpenseTotal, 'IDR', language),
          }),
        },
      ];
    }

    if (monthlyChange.direction === 'decreased') {
      return [
        {
          title: t('reports.moreEfficientTitle'),
          subtitle: t('reports.changeDownAmount', {
            percentage: monthlyChange.percentage,
            amount: formatCurrency(Math.abs(monthlyChange.difference), 'IDR', language),
          }),
        },
      ];
    }

    if (monthlyChange.direction === 'increased') {
      return [
        {
          title: t('reports.increasedTitle'),
          subtitle: t('reports.changeUpAmount', {
            percentage: monthlyChange.percentage,
            amount: formatCurrency(monthlyChange.difference, 'IDR', language),
          }),
        },
      ];
    }

    return [
      {
        title: t('reports.stableTitle'),
        subtitle: t('reports.stableSubtitle'),
      },
    ];
  }, [language, monthlyChange, previousMonthExpenseTotal, selectedMonthExpenseTotal, t]);

  const trendMonths = useMemo(
    () => buildMonthlyExpenseData(transactions, 6, selectedDate, language),
    [language, selectedDate, transactions]
  );
  const trendMessages = useMemo(() => {
    const messages = [];
    const latestMonth = trendMonths[trendMonths.length - 1];
    const previousMonth = trendMonths[trendMonths.length - 2];

    if (latestMonth && previousMonth) {
      const latestChange = getChangeStats(latestMonth.expense, previousMonth.expense);
      if (latestChange.direction === 'increased') {
        messages.push(t('reports.trendMonthIncreased', { month: latestMonth.fullLabel }));
      }
      if (latestChange.direction === 'decreased') {
        messages.push(t('reports.trendMonthDecreased'));
      }
    }

    const spikeCandidates = trendMonths
      .map((month, index) => {
        if (index === 0) return null;
        const stats = getChangeStats(month.expense, trendMonths[index - 1].expense);
        return { ...month, change: stats };
      })
      .filter(Boolean)
      .filter((month) => month.change.hasComparison && month.change.direction === 'increased')
      .sort((first, second) => second.change.percentage - first.change.percentage);

    if (spikeCandidates[0] && spikeCandidates[0].change.percentage >= 25) {
      messages.push(t('reports.significantSpike', { month: spikeCandidates[0].fullLabel }));
    }

    return messages;
  }, [language, t, trendMonths]);

  const chartData = useMemo(() => ({
    labels: trendMonths.map((month) => month.shortLabel),
    datasets: [
      {
        data: trendMonths.map((month) => month.expense || 0),
        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  }), [trendMonths]);

  const largeTransactions = useMemo(
    () => selectedMonthTransactions
      .filter((transaction) => transaction.amount >= 1000000)
      .sort((first, second) => second.amount - first.amount)
      .map((transaction) => {
        const category = categoryMap.get(transaction.categoryId);
        return {
          ...transaction,
          displayCategory: getCategoryDisplayName(category) || transaction.category,
          displayIcon: transaction.categoryIcon || category?.icon || '📦',
        };
      }),
    [categoryMap, selectedMonthTransactions]
  );

  const handleExport = async (format) => {
    if (!report) return;

    if (format === 'csv') {
      await exportToCSV(report.transactions, {
        income: report.income,
        expense: report.expense,
        balance: report.balance,
        assets: assetRows,
        totalAssetValue,
        totalAssetCost,
        totalAssetProfit,
      }, `transactions_${selectedYear}_${selectedMonth}`, language);
      return;
    }

    await exportToPDF(report.transactions, {
      income: report.income,
      expense: report.expense,
      balance: report.balance,
      assets: assetRows,
      totalAssetValue,
      totalAssetCost,
      totalAssetProfit,
    }, `report_${selectedYear}_${selectedMonth}`, language);
  };

  const showInitialLoading = (loading || assetsLoading || categoriesLoading) && !report;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        <LinearGradient
          colors={colors.gradients.header}
          style={[
            styles.header,
            isCompactScreen && styles.headerCompact,
            isTabletScreen && styles.headerWide,
          ]}
        >
          <Text style={styles.title} numberOfLines={1}>{t('reports.title')}</Text>
          <View style={[styles.exportBtns, isCompactScreen && styles.exportBtnsCompact]}>
            <TouchableOpacity style={styles.exportBtn} onPress={() => handleExport('csv')}>
              <Ionicons name="download-outline" size={16} color={colors.primary} />
              <Text style={styles.exportBtnText}>CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={() => handleExport('pdf')}>
              <Ionicons name="document-outline" size={16} color={colors.primary} />
              <Text style={styles.exportBtnText}>PDF</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View
          style={[
            styles.content,
            isCompactScreen && styles.contentCompact,
            isTabletScreen && styles.contentWide,
          ]}
        >
          {showInitialLoading ? (
            <LoadingState compact />
          ) : (
            <>
          <View style={[styles.periodPicker, isCompactScreen && styles.periodPickerCompact]}>
            <TouchableOpacity
              onPress={() => {
                if (selectedMonth === 1) {
                  setSelectedMonth(12);
                  setSelectedYear((year) => year - 1);
                } else {
                  setSelectedMonth((month) => month - 1);
                }
              }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.periodText, isCompactScreen && styles.periodTextCompact]}>
              {formatDate(new Date(selectedYear, selectedMonth - 1, 1), 'MMM yyyy', language)}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (selectedMonth === 12) {
                  setSelectedMonth(1);
                  setSelectedYear((year) => year + 1);
                } else {
                  setSelectedMonth((month) => month + 1);
                }
              }}
            >
              <Ionicons name="chevron-forward" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.summaryRow, isCompactScreen && styles.summaryRowCompact]}>
            <LinearGradient
              colors={colors.gradients.income}
              style={[
                styles.summaryCard,
                styles.summaryCardGradient,
                isCompactScreen && styles.summaryCardCompact,
              ]}
            >
              <Text style={styles.summaryLabel}>{t('reports.income')}</Text>
              <Text style={styles.summaryValue}>{formatCurrencyCompact(report?.income || 0, 'IDR', language)}</Text>
            </LinearGradient>
            <LinearGradient
              colors={colors.gradients.expense}
              style={[
                styles.summaryCard,
                styles.summaryCardGradient,
                isCompactScreen && styles.summaryCardCompact,
              ]}
            >
              <Text style={styles.summaryLabel}>{t('reports.expenses')}</Text>
              <Text style={styles.summaryValue}>{formatCurrencyCompact(report?.expense || 0, 'IDR', language)}</Text>
            </LinearGradient>
          </View>

          <View style={styles.balanceCardFull}>
            <Text style={styles.balanceRowLabel}>{t('reports.netBalance')}</Text>
            <Text style={[
              styles.balanceRowValue,
              { color: (report?.balance || 0) >= 0 ? colors.income : colors.expense },
            ]}>
              {(report?.balance || 0) >= 0 ? '+' : ''}{formatCurrency(report?.balance || 0, 'IDR', language)}
            </Text>
          </View>

          {monthlySummaryCards.length > 0 && (
            <View style={styles.insightSection}>
              <Text style={styles.chartTitle}>🗓️ {t('reports.monthlySummaryTitle')}</Text>
              {monthlySummaryCards.map((item, index) => (
                <View key={`${item.title}-${index}`} style={styles.insightCard}>
                  <Text style={styles.insightTitle}>{item.title}</Text>
                  {item.subtitle ? <Text style={styles.insightSubtitle}>{item.subtitle}</Text> : null}
                </View>
              ))}
            </View>
          )}

          {trendMonths.length > 0 && (
            <View style={[styles.chartCard, isCompactScreen && styles.chartCardCompact]}>
              <Text style={styles.chartTitle}>📈 {t('reports.sixMonthTrendTitle')}</Text>
              <View style={styles.responsiveChartFrame}>
                <LineChart
                  data={chartData}
                  width={chartWidth}
                  height={isCompactScreen ? 200 : 220}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                    propsForLabels: {
                      fontSize: isCompactScreen ? 10 : 12,
                    },
                  }}
                  bezier
                  withInnerLines={false}
                  withOuterLines={false}
                  fromZero
                  style={styles.lineChart}
                />
              </View>
              {trendMessages.map((message, index) => (
                <View key={`${message}-${index}`} style={styles.insightCard}>
                  <Text style={styles.insightTitle}>{message}</Text>
                </View>
              ))}
            </View>
          )}

          {categoryInsightMessages.length > 0 && (
            <View style={styles.insightSection}>
              <Text style={styles.chartTitle}>🧠 {t('reports.categoryInsightsTitle')}</Text>
              {categoryInsightMessages.map((message, index) => (
                <View key={`${message}-${index}`} style={styles.insightCard}>
                  <Text style={styles.insightTitle}>{message}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.sectionSeparator} />

          {assets.length > 0 && (
            <LinearGradient
              colors={colors.gradients.header}
              style={[styles.assetCard, isCompactScreen && styles.assetCardCompact]}
            >
              <View style={[styles.assetCardHeader, isCompactScreen && styles.assetCardHeaderCompact]}>
                <View>
                  <Text style={styles.assetEyebrow}>{t('assets.portfolioBreakdown')}</Text>
                  <Text style={[styles.assetTitle, isCompactScreen && styles.assetTitleCompact]}>{t('assets.portfolioValue')}</Text>
                </View>
                <View style={[styles.assetPerformanceBadge, { backgroundColor: `${totalAssetProfit >= 0 ? colors.income : colors.expense}20` }]}>
                  <Ionicons
                    name={totalAssetProfit >= 0 ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={totalAssetProfit >= 0 ? colors.income : colors.expense}
                  />
                  <Text style={[styles.assetPerformanceText, { color: totalAssetProfit >= 0 ? colors.income : colors.expense }]}>
                    {totalAssetCost > 0 ? `${(totalAssetProfit / totalAssetCost * 100).toFixed(1)}%` : '0%'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.assetHeroValue, isCompactScreen && styles.assetHeroValueCompact]}>
                {formatCurrency(totalAssetValue, 'IDR', language)}
              </Text>
              <Text style={styles.assetHeroSubtext}>
                {t('assets.totalGain')} {totalAssetProfit >= 0 ? '+' : ''}{formatCurrency(totalAssetProfit, 'IDR', language)}
              </Text>

              <View style={[styles.assetSummaryGrid, isCompactScreen && styles.assetSummaryGridCompact]}>
                <View style={[styles.assetSummaryItem, styles.assetSummaryItemAccent, isCompactScreen && styles.assetSummaryItemCompact]}>
                  <Text style={styles.assetSummaryLabel}>{t('assets.totalValue')}</Text>
                  <Text style={styles.assetSummaryValue}>{formatCurrency(totalAssetValue, 'IDR', language)}</Text>
                </View>
                <View style={[styles.assetSummaryItem, isCompactScreen && styles.assetSummaryItemCompact]}>
                  <Text style={styles.assetSummaryLabel}>{t('assets.totalCost')}</Text>
                  <Text style={styles.assetSummaryValue}>{formatCurrency(totalAssetCost, 'IDR', language)}</Text>
                </View>
                <View style={[styles.assetSummaryItem, isCompactScreen && styles.assetSummaryItemCompact]}>
                  <Text style={[styles.assetSummaryLabel, { color: totalAssetProfit >= 0 ? colors.income : colors.expense }]}>
                    {t('assets.totalGain')}
                  </Text>
                  <Text style={[styles.assetSummaryValue, { color: totalAssetProfit >= 0 ? colors.income : colors.expense }]}>
                    {totalAssetProfit >= 0 ? '+' : ''}{formatCurrency(totalAssetProfit, 'IDR', language)}
                  </Text>
                </View>
                <View style={[styles.assetSummaryItem, isCompactScreen && styles.assetSummaryItemCompact]}>
                  <Text style={styles.assetSummaryLabel}>ROI</Text>
                  <Text style={[styles.assetSummaryValue, { color: totalAssetProfit >= 0 ? colors.income : colors.expense }]}>
                    {totalAssetCost > 0 ? `${(totalAssetProfit / totalAssetCost * 100).toFixed(1)}%` : '0%'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          )}

          {assetPieData.length > 0 && (
            <View style={[styles.chartCard, isCompactScreen && styles.chartCardCompact]}>
              <Text style={styles.chartTitle}>📊 {t('assets.portfolioBreakdown')}</Text>
              <PieChart
                data={assetPieData}
                width={chartWidth}
                height={200}
                chartConfig={chartConfig}
                accessor="value"
                backgroundColor="transparent"
                paddingLeft="10"
                absolute={false}
              />
            </View>
          )}

          {pieData.length > 0 && (
            <View style={[styles.chartCard, isCompactScreen && styles.chartCardCompact]}>
              <Text style={styles.chartTitle}>💸 {t('reports.expenseBreakdown')}</Text>
              <PieChart
                data={pieData}
                width={chartWidth}
                height={200}
                chartConfig={chartConfig}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="10"
                absolute={false}
              />
            </View>
          )}

          {reportCategories.length > 0 && (
            <>
              <View style={styles.sectionSeparator} />
              <View style={styles.categoryBreakdown}>
                <Text style={styles.chartTitle}>📋 {t('reports.categoryBreakdown')}</Text>
                {reportCategories.slice().sort((a, b) => b.total - a.total).map((category, index) => {
                  const total = category.type === 'income' ? report.income : report.expense;
                  const percentage = total > 0 ? (category.total / total) * 100 : 0;

                  return (
                    <View key={index} style={[styles.categoryRow, isCompactScreen && styles.categoryRowCompact]}>
                      <View style={[styles.categoryRowLeft, isCompactScreen && styles.categoryRowLeftCompact]}>
                        <View style={[styles.categoryDot, { backgroundColor: colors.chart[index % colors.chart.length] }]} />
                        <Text style={styles.categoryRowName}>{category.displayName}</Text>
                        <Text style={styles.categoryRowCount}>({category.count}x)</Text>
                      </View>
                      <View style={[styles.categoryRowRight, isCompactScreen && styles.categoryRowRightCompact]}>
                        <Text style={[
                          styles.categoryRowAmount,
                          { color: category.type === 'income' ? colors.income : colors.expense },
                        ]}>
                          {formatCurrency(category.total, 'IDR', language)}
                        </Text>
                        <Text style={styles.categoryRowPct}>{Math.round(percentage)}%</Text>
                      </View>
                    </View>
                  );
                })}

              </View>
            </>
          )}

          {largeTransactions.length > 0 && (
            <>
              <View style={styles.sectionSeparator} />
              <View style={styles.largeTransactionSection}>
                <Text style={styles.chartTitle}>💳 {t('reports.largeTransactionsTitle')}</Text>
                <Text style={styles.largeTransactionLead}>
                  {t('reports.largeTransactionsLead', { count: largeTransactions.length })}
                </Text>
                {largeTransactions.map((transaction) => (
                  <View key={transaction.id} style={[styles.largeTransactionRow, isNarrowScreen && styles.largeTransactionRowCompact]}>
                    <View style={[styles.largeTransactionLeft, isNarrowScreen && styles.largeTransactionLeftCompact]}>
                      <Text style={styles.largeTransactionIcon}>{transaction.displayIcon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.largeTransactionCategory}>{transaction.displayCategory}</Text>
                        <Text style={styles.largeTransactionDate}>
                          {formatDate(transaction.date, 'dd MMM yyyy', language)}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.largeTransactionRight, isNarrowScreen && styles.largeTransactionRightCompact]}>
                      <View style={styles.largeBadge}>
                        <Text style={styles.largeBadgeText}>{t('reports.largeTransactionsBadge')}</Text>
                      </View>
                      <Text style={styles.largeTransactionAmount}>
                        {formatCurrency(transaction.amount, 'IDR', language)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {!report && !loading && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyText}>{t('reports.noData')}</Text>
            </View>
          )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors, { isCompactScreen, isNarrowScreen, bottomInset }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: Math.max(bottomInset + 120, 140) },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerCompact: {
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  headerWide: {
    maxWidth: 920,
    width: '100%',
    alignSelf: 'center',
  },
  title: { fontSize: FONT_SIZE.xl, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary, flex: 1, marginRight: SPACING.sm },
  exportBtns: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  exportBtnsCompact: {
    width: '100%',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${colors.primary}20`,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
  },
  exportBtnText: { color: colors.primary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  content: { padding: SPACING.lg },
  contentCompact: { padding: SPACING.md },
  contentWide: {
    maxWidth: 920,
    width: '100%',
    alignSelf: 'center',
  },
  periodPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
    marginBottom: SPACING.lg,
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodPickerCompact: {
    gap: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  periodText: { fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary, flexShrink: 1 },
  periodTextCompact: {
    fontSize: FONT_SIZE.md,
  },
  summaryRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  summaryRowCompact: {
    flexDirection: 'column',
  },
  summaryCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.md,
  },
  summaryCardCompact: {
    width: '100%',
  },
  summaryCardGradient: {},
  summaryLabel: { color: 'rgba(255,255,255,0.75)', fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular },
  summaryValue: { color: '#FFFFFF', fontSize: isNarrowScreen ? FONT_SIZE.lg : FONT_SIZE.xl, fontFamily: FONT_FAMILY.bold, marginTop: 4 },
  balanceCardFull: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
  },
  balanceRowLabel: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, marginBottom: 4 },
  balanceRowValue: { fontSize: isNarrowScreen ? FONT_SIZE.lg : FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold },
  insightSection: {
    marginBottom: SPACING.lg,
  },
  insightCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    lineHeight: 20,
  },
  insightSubtitle: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 6,
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: SPACING.lg,
    opacity: 0.5,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartCardCompact: {
    paddingHorizontal: SPACING.sm,
  },
  chartTitle: { color: colors.textPrimary, fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.semibold, marginBottom: SPACING.md },
  responsiveChartFrame: {
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  lineChart: {
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    alignSelf: 'center',
  },
  assetCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  assetCardCompact: {
    padding: SPACING.md,
  },
  assetCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  assetCardHeaderCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  assetEyebrow: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  assetTitle: { color: colors.textPrimary, fontSize: FONT_SIZE.xl, fontFamily: FONT_FAMILY.bold, marginTop: 4 },
  assetTitleCompact: {
    fontSize: FONT_SIZE.lg,
  },
  assetPerformanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
  },
  assetPerformanceText: { fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.semibold },
  assetHeroValue: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.xxxl,
    fontFamily: FONT_FAMILY.extrabold,
    letterSpacing: -1,
  },
  assetHeroValueCompact: {
    fontSize: FONT_SIZE.xxl,
  },
  assetHeroSubtext: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    marginTop: 6,
    marginBottom: SPACING.lg,
  },
  assetSummaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: SPACING.sm },
  assetSummaryGridCompact: {
    flexDirection: 'column',
  },
  assetSummaryItem: {
    width: '48%',
    backgroundColor: colors.overlayLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: `${colors.border}CC`,
    marginBottom: 0,
  },
  assetSummaryItemCompact: {
    width: '100%',
  },
  assetSummaryItemAccent: {
    borderColor: `${colors.primary}35`,
    backgroundColor: `${colors.primary}12`,
  },
  assetSummaryLabel: { color: colors.textSecondary, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, marginBottom: 6 },
  assetSummaryValue: { color: colors.textPrimary, fontSize: FONT_SIZE.md, fontFamily: FONT_FAMILY.bold },
  categoryBreakdown: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,

  },
  categoryRowCompact: {
    alignItems: 'flex-start',
    gap: SPACING.xs,
  },
  categoryRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  categoryRowLeftCompact: {
    width: '100%',
  },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  categoryRowName: { color: colors.textPrimary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, flex: 1 },
  categoryRowCount: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular },
  categoryRowRight: { alignItems: 'flex-end' },
  categoryRowRightCompact: {
    width: '100%',
    alignItems: 'flex-start',
    marginLeft: 18,
  },
  categoryRowAmount: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, fontFamily: FONT_FAMILY.semibold },
  categoryRowPct: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, marginTop: 2 },
  largeTransactionSection: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  largeTransactionLead: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginBottom: SPACING.md,
  },
  largeTransactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: SPACING.sm,
  },
  largeTransactionRowCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  largeTransactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    minWidth: 0,
  },
  largeTransactionLeftCompact: {
    width: '100%',
  },
  largeTransactionIcon: { fontSize: 22 },
  largeTransactionCategory: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.semibold,
  },
  largeTransactionDate: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  largeTransactionRight: { alignItems: 'flex-end' },
  largeTransactionRightCompact: {
    width: '100%',
    alignItems: 'flex-start',
    marginLeft: 30,
  },
  largeBadge: {
    backgroundColor: `${colors.warning}18`,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  largeBadgeText: {
    color: colors.warning,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.semibold,
  },
  largeTransactionAmount: {
    color: colors.expense,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
  },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { color: colors.textSecondary, fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.regular },
});

export default ReportsScreen;
