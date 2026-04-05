// ============================================================
// useBudgetSync Hook
// ============================================================
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectProfile, selectUser } from '@store/authSlice';
import { setBudgets, setLoading } from '@store/budgetSlice';
import { subscribeToBudgets } from '@services/firebase/budgets';

export const useBudgetSync = (year, month) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const accountId = profile?.householdId || user?.uid;

  useEffect(() => {
    if (!accountId || !year || !month) {
      dispatch(setBudgets([]));
      dispatch(setLoading(false));
      return undefined;
    }

    dispatch(setLoading(true));
    const unsubscribe = subscribeToBudgets(accountId, year, month, (data) => {
      dispatch(setBudgets(data));
      dispatch(setLoading(false));
    });

    return unsubscribe;
  }, [accountId, dispatch, month, year]);
};

export default useBudgetSync;
