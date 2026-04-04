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
import { serializeFirestoreValue } from '@utils/firestore';

const generateShareCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

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
    return { user: null, error: error.code || error.message || 'unknown' };
  }
};

// ─── Login ───────────────────────────────────────────────────
export const loginUser = async ({ email, password }) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.code || error.message || 'unknown' };
  }
};

// ─── Logout ──────────────────────────────────────────────────
export const logoutUser = async () => {
  try {
    await signOut(auth);
    await SecureStore.deleteItemAsync('userPin');
    return { error: null };
  } catch (error) {
    return { error: error.code || error.message || 'unknown' };
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
