// ============================================================
// Firestore User Document Service (profile updates)
// ============================================================
import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from './config';

const USERS_COLLECTION = 'users';
const generateShareCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

/**
 * Update any field(s) on the user document
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

/**
 * Update user currency preference
 */
export const updateCurrency = (userId, currency) =>
  updateUserProfile(userId, { currency });

/**
 * Update user theme preference
 */
export const updateThemePreference = (userId, theme) =>
  updateUserProfile(userId, { theme });

export const ensureHouseholdProfile = async ({ userId, profile, fallbackName }) => {
  try {
    const updates = {};

    if (!profile?.shareCode) {
      updates.shareCode = generateShareCode();
    }
    if (!profile?.householdId) {
      updates.householdId = userId;
    }
    if (!profile?.householdRole) {
      updates.householdRole = 'owner';
    }
    if (!profile?.householdOwnerUid) {
      updates.householdOwnerUid = userId;
    }
    if (!profile?.householdName) {
      updates.householdName = fallbackName || profile?.displayName || 'Keluarga Bersama';
    }

    if (Object.keys(updates).length === 0) {
      return { updates: null, error: null };
    }

    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    return { updates, error: null };
  } catch (error) {
    return { updates: null, error: error.message };
  }
};

export const getUserProfileByShareCode = async (shareCode) => {
  try {
    const normalizedCode = shareCode.trim().toUpperCase();
    const q = query(
      collection(db, USERS_COLLECTION),
      where('shareCode', '==', normalizedCode)
    );
    const snapshot = await getDocs(q);
    const userDoc = snapshot.docs[0];

    if (!userDoc) {
      return { profile: null, error: 'Kode pasangan tidak ditemukan.' };
    }

    return {
      profile: {
        id: userDoc.id,
        ...userDoc.data(),
      },
      error: null,
    };
  } catch (error) {
    return { profile: null, error: error.message };
  }
};

export const joinSharedHousehold = async ({ userId, ownerProfile }) => {
  try {
    const householdId = ownerProfile.householdId || ownerProfile.uid || ownerProfile.id;
    const householdOwnerUid = ownerProfile.householdOwnerUid || ownerProfile.uid || ownerProfile.id;
    const householdName = ownerProfile.householdName || ownerProfile.displayName || 'Keluarga Bersama';

    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      householdId,
      householdOwnerUid,
      householdRole: 'partner',
      householdName,
      linkedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      profileUpdates: {
        householdId,
        householdOwnerUid,
        householdRole: 'partner',
        householdName,
      },
      error: null,
    };
  } catch (error) {
    return { profileUpdates: null, error: error.message };
  }
};

/**
 * Toggle biometric login
 */
export const updateBiometricEnabled = (userId, enabled) =>
  updateUserProfile(userId, { biometricEnabled: enabled });

/**
 * Toggle PIN enabled flag
 */
export const updatePinEnabled = (userId, enabled) =>
  updateUserProfile(userId, { pinEnabled: enabled });

/**
 * Update FCM token
 */
export const updateFCMToken = (userId, token) =>
  updateUserProfile(userId, { expoPushToken: token, tokenUpdatedAt: new Date() });
