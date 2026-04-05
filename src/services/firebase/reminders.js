// ============================================================
// Firestore Reminders (Bill Schedules) Service
// ============================================================
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, onSnapshot, serverTimestamp, getDocs, getDoc,
} from 'firebase/firestore';
import { db } from './config';
import { logAppNotification } from './appNotifications';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const REMINDERS_COLLECTION = 'reminders';
const REMINDER_CHANNEL_ID = 'reminders';

const serializeReminder = (docSnapshot) => {
  const data = docSnapshot.data();

  return {
    id: docSnapshot.id,
    ...data,
    dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
    createdAt: data.createdAt?.toDate?.().toISOString?.() || null,
    updatedAt: data.updatedAt?.toDate?.().toISOString?.() || null,
  };
};

const resolveReminderTriggerDate = (reminder) => {
  const dueDate = new Date(reminder.dueDate);
  if (Number.isNaN(dueDate.getTime())) return null;

  const triggerDate = new Date(dueDate);
  triggerDate.setDate(triggerDate.getDate() - (reminder.daysBefore || 1));
  triggerDate.setHours(9, 0, 0, 0);

  const now = new Date();
  if (dueDate <= now) {
    return null;
  }

  if (triggerDate <= now) {
    const fallbackTrigger = new Date(now.getTime() + 60 * 1000);
    fallbackTrigger.setSeconds(0, 0);
    return fallbackTrigger;
  }

  return triggerDate;
};

const cancelNotificationIfNeeded = async (notificationId) => {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('Failed to cancel scheduled notification:', error.message);
  }
};

// ─── Schedule Notification ───────────────────────────────────
export const scheduleReminderNotification = async (reminder, t) => {
  const triggerDate = resolveReminderTriggerDate(reminder);

  const isDebtReminder = reminder.reminderType === 'debt';
  const title = isDebtReminder
    ? t('reminderNotification.debtTitle')
    : t('reminderNotification.billTitle');
  const body = isDebtReminder
    ? t('reminderNotification.debtBody', {
        name: reminder.name,
        days: reminder.daysBefore || 1,
        amount: reminder.amount,
      })
    : t('reminderNotification.billBody', {
        name: reminder.name,
        days: reminder.daysBefore || 1,
        amount: reminder.amount,
      });

  if (triggerDate) {
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          reminderId: reminder.id,
          type: reminder.reminderType || 'bill',
          linkedDebtId: reminder.linkedDebtId || null,
          transactionId: reminder.linkedTransactionId || null,
          entityType: reminder.linkedDebtId
            ? 'debt'
            : reminder.linkedTransactionId
              ? 'transaction'
              : reminder.reminderType || 'bill',
          entityId: reminder.linkedDebtId || reminder.linkedTransactionId || reminder.id,
        },
      },
      trigger: Platform.OS === 'android'
        ? { date: triggerDate, channelId: REMINDER_CHANNEL_ID }
        : { date: triggerDate },
    });
    return notifId;
  }
  return null;
};

