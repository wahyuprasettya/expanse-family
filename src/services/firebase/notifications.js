// ============================================================
// Push Notifications Service (FCM)
// ============================================================
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { doc, setDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from './config';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const NOTIFICATION_CHANNELS = {
  default: 'default',
  transactions: 'transactions',
  reminders: 'reminders',
};

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
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.default, {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
    });

    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.transactions, {
      name: 'Transactions',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250],
      lightColor: '#10B981',
    });

    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.reminders, {
      name: 'Bill Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#F59E0B',
    });
  }

  // Get Expo push token
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn('Expo projectId is missing; cannot fetch Expo push token');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  const token = tokenData.data;

  // Save token to Firestore
  if (userId && token) {
    await setDoc(doc(db, 'users', userId), {
      expoPushToken: token,
      tokenUpdatedAt: new Date(),
    }, { merge: true });
  }

  return token;
};

// ─── Send Local Notification ─────────────────────────────────
export const sendTransactionNotification = async (transaction) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: transaction.title,
      body: transaction.body,
      data: { transactionId: transaction.id, type: 'transaction' },
      sound: 'default',
    },
    trigger: null,
  });
};

export const sendPushNotificationToUser = async (userId, notification) => {
  if (!userId) {
    return;
  }

  try {
    const userSnapshot = await getDoc(doc(db, 'users', userId));
    if (!userSnapshot.exists()) {
      return;
    }

    const userData = userSnapshot.data();
    if (!userData?.expoPushToken) {
      return;
    }

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: userData.expoPushToken,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: 'default',
        channelId: notification.channelId || NOTIFICATION_CHANNELS.default,
        priority: 'default',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Failed to send direct push notification:', errorData);
    } else {
      await response.json();
    }
  } catch (error) {
    console.error('Error sending direct push notification:', error);
  }
};

// ─── Send Budget Warning Notification ────────────────────────
export const sendBudgetWarningNotification = async (category) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: category.title,
      body: category.body,
      data: { type: 'budget_warning', category: category.name },
      sound: 'default',
    },
    trigger: null,
  });
};

// ─── Get Household Members ──────────────────────────────────
export const getHouseholdMembers = async (householdId) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('householdId', '==', householdId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting household members:', error);
    return [];
  }
};

// ─── Send Push Notification to Household Members ────────────
export const sendHouseholdNotification = async (householdId, senderUid, notification, options = {}) => {
  try {
    const members = await getHouseholdMembers(householdId);
    const excludedUserIds = new Set([
      senderUid,
      ...(Array.isArray(options.excludeUserIds) ? options.excludeUserIds : []),
    ].filter(Boolean));

    // Filter out the sender and any explicitly excluded users.
    const recipients = members.filter(
      (member) => !excludedUserIds.has(member.uid) && member.expoPushToken
    );

    if (recipients.length === 0) {
      return;
    }

    // Send push notifications to all recipients via Expo
    const messages = recipients.map(member => ({
      to: member.expoPushToken,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      sound: 'default',
      channelId: notification.channelId || NOTIFICATION_CHANNELS.transactions,
      priority: 'default',
    }));

    // Send to Expo push notification service
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Failed to send push notifications:', errorData);
    } else {
      await response.json();
    }

  } catch (error) {
    console.error('Error sending household notification:', error);
  }
};
