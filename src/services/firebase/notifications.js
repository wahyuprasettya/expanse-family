// ============================================================
// Push Notifications Service (FCM)
// ============================================================
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { doc, setDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from './config';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { logAppNotification } from './appNotifications';

const NOTIFICATION_CHANNELS = {
  default: 'default',
  transactions: 'transactions',
  reminders: 'reminders',
};

const resolveExpoProjectId = () =>
  Constants.expoConfig?.extra?.eas?.projectId ||
  Constants.easConfig?.projectId ||
  null;

const inspectExpoPushResponse = async (response, contextLabel) => {
  if (!response.ok) {
    const errorData = await response.text();
    console.error(`Failed to send ${contextLabel}:`, errorData);
    return { ok: false, errors: [errorData] };
  }

  const payload = await response.json();
  const tickets = Array.isArray(payload?.data) ? payload.data : payload?.data ? [payload.data] : [];
  const ticketErrors = tickets
    .filter((ticket) => ticket?.status === 'error')
    .map((ticket) => ticket?.message || ticket?.details?.error || 'Unknown Expo push error');

  if (ticketErrors.length > 0) {
    console.error(`Expo push ticket errors for ${contextLabel}:`, ticketErrors, payload);
    return { ok: false, errors: ticketErrors, payload };
  }

  return { ok: true, errors: [], payload };
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
  const projectId = resolveExpoProjectId();

  if (!projectId) {
    console.warn('Expo projectId is missing; cannot fetch Expo push token');
    return null;
  }

  let token = null;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    token = tokenData.data;
  } catch (error) {
    console.error('Failed to fetch Expo push token:', error);
    return null;
  }

  // Save token to Firestore
  if (userId && token) {
    await setDoc(doc(db, 'users', userId), {
      expoPushToken: token,
      tokenUpdatedAt: new Date(),
    }, { merge: true });
  }

  return token;
};

export const getStoredPushToken = async (userId) => {
  if (!userId) {
    return { token: null, error: 'userId is required' };
  }

  try {
    const userSnapshot = await getDoc(doc(db, 'users', userId));
    if (!userSnapshot.exists()) {
      return { token: null, error: 'User not found' };
    }

    return {
      token: userSnapshot.data()?.expoPushToken || null,
      error: null,
    };
  } catch (error) {
    return { token: null, error: error.message };
  }
};

export const getPushDebugStatus = async (userId) => {
  const permission = await Notifications.getPermissionsAsync();
  const projectId = resolveExpoProjectId();
  const { token: storedToken, error: storedTokenError } = userId
    ? await getStoredPushToken(userId)
    : { token: null, error: 'userId is required' };

  let freshToken = null;
  let fetchError = null;

  if (!Device.isDevice) {
    fetchError = 'Push notifications only work on physical devices';
  } else if (permission.status !== 'granted') {
    fetchError = 'Push notification permission is not granted';
  } else if (!projectId) {
    fetchError = 'Expo projectId is missing';
  } else {
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      freshToken = tokenData.data;
    } catch (error) {
      fetchError = error.message;
    }
  }

  return {
    isDevice: Device.isDevice,
    platform: Platform.OS,
    permissionStatus: permission.status,
    projectId,
    storedToken,
    storedTokenError,
    freshToken,
    fetchError,
    matchesStoredToken: Boolean(freshToken && storedToken && freshToken === storedToken),
  };
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

export const sendPushNotificationToToken = async (token, notification) => {
  if (!token) {
    return { ok: false, errors: ['Expo push token is required'] };
  }

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: 'default',
        channelId: notification.channelId || NOTIFICATION_CHANNELS.default,
        priority: 'high',
      }),
    });

    return inspectExpoPushResponse(response, `direct push to token ${token.slice(0, 16)}...`);
  } catch (error) {
    console.error('Error sending direct push notification to token:', error);
    return { ok: false, errors: [error.message] };
  }
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
      console.warn('Push notification skipped because recipient has no Expo push token:', userId);
      return;
    }

    await sendPushNotificationToToken(userData.expoPushToken, notification);
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

const resolveNotificationEntityId = (notification = {}, options = {}) =>
  options.entityId ||
  notification?.data?.entityId ||
  notification?.data?.transactionId ||
  notification?.data?.reminderId ||
  notification?.data?.assetId ||
  notification?.data?.noteId ||
  null;

// ─── Send Push Notification to Household Members ────────────
export const sendHouseholdNotification = async (householdId, senderUid, notification, options = {}) => {
  try {
    const members = await getHouseholdMembers(householdId);
    const excludedUserIds = new Set([
      senderUid,
      ...(Array.isArray(options.excludeUserIds) ? options.excludeUserIds : []),
    ].filter(Boolean));

    const senderMember = members.find((member) => member.uid === senderUid);
    const actorName =
      options.actorName ||
      notification?.actorName ||
      senderMember?.displayName ||
      senderMember?.email ||
      'Member';

    // Filter out the sender and any explicitly excluded users.
    const recipients = members.filter(
      (member) => !excludedUserIds.has(member.uid)
    );

    if (recipients.length === 0) {
      return;
    }

    if (options.logToApp !== false) {
      await Promise.all(recipients.map((member) => logAppNotification({
        userId: member.uid,
        title: notification.title,
        body: notification.body,
        action: options.action || notification?.data?.action || 'broadcast',
        entityType: options.entityType || notification?.data?.type || 'household_activity',
        entityId: resolveNotificationEntityId(notification, options),
        actorName,
        actorUid: senderUid || null,
        metadata: {
          householdId,
          ...(notification?.data || {}),
          ...(options.metadata || {}),
        },
      })));
    }

    const pushRecipients = recipients.filter((member) => member.expoPushToken);

    if (pushRecipients.length === 0) {
      console.warn('Household push skipped because no recipients have Expo push tokens:', {
        householdId,
        senderUid,
        recipientCount: recipients.length,
      });
      return;
    }

    // Send push notifications to all recipients via Expo
    const messages = pushRecipients.map(member => ({
      to: member.expoPushToken,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      sound: 'default',
      channelId: notification.channelId || NOTIFICATION_CHANNELS.transactions,
      priority: 'high',
    }));

    // Send to Expo push notification service
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    await inspectExpoPushResponse(response, `household push for ${householdId}`);

  } catch (error) {
    console.error('Error sending household notification:', error);
  }
};
