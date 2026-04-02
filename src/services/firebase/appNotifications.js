// ============================================================
// Firestore App Notifications Service
// ============================================================
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from './config';

const APP_NOTIFICATIONS_COLLECTION = 'appNotifications';

export const logAppNotification = async ({
  userId,
  title,
  body,
  action,
  entityType,
  entityId = null,
  actorName = 'System',
  actorUid = null,
  metadata = {},
}) => {
  if (!userId) return { error: 'userId is required' };

  try {
    const docRef = await addDoc(collection(db, APP_NOTIFICATIONS_COLLECTION), {
      userId,
      title,
      body,
      action,
      entityType,
      entityId,
      actorName,
      actorUid,
      metadata,
      isRead: false,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, error: null };
  } catch (error) {
    return { id: null, error: error.message };
  }
};

export const subscribeToAppNotifications = (userId, callback) => {
  const q = query(
    collection(db, APP_NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((notifDoc) => ({
      id: notifDoc.id,
      ...notifDoc.data(),
      createdAt: notifDoc.data().createdAt?.toDate?.()?.toISOString?.() || null,
    }));

    callback(notifications);
  });
};

export const markAppNotificationAsRead = async (notificationId) => {
  try {
    await updateDoc(doc(db, APP_NOTIFICATIONS_COLLECTION, notificationId), {
      isRead: true,
    });
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

export const deleteAppNotification = async (notificationId) => {
  try {
    await deleteDoc(doc(db, APP_NOTIFICATIONS_COLLECTION, notificationId));
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};
