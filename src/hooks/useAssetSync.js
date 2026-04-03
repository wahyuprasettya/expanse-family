// ============================================================
// useAssetSync Hook
// ============================================================
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser } from '@store/authSlice';
import { setAssets, setLoading } from '@store/assetSlice';
import { subscribeToAssets } from '@services/firebase/assets';

export const useAssetSync = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  useEffect(() => {
    if (!user?.uid) {
      dispatch(setAssets([]));
      dispatch(setLoading(false));
      return undefined;
    }

    dispatch(setLoading(true));
    const unsubscribe = subscribeToAssets(user.uid, (remoteAssets) => {
      dispatch(setAssets(remoteAssets));
      dispatch(setLoading(false));
    });

    return unsubscribe;
  }, [dispatch, user?.uid]);
};

export default useAssetSync;
