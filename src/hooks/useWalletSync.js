// ============================================================
// useWalletSync Hook
// ============================================================
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectProfile, selectUser } from '@store/authSlice';
import { setLoading, setWallets } from '@store/walletSlice';
import { subscribeToWallets } from '@services/firebase/wallets';

export const useWalletSync = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const accountId = profile?.householdId || user?.uid;

  useEffect(() => {
    if (!accountId) {
      dispatch(setWallets([]));
      dispatch(setLoading(false));
      return undefined;
    }

    dispatch(setLoading(true));
    const unsubscribe = subscribeToWallets(accountId, (wallets) => {
      dispatch(setWallets(wallets));
      dispatch(setLoading(false));
    });

    return unsubscribe;
  }, [accountId, dispatch]);
};

export default useWalletSync;
