// ============================================================
// useTransactionSync Hook
// ============================================================
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { subscribeToTransactions } from '@services/firebase/transactions';
import { setLoading, setTransactions } from '@store/transactionSlice';
import { selectProfile, selectUser } from '@store/authSlice';

export const useTransactionSync = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const accountId = profile?.householdId || user?.uid;

  useEffect(() => {
    if (!accountId) {
      dispatch(setTransactions([]));
      dispatch(setLoading(false));
      return undefined;
    }

    dispatch(setLoading(true));
    const unsubscribe = subscribeToTransactions(accountId, (txs) => {
      dispatch(setTransactions(txs));
      dispatch(setLoading(false));
    });

    return () => {
      unsubscribe();
    };
  }, [accountId, dispatch]);
};

export default useTransactionSync;
