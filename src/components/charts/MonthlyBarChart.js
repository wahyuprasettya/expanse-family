// ============================================================
// Monthly Bar Chart Component (income vs expense)
// ============================================================
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { selectTransactions } from '@store/transactionSlice';
import { buildMonthlyBarData } from '@utils/calculations';
import { formatCurrencyCompact } from '@utils/formatters';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING } from '@constants/theme';
import { useAppTheme } from '@hooks/useAppTheme';
import { useTranslation } from '@hooks/useTranslation';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - SPACING.lg * 4;

export const MonthlyBarChart = ({ monthsToShow = 5 }) => {
  const transactions = useSelector(selectTransactions);
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const styles = createStyles(colors);
  const data = useMemo(() => buildMonthlyBarData(transactions, monthsToShow), [transactions, monthsToShow]);
  const BAR_COLOR_INCOME = colors.income;
  const BAR_COLOR_EXPENSE = colors.expense;

  const maxValue = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1);
  const barWidth = Math.floor((CHART_WIDTH / monthsToShow - 16) / 2);
  const maxBarHeight = 120;

  return (
    <View style={styles.container}>
      <View style={styles.chartArea}>
        {data.map((item, i) => (
          <View key={i} style={styles.barGroup}>
            {/* Income bar */}
            <View style={styles.barWrapper}>
              <Text style={[styles.barLabel, { color: BAR_COLOR_INCOME }]}>
                {item.income > 0 ? formatCurrencyCompact(item.income).replace('Rp ', '') : ''}
              </Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max((item.income / maxValue) * maxBarHeight, 2),
                    width: barWidth,
                    backgroundColor: BAR_COLOR_INCOME,
                  },
                ]}
              />
            </View>
            {/* Expense bar */}
            <View style={styles.barWrapper}>
              <Text style={[styles.barLabel, { color: BAR_COLOR_EXPENSE }]}>
                {item.expense > 0 ? formatCurrencyCompact(item.expense).replace('Rp ', '') : ''}
              </Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max((item.expense / maxValue) * maxBarHeight, 2),
                    width: barWidth,
                    backgroundColor: BAR_COLOR_EXPENSE,
                  },
                ]}
              />
            </View>
            {/* Month label */}
            <Text style={styles.monthLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: BAR_COLOR_INCOME }]} />
          <Text style={styles.legendText}>{t('common.income')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: BAR_COLOR_EXPENSE }]} />
          <Text style={styles.legendText}>{t('common.expense')}</Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 160,
    paddingHorizontal: SPACING.sm,
  },
  barGroup: {
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 2,
  },
  bar: {
    borderRadius: BORDER_RADIUS.sm,
    marginTop: 4,
  },
  barLabel: { fontSize: 8, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold, marginBottom: 2 },
  monthLabel: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: 6,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: FONT_FAMILY.medium,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.textSecondary, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular },
});

export default MonthlyBarChart;
