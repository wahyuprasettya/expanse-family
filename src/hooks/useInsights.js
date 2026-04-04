// ============================================================
// useInsights Hook – Spending Analysis
// ============================================================
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { selectTransactions } from '@store/transactionSlice';
import { selectCategories } from '@store/categorySlice';
import { selectBudgets } from '@store/budgetSlice';
import {
  buildMonthlyExpenseData,
  calcSavingsRate,
  calcBudgetUsage,
  getBudgetStatus,
  getChangeStats,
  isExpenseTransaction,
  sumExpenses,
  sumByType,
} from '@utils/calculations';
import { formatCurrency } from '@utils/formatters';
import { useTranslation } from '@hooks/useTranslation';

const LARGE_TRANSACTION_THRESHOLD = 1000000;
const SIGNIFICANT_SPIKE_THRESHOLD = 25;

const getBudgetStatusLabel = (status, language) => {
  if (language === 'en') {
    if (status === 'exceeded') return 'Exceeded';
    if (status === 'critical') return 'Almost gone';
    if (status === 'warning') return 'Warning';
    return 'Safe';
  }

  if (status === 'exceeded') return 'Terlampaui';
  if (status === 'critical') return 'Hampir habis';
  if (status === 'warning') return 'Waspada';
  return 'Aman';
};

