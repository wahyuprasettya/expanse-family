// ============================================================
// useTransactions Hook
// ============================================================
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from '@hooks/useTranslation';
import {
  addTransaction as addTxService,
  archiveTransactionsBeforeDate as archiveTransactionsBeforeDateService,
  deleteArchivedTransactionsBeforeDate as deleteArchivedTransactionsBeforeDateService,
  deleteTransaction as deleteTxService,
  restoreArchivedTransactionsBeforeDate as restoreArchivedTransactionsBeforeDateService,
  updateTransaction as updateTxService,
} from '@services/firebase/transactions';
import {
  selectTransactions,
  selectBalance,
  selectFilteredTransactions,
  updateTransactionLocal,
} from '@store/transactionSlice';
import { selectProfile, selectUser } from '@store/authSlice';
import { updateBudgetSpent } from '@services/firebase/budgets';
import { sendTransactionNotification, sendBudgetWarningNotification, sendHouseholdNotification } from '@services/firebase/notifications';
import { selectBudgets } from '@store/budgetSlice';
import { deleteRemindersByTransactionId, syncDebtReminder } from '@services/firebase/reminders';
import { adjustWalletBalance } from '@services/firebase/wallets';

export const useTransactions = () => {
  const dispatch = useDispatch();
  const { t, language } = useTranslation();
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const transactions = useSelector(selectTransactions);
  const balance = useSelector(selectBalance);
  const filteredTransactions = useSelector(selectFilteredTransactions);
  const budgets = useSelector(selectBudgets);

  const accountId = profile?.householdId || user?.uid;

  const addTransaction = async (data) => {
    if (!user?.uid || !accountId) return { error: 'Not authenticated' };

    const { id, error } = await addTxService(accountId, user, data);
    if (error) {
      return { error };
    }

    const newTx = {
      id,
      ...data,
      userId: user.uid,
      householdId: accountId,
      createdByUid: user.uid,
      createdByName: user.displayName || user.email || 'Member',
      date: new Date(data.date).toISOString(),
    };

    if (data.type === 'debt' && data.debtMeta?.dueDate) {
      try {
        await syncDebtReminder({
          transactionId: id,
          userId: user.uid,
          creditorName: data.debtMeta.creditorName,
          category: data.category,
          amount: data.amount,
          dueDate: data.debtMeta.dueDate,
          remindDaysBefore: data.debtMeta.remindDaysBefore ?? 3,
        }, t);
      } catch (sideEffectError) {
        console.warn('Debt reminder sync failed:', sideEffectError);
      }
    }

    const walletAdjustments = getWalletAdjustments(data);
    if (walletAdjustments.length > 0) {
      try {
        await applyWalletAdjustments(walletAdjustments);
      } catch (sideEffectError) {
        console.warn('Wallet balance update failed:', sideEffectError);
      }
    }

    // Send local notification for all transaction types
    const notificationConfig = getTransactionNotificationConfig(data.type, data.categoryIcon, t);
    try {
      await sendTransactionNotification({
        ...newTx,
        title: notificationConfig.title,
        body: t('transactionNotification.transactionBody', {
          category: data.category,
          amount: formatCurrency(data.amount, language),
        }),
      });
    } catch (sideEffectError) {
      console.warn('Transaction notification failed:', sideEffectError);
    }

    // Send notification to other household members in the same shared account.
    // For owners, householdId is often equal to user.uid, so comparing against
    // user.uid incorrectly blocks notifications to their partner.
    if (accountId) {
      try {
        await sendHouseholdNotification(
          accountId,
          user.uid,
          {
            title: t('transactionNotification.householdAddedTitle', {
              name: user.displayName || t('profile.fallbackUser'),
            }),
            body: t('transactionNotification.householdAddedBody', {
              category: data.category,
              amount: formatCurrency(data.amount, language),
            }),
            data: {
              transactionId: id,
              type: 'household_transaction',
              action: 'added'
            },
          }
        );
      } catch (sideEffectError) {
        console.warn('Household notification failed:', sideEffectError);
      }
    }

    if (data.type === 'expense') {
      // Check budget and warn if needed
      const now = new Date();
      try {
        await updateBudgetSpent(
          accountId,
          data.categoryId,
          now.getFullYear(),
          now.getMonth() + 1,
          data.amount,
          data.walletId || null
        );
      } catch (sideEffectError) {
        console.warn('Budget spent update failed:', sideEffectError);
      }

      // Find budget for this category and check warning threshold
      const budget = budgets.find(
        (b) => b.categoryId === data.categoryId &&
          b.year === now.getFullYear() &&
          b.month === now.getMonth() + 1 &&
          matchesBudgetWallet(b, data.walletId)
      );
      if (budget && budget.amount > 0) {
        const newSpent = (budget.spent || 0) + data.amount;
        if (newSpent / budget.amount >= 0.8) {
          const budgetWarningPayload = {
            title: t('transactionNotification.budgetWarningTitle', { category: data.category }),
            body: t('transactionNotification.budgetWarningBody', {
              category: data.category,
              percent: Math.round((newSpent / budget.amount) * 100),
              amount: formatCurrency(budget.amount - newSpent, language),
            }),
            name: data.category,
          };

          try {
            await sendBudgetWarningNotification(budgetWarningPayload);
          } catch (sideEffectError) {
            console.warn('Budget warning notification failed:', sideEffectError);
          }

          try {
            await sendHouseholdNotification(accountId, user.uid, {
              title: budgetWarningPayload.title,
              body: budgetWarningPayload.body,
              data: {
                type: 'budget_warning',
                action: 'threshold',
                category: data.category,
              },
            });
          } catch (sideEffectError) {
            console.warn('Household budget warning notification failed:', sideEffectError);
          }
        }
      }
    }

    return { id, error: null };
  };

  const updateTransaction = async (txId, data) => {
    if (!user?.uid || !accountId) return { error: 'Not authenticated' };

    const previous = transactions.find((transaction) => transaction.id === txId);
    if (!previous) return { error: 'Transaction not found' };

    const updates = {
      amount: data.amount,
      type: data.type,
      category: data.category,
      categoryId: data.categoryId,
      walletId: data.walletId || null,
      walletName: data.walletName || null,
      categoryIcon: data.categoryIcon,
      categoryColor: data.categoryColor,
      description: data.description || '',
      date: data.date,
      debtMeta: data.debtMeta || null,
      transferMeta: data.transferMeta || null,
      updatedByUid: user.uid,
      updatedByName: user.displayName || user.email || 'Member',
      userId: previous.userId || user.uid,
    };

    const { error } = await updateTxService(txId, updates);
    if (error) {
      return { error };
    }

    dispatch(updateTransactionLocal({
      id: txId,
      ...updates,
      date: new Date(data.date).toISOString(),
    }));

    const previousBudgetKey = getExpenseBudgetKey(previous);
    const nextBudgetKey = data.type === 'expense'
      ? getExpenseBudgetKey({
          categoryId: data.categoryId,
          walletId: data.walletId,
          date: data.date,
          type: data.type,
        })
      : null;
    const previousWalletAdjustments = getWalletAdjustments(previous);
    const nextWalletAdjustments = getWalletAdjustments(data);

    try {
      if (previousBudgetKey && nextBudgetKey
        && previousBudgetKey.categoryId === nextBudgetKey.categoryId
        && previousBudgetKey.year === nextBudgetKey.year
        && previousBudgetKey.month === nextBudgetKey.month
        && previousBudgetKey.walletId === nextBudgetKey.walletId) {
        const delta = data.amount - previous.amount;
        if (delta !== 0) {
          await updateBudgetSpent(
            accountId,
            nextBudgetKey.categoryId,
            nextBudgetKey.year,
            nextBudgetKey.month,
            delta,
            nextBudgetKey.walletId
          );
        }
      } else {
        if (previousBudgetKey) {
          await updateBudgetSpent(
            accountId,
            previousBudgetKey.categoryId,
            previousBudgetKey.year,
            previousBudgetKey.month,
            -previous.amount,
            previousBudgetKey.walletId
          );
        }

        if (nextBudgetKey) {
          await updateBudgetSpent(
            accountId,
            nextBudgetKey.categoryId,
            nextBudgetKey.year,
            nextBudgetKey.month,
            data.amount,
            nextBudgetKey.walletId
          );
        }
      }
    } catch (sideEffectError) {
      console.warn('Budget adjustment on transaction update failed:', sideEffectError);
    }

    try {
      const deltaAdjustments = mergeWalletAdjustments(
        invertWalletAdjustments(previousWalletAdjustments),
        nextWalletAdjustments
      );

      if (deltaAdjustments.length > 0) {
        await applyWalletAdjustments(deltaAdjustments);
      }
    } catch (sideEffectError) {
      console.warn('Wallet adjustment on transaction update failed:', sideEffectError);
    }

    try {
      if (data.type === 'debt' && data.debtMeta?.dueDate) {
        await syncDebtReminder({
          transactionId: txId,
          userId: user.uid,
          creditorName: data.debtMeta.creditorName,
          category: data.category,
          amount: data.amount,
          dueDate: data.debtMeta.dueDate,
          remindDaysBefore: data.debtMeta.remindDaysBefore ?? 3,
        }, t);
      } else if (previous.type === 'debt') {
        await deleteRemindersByTransactionId(txId);
      }
    } catch (sideEffectError) {
      console.warn('Debt reminder update failed:', sideEffectError);
    }

    if (accountId) {
      try {
        await sendHouseholdNotification(
          accountId,
          user.uid,
          {
            title: t('transactionNotification.householdUpdatedTitle', {
              name: user.displayName || t('profile.fallbackUser'),
            }),
            body: t('transactionNotification.householdUpdatedBody', {
              category: data.category,
              amount: formatCurrency(data.amount, language),
            }),
            data: {
              transactionId: txId,
              type: 'household_transaction',
              action: 'updated'
            },
          }
        );
      } catch (sideEffectError) {
        console.warn('Update household notification failed:', sideEffectError);
      }
    }

    return { error: null };
  };

  const deleteTransaction = async (txId) => {
    // Get transaction details before deletion for notification
    const transactionToDelete = transactions.find(tx => tx.id === txId);

    const { error } = await deleteTxService(txId);
    if (!error) {
      const budgetKey = getExpenseBudgetKey(transactionToDelete);
      const walletAdjustments = invertWalletAdjustments(getWalletAdjustments(transactionToDelete));
      try {
        await deleteRemindersByTransactionId(txId);
      } catch (sideEffectError) {
        console.warn('Delete reminders failed:', sideEffectError);
      }

      if (budgetKey) {
        try {
          await updateBudgetSpent(
            accountId,
            budgetKey.categoryId,
            budgetKey.year,
            budgetKey.month,
            -transactionToDelete.amount,
            budgetKey.walletId
          );
        } catch (sideEffectError) {
          console.warn('Budget adjustment on transaction delete failed:', sideEffectError);
        }
      }

      if (walletAdjustments.length > 0) {
        try {
          await applyWalletAdjustments(walletAdjustments);
        } catch (sideEffectError) {
          console.warn('Wallet adjustment on transaction delete failed:', sideEffectError);
        }
      }

      // Send notification to household members when transaction is deleted.
      if (transactionToDelete && accountId) {
        try {
          await sendHouseholdNotification(
            accountId,
            user.uid,
            {
              title: t('transactionNotification.householdDeletedTitle', {
                name: user.displayName || t('profile.fallbackUser'),
              }),
              body: t('transactionNotification.householdDeletedBody', {
                category: transactionToDelete.category,
                amount: formatCurrency(transactionToDelete.amount, language),
              }),
              data: {
                transactionId: txId,
                type: 'household_transaction',
                action: 'deleted'
              },
            }
          );
        } catch (sideEffectError) {
          console.warn('Delete household notification failed:', sideEffectError);
        }
      }
    }
    return { error };
  };

  const archiveTransactionsBeforeDate = async (cutoffDate) => {
    if (!user?.uid || !accountId) return { archivedCount: 0, error: 'Not authenticated' };

    return archiveTransactionsBeforeDateService(accountId, cutoffDate, user);
  };

  const restoreArchivedTransactionsBeforeDate = async (cutoffDate) => {
    if (!user?.uid || !accountId) return { restoredCount: 0, error: 'Not authenticated' };

    return restoreArchivedTransactionsBeforeDateService(accountId, cutoffDate);
  };

  const deleteArchivedTransactionsBeforeDate = async (cutoffDate) => {
    if (!user?.uid || !accountId) return { deletedCount: 0, deletedIds: [], error: 'Not authenticated' };

    const result = await deleteArchivedTransactionsBeforeDateService(accountId, cutoffDate);
    if (result.error || !Array.isArray(result.deletedIds) || result.deletedIds.length === 0) {
      return result;
    }

    await Promise.allSettled(
      result.deletedIds.map((transactionId) => deleteRemindersByTransactionId(transactionId))
    );

    return result;
  };

  return {
    transactions,
    filteredTransactions,
    balance,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    archiveTransactionsBeforeDate,
    restoreArchivedTransactionsBeforeDate,
    deleteArchivedTransactionsBeforeDate,
  };
};

