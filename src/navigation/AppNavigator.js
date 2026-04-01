// ============================================================
// Root App Navigator
// ============================================================
import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { View, ActivityIndicator } from 'react-native';
import { selectIsAuthenticated, selectIsPinVerified, selectProfile } from '@store/authSlice';
import { selectTheme } from '@store/uiSlice';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import PinScreen from '@screens/auth/PinScreen';
import { useAppTheme } from '@hooks/useAppTheme';
import { useAuth } from '@hooks/useAuth';

export const AppNavigator = () => {
  const { isLoading } = useAuth();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isPinVerified = useSelector(selectIsPinVerified);
  const profile = useSelector(selectProfile);
  const theme = useSelector(selectTheme);
  const { colors } = useAppTheme();

  const navigationTheme = {
    ...(theme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.primary,
      notification: colors.primary,
    },
  };

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
    <NavigationContainer theme={navigationTheme}>
      <MainNavigator />
    </NavigationContainer>
  );
};

export default AppNavigator;
