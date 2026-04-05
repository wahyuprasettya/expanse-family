// ============================================================
// useAssetSync Hook
// ============================================================
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectProfile, selectUser } from '@store/authSlice';
import { setAssets, setLoading } from '@store/assetSlice';
import { subscribeToAssets } from '@services/firebase/assets';

export const useAssetSync = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const accountId = profile?.householdId || user?.uid;

  useEffect(() => {
    if (!accountId) {
      dispatch(setAssets([]));
      dispatch(setLoading(false));
      return undefined;
    }

    dispatch(setLoading(true));
    const unsubscribe = subscribeToAssets(accountId, (remoteAssets) => {
      dispatch(setAssets(remoteAssets));
      dispatch(setLoading(false));
    });

    return unsubscribe;
  }, [accountId, dispatch]);
};

export default useAssetSync;
