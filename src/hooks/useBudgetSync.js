// ============================================================
// useBudgetSync Hook
// ============================================================
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectProfile, selectUser } from '@store/authSlice';
import { setBudgets, setLoading } from '@store/budgetSlice';
import { ensureMonthlyBudgets, subscribeToBudgets } from '@services/firebase/budgets';

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

    let unsubscribe = () => {};
    let isCancelled = false;

    const syncBudgets = async () => {
      dispatch(setLoading(true));

      const ensureResult = await ensureMonthlyBudgets(accountId, year, month);
      if (ensureResult.error) {
        console.warn('Failed to prepare monthly budgets:', ensureResult.error);
      }

      if (isCancelled) {
        dispatch(setLoading(false));
        return;
      }

      unsubscribe = subscribeToBudgets(accountId, year, month, (data) => {
        dispatch(setBudgets(data));
        dispatch(setLoading(false));
      });
    };

    syncBudgets().catch((error) => {
      console.warn('Budget sync failed:', error);
      dispatch(setLoading(false));
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [accountId, dispatch, month, year]);
};

export default useBudgetSync;
