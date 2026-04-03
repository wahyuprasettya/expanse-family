// ============================================================
// useReminderSync Hook
// ============================================================
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { subscribeToReminders } from '@services/firebase/reminders';
import { setReminders } from '@store/reminderSlice';
import { selectUser } from '@store/authSlice';

export const useReminderSync = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  useEffect(() => {
    if (!user?.uid) return undefined;

    console.log('[useReminderSync] subscribe:start', { userId: user.uid });
    const unsubscribe = subscribeToReminders(user.uid, (reminders) => {
      console.log('[useReminderSync] subscribe:update', {
        userId: user.uid,
        count: reminders.length,
      });
      dispatch(setReminders(reminders));
    });

    return () => {
      console.log('[useReminderSync] subscribe:stop', { userId: user.uid });
      unsubscribe();
    };
  }, [dispatch, user?.uid]);
};

export default useReminderSync;
