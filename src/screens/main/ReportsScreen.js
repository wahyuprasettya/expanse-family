// ============================================================
// Reports Screen (Charts + Monthly Summary)
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { useSelector } from 'react-redux';
import { selectProfile, selectUser } from '@store/authSlice';
import { getMonthlyReport } from '@services/firebase/transactions';
import { formatCurrency, formatCurrencyCompact, formatDate } from '@utils/formatters';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING, SHADOWS } from '@constants/theme';
import { exportToCSV, exportToPDF } from '@services/export';
import { useTranslation } from '@hooks/useTranslation';
import { useAppTheme } from '@hooks/useAppTheme';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - SPACING.lg * 2;

export const ReportsScreen = () => {
  const { t, language } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const accountId = profile?.householdId || user?.uid;
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const pieData = report?.byCategory
    ?.filter((category) => category.type === 'expense')
    ?.slice(0, 6)
    ?.map((category, index) => ({
      name: category.name.split(' ')[0],
      amount: category.total,
      color: colors.chart[index % colors.chart.length],
      legendFontColor: colors.textSecondary,
      legendFontSize: 12,
    })) || [];

  const handleExport = async (format) => {
    if (!report) return;

    if (format === 'csv') {
      await exportToCSV(report.transactions, `transactions_${selectedYear}_${selectedMonth}`);
      return;
    }

    await exportToPDF(report.transactions, {
      income: report.income,
      expense: report.expense,
      balance: report.balance,
    }, `report_${selectedYear}_${selectedMonth}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
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

          {report?.byCategory?.length > 0 && (
            <View style={styles.categoryBreakdown}>
              <Text style={styles.chartTitle}>📋 {t('reports.categoryBreakdown')}</Text>
              {report.byCategory.sort((a, b) => b.total - a.total).map((category, index) => {
                const total = category.type === 'expense' ? report.expense : report.income;
                const percentage = total > 0 ? (category.total / total) * 100 : 0;

                return (
                  <View key={index} style={styles.categoryRow}>
                    <View style={styles.categoryRowLeft}>
                      <View style={[styles.categoryDot, { backgroundColor: colors.chart[index % colors.chart.length] }]} />
                      <Text style={styles.categoryRowName}>{category.name}</Text>
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
          )}

          {!report && !loading && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyText}>{t('reports.noData')}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
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
  exportBtnText: { color: colors.primary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
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
  periodText: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  summaryRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  summaryCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.md,
  },
  summaryCardGradient: {},
  summaryLabel: { color: 'rgba(255,255,255,0.75)', fontSize: FONT_SIZE.sm },
  summaryValue: { color: '#FFFFFF', fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, marginTop: 4 },
  balanceCardFull: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
  },
  balanceRowLabel: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, marginBottom: 4 },
  balanceRowValue: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartTitle: { color: colors.textPrimary, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, marginBottom: SPACING.md },
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
  categoryRowName: { color: colors.textPrimary, fontSize: FONT_SIZE.sm, flex: 1 },
  categoryRowCount: { color: colors.textMuted, fontSize: FONT_SIZE.xs },
  categoryRowRight: { alignItems: 'flex-end' },
  categoryRowAmount: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  categoryRowPct: { color: colors.textMuted, fontSize: FONT_SIZE.xs, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { color: colors.textSecondary, fontSize: FONT_SIZE.lg },
});

export default ReportsScreen;
