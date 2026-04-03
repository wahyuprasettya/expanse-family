// ============================================================
// Firebase Authentication Service
// ============================================================
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import * as SecureStore from 'expo-secure-store';
import { getDeviceLanguage } from '@services/language';

const generateShareCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const isFirestoreTimestamp = (value) =>
  value &&
  typeof value === 'object' &&
  (
    typeof value.toDate === 'function' ||
    (typeof value.seconds === 'number' && typeof value.nanoseconds === 'number')
  );

const serializeFirestoreValue = (value) => {
  if (value == null) {
    return value;
  }

  if (isFirestoreTimestamp(value)) {
    const date = typeof value.toDate === 'function'
      ? value.toDate()
      : new Date((value.seconds * 1000) + Math.floor(value.nanoseconds / 1000000));

    return date.toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeFirestoreValue);
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, serializeFirestoreValue(nestedValue)])
    );
  }

  return value;
};

// ─── Register ────────────────────────────────────────────────
export const registerUser = async ({ email, password, displayName }) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const deviceLanguage = getDeviceLanguage();

    await updateProfile(user, { displayName });

    // Create user record in Firestore
    const shareCode = generateShareCode();
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email,
      displayName,
      createdAt: serverTimestamp(),
      currency: 'IDR',
      language: deviceLanguage,
      notificationsEnabled: true,
      biometricEnabled: false,
      pinEnabled: false,
      theme: 'system',
      shareCode,
      householdId: user.uid,
      householdRole: 'owner',
      householdOwnerUid: user.uid,
      householdName: displayName,
    });

    return { user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

// ─── Login ───────────────────────────────────────────────────
export const loginUser = async ({ email, password }) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

// ─── Logout ──────────────────────────────────────────────────
export const logoutUser = async () => {
  try {
    await signOut(auth);
    await SecureStore.deleteItemAsync('userPin');
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// ─── Password Reset ──────────────────────────────────────────
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// ─── Get User Profile ────────────────────────────────────────
export const getUserProfile = async (uid) => {
  try {
    const docSnap = await getDoc(doc(db, 'users', uid));
    if (docSnap.exists()) {
      return { profile: serializeFirestoreValue(docSnap.data()), error: null };
    }
    return { profile: null, error: 'User not found' };
  } catch (error) {
    return { profile: null, error: error.message };
  }
};

// ─── Auth State Listener ─────────────────────────────────────
export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// ─── PIN Management ──────────────────────────────────────────
export const savePin = async (pin) => {
  try {
    await SecureStore.setItemAsync('userPin', pin);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

export const verifyPin = async (pin) => {
  try {
    const savedPin = await SecureStore.getItemAsync('userPin');
    return { isValid: savedPin === pin, error: null };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
};

export const hasPin = async () => {
  try {
    const pin = await SecureStore.getItemAsync('userPin');
    return { hasPin: !!pin, error: null };
  } catch (error) {
    return { hasPin: false, error: error.message };
  }
};
