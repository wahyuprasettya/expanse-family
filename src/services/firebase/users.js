// ============================================================
// Firestore User Document Service (profile updates)
// ============================================================
import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from './config';

const USERS_COLLECTION = 'users';
const TRANSACTIONS_COLLECTION = 'transactions';
const WALLETS_COLLECTION = 'wallets';
const MAX_BATCH_SIZE = 450;
const generateShareCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const commitDocumentBatches = async (items, mutateItem) => {
  for (let startIndex = 0; startIndex < items.length; startIndex += MAX_BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = items.slice(startIndex, startIndex + MAX_BATCH_SIZE);

    chunk.forEach((item) => mutateItem(batch, item));
    await batch.commit();
  }
};

const buildPersonalHouseholdProfile = (memberUid, memberData = {}) => ({
  householdId: memberUid,
  householdOwnerUid: memberUid,
  householdRole: 'owner',
  householdName: memberData.displayName || memberData.email || 'Akun Pribadi',
  linkedAt: null,
  disconnectedAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

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

export const getHouseholdMembers = async (householdId) => {
  try {
    if (!householdId) {
      return { members: [], error: null };
    }

    const q = query(
      collection(db, USERS_COLLECTION),
      where('householdId', '==', householdId)
    );
    const snapshot = await getDocs(q);
    const members = snapshot.docs.map((memberDoc) => {
      const data = memberDoc.data();

      return {
        uid: memberDoc.id,
        displayName: data.displayName || data.email || 'Pengguna',
        email: data.email || '',
        householdRole: data.householdRole || 'partner',
      };
    });

    members.sort((a, b) => {
      if (a.householdRole === 'owner' && b.householdRole !== 'owner') return -1;
      if (a.householdRole !== 'owner' && b.householdRole === 'owner') return 1;
      return a.displayName.localeCompare(b.displayName);
    });

    return { members, error: null };
  } catch (error) {
    return { members: [], error: error.message };
  }
};

export const disconnectSharedHousehold = async ({ userId, profile }) => {
  try {
    const currentHouseholdId = profile?.householdId || userId;
    const currentRole = profile?.householdRole || (currentHouseholdId === userId ? 'owner' : 'partner');

    if (!userId || !currentHouseholdId) {
      return {
        detachedCount: 0,
        movedTransactionCount: 0,
        movedWalletCount: 0,
        selfProfileUpdates: null,
        error: 'User is not authenticated.',
      };
    }

    const membersSnapshot = await getDocs(
      query(collection(db, USERS_COLLECTION), where('householdId', '==', currentHouseholdId))
    );

    const detachedMemberDocs = currentRole === 'partner'
      ? membersSnapshot.docs.filter((memberDoc) => memberDoc.id === userId)
      : membersSnapshot.docs.filter((memberDoc) => memberDoc.id !== userId);

    if (detachedMemberDocs.length === 0) {
      return {
        detachedCount: 0,
        movedTransactionCount: 0,
        movedWalletCount: 0,
        selfProfileUpdates: null,
        error: null,
      };
    }

    const detachedMemberIds = new Set(detachedMemberDocs.map((memberDoc) => memberDoc.id));

    const transactionsSnapshot = await getDocs(
      query(collection(db, TRANSACTIONS_COLLECTION), where('householdId', '==', currentHouseholdId))
    );
    const transactionsToMove = transactionsSnapshot.docs
      .map((transactionDoc) => {
        const transactionData = transactionDoc.data();
        const targetUid = detachedMemberIds.has(transactionData.createdByUid)
          ? transactionData.createdByUid
          : detachedMemberIds.has(transactionData.userId)
            ? transactionData.userId
            : null;

        return targetUid
          ? { transactionDoc, targetUid }
          : null;
      })
      .filter(Boolean);

    if (transactionsToMove.length > 0) {
      await commitDocumentBatches(transactionsToMove, (batch, item) => {
        batch.update(item.transactionDoc.ref, {
          householdId: item.targetUid,
          updatedAt: serverTimestamp(),
        });
      });
    }

    const sharedWalletsSnapshot = await getDocs(
      query(collection(db, WALLETS_COLLECTION), where('userId', '==', currentHouseholdId))
    );
    const walletsToMove = sharedWalletsSnapshot.docs
      .map((walletDoc) => {
        const walletData = walletDoc.data();
        const targetUid = detachedMemberIds.has(walletData.ownerUid) ? walletData.ownerUid : null;

        return targetUid
          ? { walletDoc, targetUid }
          : null;
      })
      .filter(Boolean);

    if (walletsToMove.length > 0) {
      await commitDocumentBatches(walletsToMove, (batch, item) => {
        batch.update(item.walletDoc.ref, {
          userId: item.targetUid,
          householdId: item.targetUid,
          updatedAt: serverTimestamp(),
        });
      });
    }

    await commitDocumentBatches(detachedMemberDocs, (batch, memberDoc) => {
      batch.update(memberDoc.ref, buildPersonalHouseholdProfile(memberDoc.id, memberDoc.data()));
    });

    const selfDoc = detachedMemberDocs.find((memberDoc) => memberDoc.id === userId);
    const selfProfileUpdates = selfDoc
      ? {
          householdId: userId,
          householdOwnerUid: userId,
          householdRole: 'owner',
          householdName: selfDoc.data().displayName || selfDoc.data().email || profile?.householdName || 'Akun Pribadi',
          linkedAt: null,
        }
      : null;

    return {
      detachedCount: detachedMemberDocs.length,
      movedTransactionCount: transactionsToMove.length,
      movedWalletCount: walletsToMove.length,
      selfProfileUpdates,
      error: null,
    };
  } catch (error) {
    return {
      detachedCount: 0,
      movedTransactionCount: 0,
      movedWalletCount: 0,
      selfProfileUpdates: null,
      error: error.message,
    };
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
