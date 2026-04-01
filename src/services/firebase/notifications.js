// ============================================================
// Push Notifications Service (FCM)
// ============================================================
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Register for Push Notifications ─────────────────────────
export const registerForPushNotifications = async (userId) => {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission denied');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
    });

    await Notifications.setNotificationChannelAsync('transactions', {
      name: 'Transactions',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250],
      lightColor: '#10B981',
    });

    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Bill Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#F59E0B',
    });
  }

  // Get Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-expo-project-id', // Replace with your Expo project ID
  });

  const token = tokenData.data;

  // Save token to Firestore
  if (userId && token) {
    await updateDoc(doc(db, 'users', userId), {
      expoPushToken: token,
      tokenUpdatedAt: new Date(),
    });
  }

  return token;
};

// ─── Send Local Notification ─────────────────────────────────
export const sendTransactionNotification = async (transaction) => {
  const icon = transaction.type === 'income' ? '💰' : '💸';
  const typeLabel = transaction.type === 'income' ? 'Income' : 'Expense';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${icon} New ${typeLabel} Added`,
      body: `${transaction.category}: ${formatCurrency(transaction.amount)}`,
      data: { transactionId: transaction.id, type: 'transaction' },
      sound: 'default',
    },
    trigger: null, // Immediate
  });
};

// ─── Send Budget Warning Notification ────────────────────────
export const sendBudgetWarningNotification = async (category, spent, budget) => {
  const percentage = Math.round((spent / budget) * 100);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⚠️ Budget Warning: ${category}`,
      body: `You've used ${percentage}% of your ${category} budget. Be careful!`,
      data: { type: 'budget_warning', category },
      sound: 'default',
    },
    trigger: null,
  });
};

// ─── Cancel All Notifications ────────────────────────────────
export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
