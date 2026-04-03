// ============================================================
// useAppNotificationSync Hook
// ============================================================
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser } from '@store/authSlice';
import { setAppNotifications, setLoading } from '@store/appNotificationSlice';
import { subscribeToAppNotifications } from '@services/firebase/appNotifications';

export const useAppNotificationSync = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  useEffect(() => {
    if (!user?.uid) {
      dispatch(setAppNotifications([]));
      dispatch(setLoading(false));
      return undefined;
    }

    dispatch(setLoading(true));
    const unsubscribe = subscribeToAppNotifications(user.uid, (items) => {
      dispatch(setAppNotifications(items));
      dispatch(setLoading(false));
    });

    return unsubscribe;
  }, [dispatch, user?.uid]);
};

export default useAppNotificationSync;
