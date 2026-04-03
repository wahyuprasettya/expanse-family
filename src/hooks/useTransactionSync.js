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
      console.log('[useTransactionSync] subscribe:clear');
      dispatch(setTransactions([]));
      return undefined;
    }

    console.log('[useTransactionSync] subscribe:start', { accountId });
    const unsubscribe = subscribeToTransactions(accountId, (txs) => {
      console.log('[useTransactionSync] subscribe:update', {
        accountId,
        count: txs.length,
      });
      dispatch(setTransactions(txs));
    });

    return () => {
      console.log('[useTransactionSync] subscribe:stop', { accountId });
      unsubscribe();
    };
  }, [accountId, dispatch]);
};

export default useTransactionSync;
