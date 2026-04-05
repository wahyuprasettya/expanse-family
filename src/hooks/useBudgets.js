// ============================================================
// useBudgets Hook
// ============================================================
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectProfile, selectUser } from '@store/authSlice';
import { setBudgets, addBudgetLocal, removeBudgetLocal, selectBudgets } from '@store/budgetSlice';
import { subscribeToBudgets, addBudget as addBudgetService, deleteBudget as deleteBudgetService } from '@services/firebase/budgets';

export const useBudgets = (year, month) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const budgets = useSelector(selectBudgets);
  const accountId = profile?.householdId || user?.uid;

  useEffect(() => {
    if (!accountId || !year || !month) return;
    const unsubscribe = subscribeToBudgets(accountId, year, month, (data) => {
      dispatch(setBudgets(data));
    });
    return unsubscribe;
  }, [accountId, year, month, dispatch]);

  const addBudget = async (data) => {
    if (!accountId) return { error: 'Not authenticated' };
    const { id, error } = await addBudgetService(accountId, data);
    if (!error && id) dispatch(addBudgetLocal({ id, ...data }));
    return { id, error };
  };

  const deleteBudget = async (budgetId) => {
    const { error } = await deleteBudgetService(budgetId);
    if (!error) dispatch(removeBudgetLocal(budgetId));
    return { error };
  };

  return { budgets, addBudget, deleteBudget };
};
