// ============================================================
// useInsights Hook – Spending Analysis
// ============================================================
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectTransactions } from '@store/transactionSlice';
import { formatInsightChange } from '@utils/formatters';
import { startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';

export const useInsights = () => {
  const transactions = useSelector(selectTransactions);

  const insights = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const thisMonth = transactions.filter((t) =>
      isWithinInterval(new Date(t.date), { start: thisMonthStart, end: thisMonthEnd })
    );
    const lastMonth = transactions.filter((t) =>
      isWithinInterval(new Date(t.date), { start: lastMonthStart, end: lastMonthEnd })
    );

    // Category spending comparison
    const getCategorySpending = (txList, type = 'expense') => {
      return txList
        .filter((t) => type === 'expense' ? t.type === 'expense' || t.type === 'debt' : t.type === type)
        .reduce((acc, t) => {
          acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
          return acc;
        }, {});
    };

    const thisMonthByCategory = getCategorySpending(thisMonth);
    const lastMonthByCategory = getCategorySpending(lastMonth);

    const categoryInsights = Object.keys(thisMonthByCategory).map((catId) => {
      const current = thisMonthByCategory[catId] || 0;
      const previous = lastMonthByCategory[catId] || 0;
      const change = formatInsightChange(current, previous);
      const category = thisMonth.find((t) => t.categoryId === catId);

      return {
        categoryId: catId,
        categoryName: category?.category || catId,
        current,
        previous,
        change,
      };
    }).filter((i) => i.change !== null);

    // Top spending categories this month
    const topCategories = Object.entries(thisMonthByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([catId, amount]) => ({
        categoryId: catId,
        amount,
        categoryName: thisMonth.find((t) => t.categoryId === catId)?.category || catId,
      }));

    // Total this month vs last month
    const thisMonthTotal = thisMonth
      .filter((t) => t.type === 'expense' || t.type === 'debt')
      .reduce((s, t) => s + t.amount, 0);
    const lastMonthTotal = lastMonth
      .filter((t) => t.type === 'expense' || t.type === 'debt')
      .reduce((s, t) => s + t.amount, 0);
    const overallChange = formatInsightChange(thisMonthTotal, lastMonthTotal);

    // Savings rate this month
    const thisMonthIncome = thisMonth.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const savingsRate = thisMonthIncome > 0 ? ((thisMonthIncome - thisMonthTotal) / thisMonthIncome) * 100 : 0;

    return {
      categoryInsights,
      topCategories,
      thisMonthTotal,
      lastMonthTotal,
      overallChange,
      thisMonthIncome,
      savingsRate: Math.max(0, Math.round(savingsRate)),
    };
  }, [transactions]);

  return insights;
};
