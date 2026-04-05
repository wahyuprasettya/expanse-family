// ============================================================
// useDebtSync Hook
// ============================================================
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectProfile, selectUser } from '@store/authSlice';
import { setDebts, setLoading } from '@store/debtSlice';
import { subscribeToDebts } from '@services/firebase/debts';

export const useDebtSync = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const accountId = profile?.householdId || user?.uid;

  useEffect(() => {
    if (!accountId) {
      dispatch(setDebts([]));
      dispatch(setLoading(false));
      return undefined;
    }

    dispatch(setLoading(true));
    const unsubscribe = subscribeToDebts(accountId, (debts) => {
      dispatch(setDebts(debts));
      dispatch(setLoading(false));
    });

    return unsubscribe;
  }, [accountId, dispatch]);
};

export default useDebtSync;
