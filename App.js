// ============================================================
// App.js – Root Entry Point
// ============================================================
import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar, LogBox, Text, TextInput } from 'react-native';
import { Provider, useDispatch } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { PersistGate } from 'redux-persist/integration/react';
import * as Notifications from 'expo-notifications';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import { store, persistor } from './src/store';
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

// ─── Global Font Override ──────────────────────────────────────
// Ensures Poppins is used as the default font for ALL Text components
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [{ fontFamily: 'Poppins_400Regular' }, Text.defaultProps.style];
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.style = [{ fontFamily: 'Poppins_400Regular' }, TextInput.defaultProps.style];

const AppContent = () => {
  const dispatch = useDispatch();
  const { colors, isDark } = useAppTheme();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    // Handle notification responses (when user taps a notification)
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
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
      {fontsLoaded ? <AppNavigator /> : null}
    </>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <SafeAreaProvider>
            <AppContent />
            <Toast />
          </SafeAreaProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}