// ─── Add Reminder ────────────────────────────────────────────
export const addReminder = async (userId, reminderData, t = (key, params) => key) => {
  try {
    const docRef = await addDoc(collection(db, REMINDERS_COLLECTION), {
      userId,
      name: reminderData.name,
      amount: reminderData.amount,
      category: reminderData.category,
      dueDate: reminderData.dueDate,
      recurringDay: reminderData.recurringDay, // day of month 1-31
      isRecurring: reminderData.isRecurring ?? true,
      daysBefore: reminderData.daysBefore ?? 1,
      linkedTransactionId: reminderData.linkedTransactionId || null,
      linkedDebtId: reminderData.linkedDebtId || null,
      reminderType: reminderData.reminderType || 'bill',
      isActive: true,
      notificationId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Schedule notification
    const notifId = await scheduleReminderNotification({
      ...reminderData,
      id: docRef.id,
    }, t);

    if (notifId) {
      await updateDoc(docRef, { notificationId: notifId });
    }

    await logAppNotification({
      userId,
      title: 'Reminder baru ditambahkan',
      body: `${reminderData.name} sudah dijadwalkan`,
      action: 'insert',
      entityType: 'reminder',
      entityId: docRef.id,
      actorName: 'Member',
      metadata: { reminderType: reminderData.reminderType || 'bill' },
    });

    return { id: docRef.id, error: null };
  } catch (error) {
    return { id: null, error: error.message };
  }
};

// ─── Update Reminder ─────────────────────────────────────────
export const updateReminder = async (reminderId, updates, t = (key, params) => key) => {
  try {
    const ref = doc(db, REMINDERS_COLLECTION, reminderId);
    const beforeSnap = await getDoc(ref);
    const previous = beforeSnap.exists() ? beforeSnap.data() : null;

    if (previous?.notificationId) {
      await cancelNotificationIfNeeded(previous.notificationId);
    }

    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    const nextReminder = {
      id: reminderId,
      ...(previous || {}),
      ...updates,
    };

    if (nextReminder.isActive !== false) {
      const notifId = await scheduleReminderNotification(nextReminder, t);
      if (notifId) {
        await updateDoc(ref, { notificationId: notifId });
      }
    }

    await logAppNotification({
      userId: nextReminder.userId || previous?.userId,
      title: 'Reminder diperbarui',
      body: `${nextReminder.name || previous?.name || 'Reminder'} telah diubah`,
      action: 'update',
      entityType: 'reminder',
      entityId: reminderId,
      actorName: 'Member',
      metadata: { reminderType: nextReminder.reminderType || previous?.reminderType || 'bill' },
    });
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// ─── Delete Reminder ─────────────────────────────────────────
export const deleteReminder = async (reminderId, notificationId) => {
  try {
    const ref = doc(db, REMINDERS_COLLECTION, reminderId);
    const beforeSnap = await getDoc(ref);
    const previous = beforeSnap.exists() ? beforeSnap.data() : null;
    await deleteDoc(ref);
    await cancelNotificationIfNeeded(notificationId);
    if (previous?.userId) {
      await logAppNotification({
        userId: previous.userId,
        title: 'Reminder dihapus',
        body: `${previous.name || 'Reminder'} telah dihapus`,
        action: 'delete',
        entityType: 'reminder',
        entityId: reminderId,
        actorName: 'Member',
        metadata: { reminderType: previous.reminderType || 'bill' },
      });
    }
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

export const deleteRemindersByTransactionId = async (linkedTransactionId) => {
  try {
    const q = query(
      collection(db, REMINDERS_COLLECTION),
      where('linkedTransactionId', '==', linkedTransactionId)
    );
    const snapshot = await getDocs(q);

    await Promise.all(snapshot.docs.map(async (reminderDoc) => {
      const reminder = reminderDoc.data();
      if (reminder.notificationId) {
        await cancelNotificationIfNeeded(reminder.notificationId);
      }
      if (reminder.userId) {
        await logAppNotification({
          userId: reminder.userId,
          title: 'Reminder dihapus',
          body: `${reminder.name || 'Reminder'} dihapus karena transaksi hutang dihapus`,
          action: 'delete',
          entityType: 'reminder',
          entityId: reminderDoc.id,
          actorName: 'Member',
          metadata: { reminderType: reminder.reminderType || 'debt' },
        });
      }
      await deleteDoc(reminderDoc.ref);
    }));

    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

export const deleteRemindersByDebtId = async (linkedDebtId) => {
  try {
    const q = query(
      collection(db, REMINDERS_COLLECTION),
      where('linkedDebtId', '==', linkedDebtId)
    );
    const snapshot = await getDocs(q);

    await Promise.all(snapshot.docs.map(async (reminderDoc) => {
      const reminder = reminderDoc.data();
      if (reminder.notificationId) {
        await cancelNotificationIfNeeded(reminder.notificationId);
      }
      if (reminder.userId) {
        await logAppNotification({
          userId: reminder.userId,
          title: 'Reminder dihapus',
          body: `${reminder.name || 'Reminder'} dihapus karena catatan hutang berubah`,
          action: 'delete',
          entityType: 'reminder',
          entityId: reminderDoc.id,
          actorName: 'Member',
          metadata: { reminderType: reminder.reminderType || 'debt' },
        });
      }
      await deleteDoc(reminderDoc.ref);
    }));

    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// ─── Subscribe to Reminders ──────────────────────────────────
export const subscribeToReminders = (userId, callback) => {
  const q = query(
    collection(db, REMINDERS_COLLECTION),
    where('userId', '==', userId),
    where('isActive', '==', true)
  );

  return onSnapshot(q, (snapshot) => {
    const reminders = snapshot.docs.map(serializeReminder);
    callback(reminders);
  });
};

export const syncDebtReminder = async ({
  transactionId,
  debtId,
  userId,
  creditorName,
  category,
  amount,
  dueDate,
  remindDaysBefore = 3,
  isActive = true,
}, t = (key, params) => key) => {
  const q = query(
    collection(db, REMINDERS_COLLECTION),
    where(debtId ? 'linkedDebtId' : 'linkedTransactionId', '==', debtId || transactionId),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  const existing = snapshot.docs[0];
  const payload = {
    name: t('reminders.debtReminderName', { name: creditorName || category }),
    amount,
    category: t('reminders.debtPaymentCategory'),
    dueDate,
    daysBefore: remindDaysBefore,
    isRecurring: false,
    linkedTransactionId: transactionId || null,
    linkedDebtId: debtId || null,
    reminderType: 'debt',
    isActive,
    userId,
  };

  if (!existing) {
    return addReminder(userId, payload, t);
  }

  return updateReminder(existing.id, payload, t);
};
