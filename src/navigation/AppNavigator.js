// ============================================================
// Root App Navigator
// ============================================================
import React, { useEffect, useRef } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { View, ActivityIndicator } from 'react-native';
import * as Notifications from 'expo-notifications';
import { selectIsAuthenticated, selectIsPinVerified, selectProfile } from '@store/authSlice';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import PinScreen from '@screens/auth/PinScreen';
import { useAppTheme } from '@hooks/useAppTheme';
import { useAuth } from '@hooks/useAuth';
import { useTransactionSync } from '@hooks/useTransactionSync';
import { useCategorySync } from '@hooks/useCategorySync';
import { useReminderSync } from '@hooks/useReminderSync';
import { useBudgetSync } from '@hooks/useBudgetSync';
import { useAssetSync } from '@hooks/useAssetSync';
import { useAppNotificationSync } from '@hooks/useAppNotificationSync';
import { useLegacyCleanup } from '@hooks/useLegacyCleanup';
import { flushPendingNotificationNavigation, navigateToNotificationTarget, navigationRef } from './notificationNavigation';

export const AppNavigator = () => {
  const { isLoading } = useAuth();
  const handledNotificationIdsRef = useRef(new Set());
  const now = new Date();
  useTransactionSync();
  useCategorySync();
  useReminderSync();
  useBudgetSync(now.getFullYear(), now.getMonth() + 1);
  useAssetSync();
  useAppNotificationSync();
  useLegacyCleanup();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isPinVerified = useSelector(selectIsPinVerified);
  const profile = useSelector(selectProfile);
  const { colors, isDark } = useAppTheme();

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.primary,
      notification: colors.primary,
    },
  };

  useEffect(() => {
    let isMounted = true;

    const handleNotificationResponse = async (response) => {
      if (!response || !isMounted) return;

      const requestId = response?.notification?.request?.identifier;
      if (requestId && handledNotificationIdsRef.current.has(requestId)) {
        return;
      }

      navigateToNotificationTarget(response?.notification?.request?.content?.data || {});

      if (requestId) {
        handledNotificationIdsRef.current.add(requestId);
      }

      if (typeof Notifications.clearLastNotificationResponseAsync === 'function') {
        await Notifications.clearLastNotificationResponseAsync();
      }
    };

    Notifications.getLastNotificationResponseAsync()
      .then(handleNotificationResponse)
      .catch(() => {});

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // If not authenticated → Auth flow
  if (!isAuthenticated) {
    return (
      <NavigationContainer theme={navigationTheme}>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  // If authenticated but PIN exists and not verified → PIN screen
  if (isAuthenticated && !isPinVerified && profile?.pinEnabled) {
    return <PinScreen mode="verify" />;
  }

  // Main app
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onReady={flushPendingNotificationNavigation}
    >
      <MainNavigator />
    </NavigationContainer>
  );
};

export default AppNavigator;
