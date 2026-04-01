// ============================================================
// useTransactions Hook
// ============================================================
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { subscribeToTransactions, addTransaction as addTxService, deleteTransaction as deleteTxService } from '@services/firebase/transactions';
import { setTransactions, addTransactionLocal, removeTransactionLocal, selectTransactions, selectBalance, selectFilteredTransactions } from '@store/transactionSlice';
import { selectProfile, selectUser } from '@store/authSlice';
import { updateBudgetSpent } from '@services/firebase/budgets';
import { sendTransactionNotification, sendBudgetWarningNotification } from '@services/firebase/notifications';
import { selectBudgets } from '@store/budgetSlice';

export const useTransactions = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const transactions = useSelector(selectTransactions);
  const balance = useSelector(selectBalance);
  const filteredTransactions = useSelector(selectFilteredTransactions);
  const budgets = useSelector(selectBudgets);

  const accountId = profile?.householdId || user?.uid;

  useEffect(() => {
    if (!accountId) return;
    const unsubscribe = subscribeToTransactions(accountId, (txs) => {
      dispatch(setTransactions(txs));
    });
    return unsubscribe;
  }, [accountId, dispatch]);

  const addTransaction = async (data) => {
    if (!user?.uid || !accountId) return { error: 'Not authenticated' };

    const { id, error } = await addTxService(accountId, user, data);
    if (error) return { error };

    const newTx = {
      id,
      ...data,
      userId: user.uid,
      householdId: accountId,
      createdByUid: user.uid,
      createdByName: user.displayName || user.email || 'Member',
      date: new Date(data.date),
    };
    dispatch(addTransactionLocal(newTx));

    // Send push notification for expense
    if (data.type === 'expense') {
      await sendTransactionNotification(newTx);

      // Check budget and warn if needed
      const now = new Date();
      await updateBudgetSpent(user.uid, data.categoryId, now.getFullYear(), now.getMonth() + 1, data.amount);

      // Find budget for this category and check warning threshold
      const budget = budgets.find(
        (b) => b.categoryId === data.categoryId &&
          b.year === now.getFullYear() &&
          b.month === now.getMonth() + 1
      );
      if (budget && budget.amount > 0) {
        const newSpent = (budget.spent || 0) + data.amount;
        if (newSpent / budget.amount >= 0.8) {
          await sendBudgetWarningNotification(data.category, newSpent, budget.amount);
        }
      }
    }

    return { id, error: null };
  };

  const deleteTransaction = async (txId) => {
    const { error } = await deleteTxService(txId);
    if (!error) dispatch(removeTransactionLocal(txId));
    return { error };
  };

  return { transactions, filteredTransactions, balance, addTransaction, deleteTransaction };
};
