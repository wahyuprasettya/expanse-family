// ============================================================
// useTransactionSync Hook
// ============================================================
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { subscribeToTransactions } from '@services/firebase/transactions';
import { setTransactions } from '@store/transactionSlice';
import { selectProfile, selectUser } from '@store/authSlice';

export const useTransactionSync = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const accountId = profile?.householdId || user?.uid;

  useEffect(() => {
    if (!accountId) {
      dispatch(setTransactions([]));
      return undefined;
    }

    const unsubscribe = subscribeToTransactions(accountId, (txs) => {
      dispatch(setTransactions(txs));
    });

    return () => {
      unsubscribe();
    };
  }, [accountId, dispatch]);
};

export default useTransactionSync;
