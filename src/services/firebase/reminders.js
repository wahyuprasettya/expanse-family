// ============================================================
// Firestore Reminders (Bill Schedules) Service
// ============================================================
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import * as Notifications from 'expo-notifications';

const REMINDERS_COLLECTION = 'reminders';

// ─── Schedule Notification ───────────────────────────────────
const scheduleReminderNotification = async (reminder) => {
  const triggerDate = new Date(reminder.dueDate);
  triggerDate.setDate(triggerDate.getDate() - (reminder.daysBefore || 1));
  triggerDate.setHours(9, 0, 0, 0);

  if (triggerDate > new Date()) {
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💸 Bill Reminder',
        body: `${reminder.name} is due in ${reminder.daysBefore || 1} day(s)! Amount: ${reminder.amount}`,
        data: { reminderId: reminder.id },
      },
      trigger: { date: triggerDate },
    });
    return notifId;
  }
  return null;
};

// ─── Add Reminder ────────────────────────────────────────────
export const addReminder = async (userId, reminderData) => {
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
      isActive: true,
      notificationId: null,
      createdAt: serverTimestamp(),
    });

    // Schedule notification
    const notifId = await scheduleReminderNotification({
      ...reminderData,
      id: docRef.id,
    });

    if (notifId) {
      await updateDoc(docRef, { notificationId: notifId });
    }

    return { id: docRef.id, error: null };
  } catch (error) {
    return { id: null, error: error.message };
  }
};

// ─── Update Reminder ─────────────────────────────────────────
export const updateReminder = async (reminderId, updates) => {
  try {
    await updateDoc(doc(db, REMINDERS_COLLECTION, reminderId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// ─── Delete Reminder ─────────────────────────────────────────
export const deleteReminder = async (reminderId, notificationId) => {
  try {
    await deleteDoc(doc(db, REMINDERS_COLLECTION, reminderId));
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
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
    const reminders = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    callback(reminders);
  });
};
