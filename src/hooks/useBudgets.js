// ============================================================
// useBudgets Hook
// ============================================================
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser } from '@store/authSlice';
import { setBudgets, addBudgetLocal, removeBudgetLocal, selectBudgets } from '@store/budgetSlice';
import { subscribeToBudgets, addBudget as addBudgetService, deleteBudget as deleteBudgetService } from '@services/firebase/budgets';

export const useBudgets = (year, month) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const budgets = useSelector(selectBudgets);

  useEffect(() => {
    if (!user?.uid || !year || !month) return;
    const unsubscribe = subscribeToBudgets(user.uid, year, month, (data) => {
      dispatch(setBudgets(data));
    });
    return unsubscribe;
  }, [user?.uid, year, month, dispatch]);

  const addBudget = async (data) => {
    if (!user?.uid) return { error: 'Not authenticated' };
    const { id, error } = await addBudgetService(user.uid, data);
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
