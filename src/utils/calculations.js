// ============================================================
// Utility: Calculations
// ============================================================

/**
 * Calculate net balance from a list of transactions
 */
export const calculateBalance = (transactions = []) =>
  transactions.reduce((acc, t) => {
    if (t.type === 'income') return acc + t.amount;
    if (t.type === 'expense' || t.type === 'debt') return acc - t.amount;
    return acc;
  }, 0);

/**
 * Sum all transactions of a specific type
 */
export const sumByType = (transactions = [], type) =>
  transactions.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);

/**
 * Group transactions by category, returning totals
 */
export const groupByCategory = (transactions = []) =>
  transactions.reduce((acc, t) => {
    const key = t.categoryId || 'other';
    if (!acc[key]) {
      acc[key] = {
        categoryId: key,
        categoryName: t.category,
        categoryIcon: t.categoryIcon,
        categoryColor: t.categoryColor,
        total: 0,
        count: 0,
        type: t.type,
      };
    }
    acc[key].total += t.amount;
    acc[key].count += 1;
    return acc;
  }, {});

/**
 * Group transactions by day (YYYY-MM-DD key)
 */
export const groupByDay = (transactions = []) =>
  transactions.reduce((acc, t) => {
    const key = new Date(t.date).toISOString().split('T')[0];
    if (!acc[key]) acc[key] = { date: new Date(t.date), items: [] };
    acc[key].items.push(t);
    return acc;
  }, {});

/**
 * Group transactions by month (YYYY-MM key)
 */
export const groupByMonth = (transactions = []) =>
  transactions.reduce((acc, t) => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = { year: d.getFullYear(), month: d.getMonth() + 1, items: [] };
    acc[key].items.push(t);
    return acc;
  }, {});

/**
 * Calculate savings rate (0–100)
 */
export const calcSavingsRate = (income, expense) => {
  if (!income || income <= 0) return 0;
  return Math.max(0, Math.round(((income - expense) / income) * 100));
};

/**
 * Calculate budget consumption percentage
 */
export const calcBudgetUsed = (spent, budget) => {
  if (!budget || budget <= 0) return 0;
  return Math.min(Math.round((spent / budget) * 100), 100);
};

/**
 * Sort categories by total, descending
 */
export const sortCategoriesByTotal = (categoryMap) =>
  Object.values(categoryMap).sort((a, b) => b.total - a.total);

/**
 * Get top N spending categories
 */
export const getTopCategories = (transactions = [], n = 5, type = 'expense') => {
  const grouped = groupByCategory(transactions.filter((t) => t.type === type));
  return sortCategoriesByTotal(grouped).slice(0, n);
};

/**
 * Build bar chart data for income vs expense across last N months
 */
export const buildMonthlyBarData = (transactions = [], months = 6) => {
  const now = new Date();
  const result = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const label = d.toLocaleString('default', { month: 'short' });

    const monthTxs = transactions.filter((t) => {
      const td = new Date(t.date);
      return td.getFullYear() === year && td.getMonth() === month;
    });

    result.push({
      label,
      income: sumByType(monthTxs, 'income'),
      expense: monthTxs
        .filter((t) => t.type === 'expense' || t.type === 'debt')
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    });
  }
  return result;
};
