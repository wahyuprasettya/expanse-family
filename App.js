// ============================================================
// App.js – Root Entry Point
// ============================================================
import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { Provider, useDispatch } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { getLanguagePreference } from './src/services/language';
import { setLanguage } from './src/store/uiSlice';
import { useAppTheme } from './src/hooks/useAppTheme';

// Suppress non-critical warnings during development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
]);

// ─── Notification Handler ─────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const AppContent = () => {
  const dispatch = useDispatch();
  const { colors, isDark } = useAppTheme();

  useEffect(() => {
    // Handle notification responses (when user taps a notification)
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped:', data);
      // Navigate based on data.type if needed
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const hydrateLanguage = async () => {
      const language = await getLanguagePreference();
      dispatch(setLanguage(language));
    };

    hydrateLanguage();
  }, [dispatch]);

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent={false}
      />
      <AppNavigator />
    </>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <SafeAreaProvider>
          <AppContent />
          <Toast />
        </SafeAreaProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
