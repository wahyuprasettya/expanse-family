// ============================================================
// useTransactions Hook
// ============================================================
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from '@hooks/useTranslation';
import { addTransaction as addTxService, deleteTransaction as deleteTxService } from '@services/firebase/transactions';
import { selectTransactions, selectBalance, selectFilteredTransactions } from '@store/transactionSlice';
import { selectProfile, selectUser } from '@store/authSlice';
import { updateBudgetSpent } from '@services/firebase/budgets';
import { sendTransactionNotification, sendBudgetWarningNotification, sendHouseholdNotification } from '@services/firebase/notifications';
import { selectBudgets } from '@store/budgetSlice';
import { deleteRemindersByTransactionId, syncDebtReminder } from '@services/firebase/reminders';

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

    // Send push notification for expense
    if (data.type === 'expense') {
      try {
        await sendTransactionNotification({
          ...newTx,
          title: `${data.categoryIcon || '💸'} ${t('transactionNotification.expenseTitle')}`,
          body: t('transactionNotification.transactionBody', {
            category: data.category,
            amount: formatCurrency(data.amount, language),
          }),
        });
      } catch (sideEffectError) {
        console.warn('Transaction notification failed:', sideEffectError);
      }

      // Send notification to other household members
      if (profile?.householdId && profile.householdId !== user.uid) {
        try {
          await sendHouseholdNotification(
            profile.householdId,
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

      // Check budget and warn if needed
      const now = new Date();
      try {
        await updateBudgetSpent(user.uid, data.categoryId, now.getFullYear(), now.getMonth() + 1, data.amount);
      } catch (sideEffectError) {
        console.warn('Budget spent update failed:', sideEffectError);
      }

      // Find budget for this category and check warning threshold
      const budget = budgets.find(
        (b) => b.categoryId === data.categoryId &&
          b.year === now.getFullYear() &&
          b.month === now.getMonth() + 1
      );
      if (budget && budget.amount > 0) {
        const newSpent = (budget.spent || 0) + data.amount;
        if (newSpent / budget.amount >= 0.8) {
          try {
            await sendBudgetWarningNotification({
              title: t('transactionNotification.budgetWarningTitle', { category: data.category }),
              body: t('transactionNotification.budgetWarningBody', {
                category: data.category,
                percent: Math.round((newSpent / budget.amount) * 100),
                amount: formatCurrency(budget.amount - newSpent, language),
              }),
              name: data.category,
            });
          } catch (sideEffectError) {
            console.warn('Budget warning notification failed:', sideEffectError);
          }
        }
      }
    }

    return { id, error: null };
  };

  const deleteTransaction = async (txId) => {
    // Get transaction details before deletion for notification
    const transactionToDelete = transactions.find(tx => tx.id === txId);

    const { error } = await deleteTxService(txId);
    if (!error) {
      try {
        await deleteRemindersByTransactionId(txId);
      } catch (sideEffectError) {
        console.warn('Delete reminders failed:', sideEffectError);
      }

      // Send notification to household members when transaction is deleted
      if (transactionToDelete && profile?.householdId && profile.householdId !== user.uid) {
        try {
          await sendHouseholdNotification(
            profile.householdId,
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

  return { transactions, filteredTransactions, balance, addTransaction, deleteTransaction };
};

const formatCurrency = (amount, language) =>
  new Intl.NumberFormat(language === 'en' ? 'en-US' : 'id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