export const useInsights = () => {
  const { t, language } = useTranslation();
  const transactions = useSelector(selectTransactions);
  const categories = useSelector(selectCategories);
  const budgets = useSelector(selectBudgets);

  const insights = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthDate = subMonths(now, 1);
    const lastMonthStart = startOfMonth(lastMonthDate);
    const lastMonthEnd = endOfMonth(lastMonthDate);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const categoryMap = new Map(categories.map((category) => [category.id, category]));

    const getCategoryDisplayName = (transactionOrCategory = {}) => {
      const category = categoryMap.get(transactionOrCategory.categoryId || transactionOrCategory.id);

      if (category?.isDefault && category?.id) {
        const translatedName = t(`categories.names.${category.id}`);
        return translatedName !== `categories.names.${category.id}` ? translatedName : category.name;
      }

      return transactionOrCategory.category
        || transactionOrCategory.categoryName
        || category?.name
        || (language === 'en' ? 'Other' : 'Lainnya');
    };

    const getCategoryMeta = (categoryId, transaction) => {
      const category = categoryMap.get(categoryId);
      return {
        categoryName: getCategoryDisplayName({ id: categoryId, category: transaction?.category }),
        categoryIcon: transaction?.categoryIcon || category?.icon || '📦',
        categoryColor: transaction?.categoryColor || category?.color || '#64748B',
      };
    };

    const thisMonthTransactions = transactions.filter((transaction) =>
      isWithinInterval(new Date(transaction.date), { start: thisMonthStart, end: thisMonthEnd })
    );
    const lastMonthTransactions = transactions.filter((transaction) =>
      isWithinInterval(new Date(transaction.date), { start: lastMonthStart, end: lastMonthEnd })
    );

    const thisMonthExpenses = thisMonthTransactions.filter(isExpenseTransaction);

    const buildCategoryBreakdown = (items) => {
      const totals = items.reduce((accumulator, transaction) => {
        const key = transaction.categoryId || 'other';
        const current = accumulator[key] || {
          categoryId: key,
          total: 0,
          count: 0,
          lastTransaction: transaction,
        };

        current.total += transaction.amount;
        current.count += 1;
        current.lastTransaction = transaction;
        accumulator[key] = current;
        return accumulator;
      }, {});

      const overallTotal = Object.values(totals).reduce((sum, category) => sum + category.total, 0);

      return Object.values(totals)
        .map((category) => {
          const meta = getCategoryMeta(category.categoryId, category.lastTransaction);
          return {
            ...category,
            ...meta,
            percentage: overallTotal > 0 ? Math.round((category.total / overallTotal) * 100) : 0,
          };
        })
        .sort((first, second) => second.total - first.total);
    };

    const categoryBreakdown = buildCategoryBreakdown(thisMonthExpenses);
    const topCategory = categoryBreakdown[0] || null;
    const categoryInsightMessages = [];

    if (topCategory) {
      categoryInsightMessages.push(
        language === 'en'
          ? `${topCategory.percentage}% of your spending this month went to ${topCategory.categoryName}`
          : `${topCategory.percentage}% pengeluaran kamu bulan ini habis di kategori ${topCategory.categoryName}`
      );
      categoryInsightMessages.push(
        language === 'en'
          ? `Your biggest category is ${topCategory.categoryName} at ${formatCurrency(topCategory.total, 'IDR', language)}`
          : `Kategori terbesar kamu adalah ${topCategory.categoryName} sebesar ${formatCurrency(topCategory.total, 'IDR', language)}`
      );

      if (topCategory.percentage > 50) {
        categoryInsightMessages.push(
          language === 'en'
            ? 'Your spending is too concentrated in one category'
            : 'Pengeluaran kamu terlalu terfokus di satu kategori'
        );
      }
    }

    const thisMonthTotal = sumExpenses(thisMonthTransactions);
    const lastMonthTotal = sumExpenses(lastMonthTransactions);
    const monthlyChange = getChangeStats(thisMonthTotal, lastMonthTotal);

    let summaryMessage = null;
    let summaryDetail = null;

    if (!monthlyChange.hasComparison) {
      summaryMessage = language === 'en'
        ? 'There is no spending history from the previous month yet'
        : 'Belum ada histori pengeluaran bulan lalu untuk dibandingkan';
      summaryDetail = thisMonthTotal > 0
        ? (language === 'en'
            ? `Current month spending reached ${formatCurrency(thisMonthTotal, 'IDR', language)}`
            : `Pengeluaran bulan ini mencapai ${formatCurrency(thisMonthTotal, 'IDR', language)}`)
        : null;
    } else if (monthlyChange.direction === 'decreased') {
      summaryMessage = language === 'en'
        ? 'This month you are spending less than last month'
        : 'Bulan ini kamu lebih hemat dibanding bulan lalu';
      summaryDetail = language === 'en'
        ? `Down ${monthlyChange.percentage}% or ${formatCurrency(Math.abs(monthlyChange.difference), 'IDR', language)} from last month`
        : `Turun ${monthlyChange.percentage}% atau ${formatCurrency(Math.abs(monthlyChange.difference), 'IDR', language)} dari bulan lalu`;
    } else if (monthlyChange.direction === 'increased') {
      summaryMessage = language === 'en'
        ? 'Your spending increased compared to last month'
        : 'Pengeluaran kamu meningkat dibanding bulan lalu';
      summaryDetail = language === 'en'
        ? `Up ${monthlyChange.percentage}% or ${formatCurrency(monthlyChange.difference, 'IDR', language)} from last month`
        : `Naik ${monthlyChange.percentage}% atau ${formatCurrency(monthlyChange.difference, 'IDR', language)} dari bulan lalu`;
    } else {
      summaryMessage = language === 'en'
        ? 'Your spending is stable compared to last month'
        : 'Pengeluaran kamu stabil dibanding bulan lalu';
      summaryDetail = language === 'en'
        ? 'No nominal change from last month'
        : 'Tidak ada selisih nominal dari bulan lalu';
    }

    const trendMonths = buildMonthlyExpenseData(transactions, 6, now, language);
    const latestTrendMonth = trendMonths[trendMonths.length - 1] || null;
    const previousTrendMonth = trendMonths[trendMonths.length - 2] || null;
    const latestTrendChange = latestTrendMonth && previousTrendMonth
      ? getChangeStats(latestTrendMonth.expense, previousTrendMonth.expense)
      : null;
    const trendInsightMessages = [];

    if (latestTrendMonth && previousTrendMonth) {
      if (latestTrendChange?.direction === 'increased') {
        trendInsightMessages.push(
          language === 'en'
            ? `Your spending increased in ${latestTrendMonth.fullLabel}`
            : `Pengeluaran kamu meningkat di bulan ${latestTrendMonth.fullLabel}`
        );
      } else if (latestTrendChange?.direction === 'decreased') {
        trendInsightMessages.push(
          language === 'en'
            ? 'Your spending decreased, that is a good trend'
            : 'Pengeluaran kamu menurun, ini tren yang bagus'
        );
      }
    }

    const spikes = trendMonths
      .map((month, index) => {
        if (index === 0) return null;
        const previousMonth = trendMonths[index - 1];
        const stats = getChangeStats(month.expense, previousMonth.expense);
        return {
          ...month,
          change: stats,
        };
      })
      .filter(Boolean)
      .filter((month) => month.change.hasComparison && month.change.direction === 'increased');

    const largestSpike = spikes.sort((first, second) => second.change.percentage - first.change.percentage)[0] || null;

    if (largestSpike && largestSpike.change.percentage >= SIGNIFICANT_SPIKE_THRESHOLD) {
      trendInsightMessages.push(
        language === 'en'
          ? `There was a significant spike in ${largestSpike.fullLabel}`
          : `Terjadi lonjakan signifikan di bulan ${largestSpike.fullLabel}`
      );
    }

    const largeTransactions = transactions
      .filter((transaction) => transaction.amount >= LARGE_TRANSACTION_THRESHOLD)
      .sort((first, second) => new Date(second.date) - new Date(first.date));
    const thisMonthLargeTransactions = thisMonthTransactions
      .filter((transaction) => transaction.amount >= LARGE_TRANSACTION_THRESHOLD)
      .sort((first, second) => second.amount - first.amount)
      .map((transaction) => ({
        ...transaction,
        ...getCategoryMeta(transaction.categoryId, transaction),
      }));

    const topLargeTransaction = thisMonthLargeTransactions[0] || null;
    const largeTransactionInsight = topLargeTransaction
      ? (language === 'en'
          ? `You made a large transaction of ${formatCurrency(topLargeTransaction.amount, 'IDR', language)} in ${topLargeTransaction.categoryName}`
          : `Kamu melakukan transaksi besar sebesar ${formatCurrency(topLargeTransaction.amount, 'IDR', language)} di kategori ${topLargeTransaction.categoryName}`)
      : null;

    const budgetItems = budgets.filter(
      (budget) => budget.year === currentYear && budget.month === currentMonth
    );
    const categoryExpenseMap = categoryBreakdown.reduce((accumulator, category) => {
      accumulator[category.categoryId] = category.total;
      return accumulator;
    }, {});

    const budgetInsights = budgetItems
      .map((budget) => {
        const spent = categoryExpenseMap[budget.categoryId] || 0;
        const usagePercentage = calcBudgetUsage(spent, budget.amount);
        const status = getBudgetStatus(usagePercentage);
        const statusLabel = getBudgetStatusLabel(status, language);
        let message = language === 'en'
          ? `${budget.categoryName} budget is still safe`
          : `Budget ${budget.categoryName} kamu masih aman`;

        if (status === 'warning') {
          message = language === 'en'
            ? `${budget.categoryName} budget is already used ${usagePercentage}%, be careful`
            : `Budget ${budget.categoryName} kamu sudah terpakai ${usagePercentage}%, hati-hati ya!`;
        }
        if (status === 'critical') {
          message = language === 'en'
            ? `${budget.categoryName} budget is almost gone`
            : `Budget ${budget.categoryName} hampir habis`;
        }
        if (status === 'exceeded') {
          message = language === 'en'
            ? `${budget.categoryName} budget has been exceeded`
            : `Budget ${budget.categoryName} sudah terlampaui`;
        }

        return {
          ...budget,
          spent,
          usagePercentage,
          status,
          statusLabel,
          remaining: budget.amount - spent,
          categoryName: getCategoryDisplayName({ id: budget.categoryId, categoryName: budget.categoryName }),
          message,
        };
      })
      .sort((first, second) => second.usagePercentage - first.usagePercentage);

    const budgetWarnings = budgetInsights.filter((budget) => budget.usagePercentage >= 70);
    const thisMonthIncome = sumByType(thisMonthTransactions, 'income');
    const insightCards = [];

    if (summaryMessage) {
      insightCards.push({
        id: 'monthly-summary',
        icon: monthlyChange.direction === 'decreased'
          ? '📉'
          : monthlyChange.direction === 'increased'
            ? '📈'
            : '📊',
        title: summaryMessage,
        subtitle: summaryDetail,
      });
    }

    categoryInsightMessages.slice(0, 3).forEach((message, index) => {
      insightCards.push({
        id: `category-${index}`,
        icon: '🧠',
        title: message,
      });
    });

    trendInsightMessages.slice(0, 2).forEach((message, index) => {
      insightCards.push({
        id: `trend-${index}`,
        icon: '📆',
        title: message,
      });
    });

    if (largeTransactionInsight) {
      insightCards.push({
        id: 'large-transaction',
        icon: '💳',
        title: largeTransactionInsight,
      });
    }

    return {
      thisMonthTransactions,
      thisMonthExpenses,
      lastMonthTransactions,
      categoryBreakdown,
      categoryInsightMessages,
      topCategory,
      thisMonthTotal,
      lastMonthTotal,
      monthlySummary: {
        currentTotal: thisMonthTotal,
        previousTotal: lastMonthTotal,
        ...monthlyChange,
        message: summaryMessage,
        detail: summaryDetail,
      },
      trend: {
        months: trendMonths,
        latestChange: latestTrendChange,
        messages: trendInsightMessages,
        spike: largestSpike,
      },
      largeTransactions,
      thisMonthLargeTransactions,
      largeTransactionInsight,
      budgetInsights,
      budgetWarnings,
      insightCards,
      thisMonthIncome,
      savingsRate: calcSavingsRate(thisMonthIncome, thisMonthTotal),
    };
  }, [budgets, categories, language, t, transactions]);

  return insights;
};

export default useInsights;
