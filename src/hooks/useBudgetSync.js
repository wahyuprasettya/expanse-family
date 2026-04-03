// ============================================================
// useBudgetSync Hook
// ============================================================
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser } from '@store/authSlice';
import { setBudgets, setLoading } from '@store/budgetSlice';
import { subscribeToBudgets } from '@services/firebase/budgets';

export const useBudgetSync = (year, month) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  useEffect(() => {
    if (!user?.uid || !year || !month) {
      dispatch(setBudgets([]));
      dispatch(setLoading(false));
      return undefined;
    }

    dispatch(setLoading(true));
    const unsubscribe = subscribeToBudgets(user.uid, year, month, (data) => {
      dispatch(setBudgets(data));
      dispatch(setLoading(false));
    });

    return unsubscribe;
  }, [dispatch, month, user?.uid, year]);
};

export default useBudgetSync;
