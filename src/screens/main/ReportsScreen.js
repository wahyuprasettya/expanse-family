// ============================================================
// Reports Screen (Charts + Monthly Summary)
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { useSelector } from 'react-redux';
import { selectProfile, selectUser } from '@store/authSlice';
import { selectAssets, selectAssetsLoading } from '@store/assetSlice';
import { selectCategories, selectCategoriesLoading } from '@store/categorySlice';
import { getMonthlyReport } from '@services/firebase/transactions';
import { formatCurrency, formatCurrencyCompact, formatDate } from '@utils/formatters';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { exportToCSV, exportToPDF } from '@services/export';
import { useTranslation } from '@hooks/useTranslation';
import { useAppTheme } from '@hooks/useAppTheme';
import LoadingState from '@components/common/LoadingState';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - SPACING.lg * 2;

export const ReportsScreen = () => {
  const { t, language } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const assets = useSelector(selectAssets);
  const assetsLoading = useSelector(selectAssetsLoading);
  const categories = useSelector(selectCategories);
  const categoriesLoading = useSelector(selectCategoriesLoading);
  const accountId = profile?.householdId || user?.uid;
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={true}>
        <LinearGradient colors={colors.gradients.header} style={styles.header}>
          <Text style={styles.title}>{t('reports.title')}</Text>
          <View style={styles.exportBtns}>
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

        <View style={styles.content}>
          {showInitialLoading ? (
            <LoadingState compact />
          ) : (
            <>
          <View style={styles.periodPicker}>
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
            <Text style={styles.periodText}>
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

          <View style={styles.summaryRow}>
            <LinearGradient colors={colors.gradients.income} style={[styles.summaryCard, styles.summaryCardGradient]}>
              <Text style={styles.summaryLabel}>{t('reports.income')}</Text>
              <Text style={styles.summaryValue}>{formatCurrencyCompact(report?.income || 0, 'IDR', language)}</Text>
            </LinearGradient>
            <LinearGradient colors={colors.gradients.expense} style={[styles.summaryCard, styles.summaryCardGradient]}>
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

          <View style={styles.sectionSeparator} />

          {assets.length > 0 && (
            <LinearGradient colors={colors.gradients.header} style={styles.assetCard}>
              <View style={styles.assetCardHeader}>
                <View>
                  <Text style={styles.assetEyebrow}>{t('assets.portfolioBreakdown')}</Text>
                  <Text style={styles.assetTitle}>{t('assets.portfolioValue')}</Text>
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

              <Text style={styles.assetHeroValue}>{formatCurrency(totalAssetValue, 'IDR', language)}</Text>
              <Text style={styles.assetHeroSubtext}>
                {t('assets.totalGain')} {totalAssetProfit >= 0 ? '+' : ''}{formatCurrency(totalAssetProfit, 'IDR', language)}
              </Text>

              <View style={styles.assetSummaryGrid}>
                <View style={[styles.assetSummaryItem, styles.assetSummaryItemAccent]}>
                  <Text style={styles.assetSummaryLabel}>{t('assets.totalValue')}</Text>
                  <Text style={styles.assetSummaryValue}>{formatCurrency(totalAssetValue, 'IDR', language)}</Text>
                </View>
                <View style={styles.assetSummaryItem}>
                  <Text style={styles.assetSummaryLabel}>{t('assets.totalCost')}</Text>
                  <Text style={styles.assetSummaryValue}>{formatCurrency(totalAssetCost, 'IDR', language)}</Text>
                </View>
                <View style={styles.assetSummaryItem}>
                  <Text style={[styles.assetSummaryLabel, { color: totalAssetProfit >= 0 ? colors.income : colors.expense }]}>
                    {t('assets.totalGain')}
                  </Text>
                  <Text style={[styles.assetSummaryValue, { color: totalAssetProfit >= 0 ? colors.income : colors.expense }]}>
                    {totalAssetProfit >= 0 ? '+' : ''}{formatCurrency(totalAssetProfit, 'IDR', language)}
                  </Text>
                </View>
                <View style={styles.assetSummaryItem}>
                  <Text style={styles.assetSummaryLabel}>ROI</Text>
                  <Text style={[styles.assetSummaryValue, { color: totalAssetProfit >= 0 ? colors.income : colors.expense }]}>
                    {totalAssetCost > 0 ? `${(totalAssetProfit / totalAssetCost * 100).toFixed(1)}%` : '0%'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          )}

          {assetPieData.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>📊 {t('assets.portfolioBreakdown')}</Text>
              <PieChart
                data={assetPieData}
                width={CHART_WIDTH}
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
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>💸 {t('reports.expenseBreakdown')}</Text>
              <PieChart
                data={pieData}
                width={CHART_WIDTH}
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
                    <View key={index} style={styles.categoryRow}>
                      <View style={styles.categoryRowLeft}>
                        <View style={[styles.categoryDot, { backgroundColor: colors.chart[index % colors.chart.length] }]} />
                        <Text style={styles.categoryRowName}>{category.displayName}</Text>
                        <Text style={styles.categoryRowCount}>({category.count}x)</Text>
                      </View>
                      <View style={styles.categoryRowRight}>
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
      <View style={{ height: 30 }}></View>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, marginBottom: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: { fontSize: FONT_SIZE.xl,fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
  exportBtns: { flexDirection: 'row', gap: 8 },
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
  periodText: { fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
  summaryRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  summaryCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.md,
  },
  summaryCardGradient: {},
  summaryLabel: { color: 'rgba(255,255,255,0.75)', fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular },
  summaryValue: { color: '#FFFFFF', fontSize: FONT_SIZE.xl, fontFamily: FONT_FAMILY.bold, marginTop: 4 },
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
  balanceRowValue: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold },
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
  chartTitle: { color: colors.textPrimary, fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.semibold, marginBottom: SPACING.md },
  assetCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  assetCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  assetEyebrow: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  assetTitle: { color: colors.textPrimary, fontSize: FONT_SIZE.xl, fontFamily: FONT_FAMILY.bold, marginTop: 4 },
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
  assetHeroSubtext: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    marginTop: 6,
    marginBottom: SPACING.lg,
  },
  assetSummaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: SPACING.sm },
  assetSummaryItem: {
    width: '48%',
    backgroundColor: colors.overlayLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: `${colors.border}CC`,
    marginBottom: 0,
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
  categoryRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  categoryRowName: { color: colors.textPrimary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, flex: 1 },
  categoryRowCount: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular },
  categoryRowRight: { alignItems: 'flex-end' },
  categoryRowAmount: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, fontFamily: FONT_FAMILY.semibold },
  categoryRowPct: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { color: colors.textSecondary, fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.regular },
});

export default ReportsScreen;
