// ============================================================
// useAuth Hook
// ============================================================
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { subscribeToAuthChanges, logoutUser, getUserProfile } from '@services/firebase/auth';
import { setUser, setProfile, setLoading, logout, selectUser, selectIsAuthenticated, selectIsLoading } from '@store/authSlice';
import { setTheme } from '@store/uiSlice';
import { ensureHouseholdProfile } from '@services/firebase/users';
import { registerForPushNotifications } from '@services/firebase/notifications';

export const useAuth = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      dispatch(setUser(firebaseUser));
      if (firebaseUser) {
        const { profile } = await getUserProfile(firebaseUser.uid);
        const { updates } = await ensureHouseholdProfile({
          userId: firebaseUser.uid,
          profile,
          fallbackName: firebaseUser.displayName,
        });
        const mergedProfile = updates ? { ...profile, ...updates } : profile;

        dispatch(setProfile(mergedProfile));
        dispatch(setTheme(mergedProfile?.theme || 'dark'));
        // Register push notifications
        await registerForPushNotifications(firebaseUser.uid);
      } else {
        dispatch(setProfile(null));
        dispatch(setTheme('dark'));
      }
    });

    return unsubscribe;
  }, [dispatch]);

  const handleLogout = async () => {
    const { error } = await logoutUser();
    if (!error) {
      dispatch(logout());
    }
    return { error };
  };

  return { user, isAuthenticated, isLoading, logout: handleLogout };
};