const formatCurrency = (amount, language) =>
  new Intl.NumberFormat(language === 'en' ? 'en-US' : 'id-ID', { style: 'currency', currency: 'IDR' }).format(amount);

const getTransactionNotificationConfig = (type, categoryIcon, t) => {
  const configs = {
    expense: {
      icon: categoryIcon || '💸',
      title: t('transactionNotification.expenseTitle'),
    },
    income: {
      icon: categoryIcon || '💰',
      title: t('transactionNotification.incomeTitle'),
    },
    transfer: {
      icon: categoryIcon || '🔄',
      title: t('transactionNotification.transferTitle'),
    },
    debt: {
      icon: categoryIcon || '🧾',
      title: t('transactionNotification.debtTitle'),
    },
  };

  const config = configs[type] || configs.expense;
  return {
    ...config,
    title: `${config.icon} ${config.title}`,
  };
};

const getExpenseBudgetKey = (transaction) => {
  if (!transaction || transaction.type !== 'expense' || !transaction.categoryId || !transaction.date) {
    return null;
  }

  const date = new Date(transaction.date);
  return {
    categoryId: transaction.categoryId,
    walletId: normalizeBudgetWalletId(transaction.walletId),
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
};

const normalizeBudgetWalletId = (walletId) => walletId || null;
const matchesBudgetWallet = (budget, walletId) =>
  normalizeBudgetWalletId(budget?.walletId) === normalizeBudgetWalletId(walletId);

const getWalletAdjustments = (transaction) => {
  if (!transaction?.amount) {
    return [];
  }

  const amount = Number(transaction.amount) || 0;
  if (amount === 0) {
    return [];
  }

  if (transaction.type === 'transfer') {
    const sourceWalletId = transaction.transferMeta?.sourceWalletId || transaction.walletId;
    const destinationWalletId = transaction.transferMeta?.destinationWalletId || null;
    const adminFee = Number(transaction.transferMeta?.adminFee) || 0;

    return mergeWalletAdjustments([
      sourceWalletId ? { walletId: sourceWalletId, delta: -(amount + adminFee) } : null,
      destinationWalletId ? { walletId: destinationWalletId, delta: amount } : null,
    ].filter(Boolean));
  }

  if (!transaction.walletId) {
    return [];
  }

  return [{
    walletId: transaction.walletId,
    delta: transaction.type === 'income' ? amount : -amount,
  }];
};

const invertWalletAdjustments = (adjustments = []) =>
  adjustments.map((adjustment) => ({
    ...adjustment,
    delta: -adjustment.delta,
  }));

const mergeWalletAdjustments = (...adjustmentGroups) => {
  const totals = new Map();

  adjustmentGroups
    .flat()
    .filter(Boolean)
    .forEach((adjustment) => {
      if (!adjustment.walletId || !adjustment.delta) return;
      totals.set(adjustment.walletId, (totals.get(adjustment.walletId) || 0) + adjustment.delta);
    });

  return Array.from(totals.entries())
    .map(([walletId, delta]) => ({ walletId, delta }))
    .filter((adjustment) => adjustment.delta !== 0);
};

const applyWalletAdjustments = async (adjustments = []) => {
  for (const adjustment of adjustments) {
    const { error } = await adjustWalletBalance(adjustment.walletId, adjustment.delta);
    if (error) {
      throw new Error(error);
    }
  }
};
