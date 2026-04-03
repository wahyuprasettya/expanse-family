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

    const unsubscribe = subscribeToReminders(user.uid, (reminders) => {
      dispatch(setReminders(reminders));
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch, user?.uid]);
};

export default useReminderSync;
