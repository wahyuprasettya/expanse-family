// ============================================================
// Firestore Wallets Service
// ============================================================
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './config';
import { logAppNotification } from './appNotifications';
import { serializeFirestoreValue } from '@utils/firestore';

const WALLETS_COLLECTION = 'wallets';

export const addWallet = async (userId, walletData) => {
  try {
    const payload = {
      userId,
      name: walletData.name,
      balance: walletData.balance,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, WALLETS_COLLECTION), payload);

    await logAppNotification({
      userId,
      title: 'Wallet baru ditambahkan',
      body: `${walletData.name} berhasil dibuat`,
      action: 'insert',
      entityType: 'wallet',
      entityId: docRef.id,
      actorName: 'Member',
      metadata: { walletName: walletData.name },
    });

    return { id: docRef.id, error: null };
  } catch (error) {
    return { id: null, error: error.message };
  }
};

export const updateWallet = async (walletId, updates) => {
  try {
    const ref = doc(db, WALLETS_COLLECTION, walletId);
    const beforeSnap = await getDoc(ref);
    const previous = beforeSnap.exists() ? beforeSnap.data() : null;
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    if (previous?.userId) {
      await logAppNotification({
        userId: previous.userId,
        title: 'Wallet diperbarui',
        body: `${updates.name || previous.name || 'Wallet'} berhasil diperbarui`,
        action: 'update',
        entityType: 'wallet',
        entityId: walletId,
        actorName: 'Member',
        metadata: { walletName: updates.name || previous.name || null },
      });
    }

    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

export const deleteWallet = async (walletId) => {
  try {
    const ref = doc(db, WALLETS_COLLECTION, walletId);
    const beforeSnap = await getDoc(ref);
    const previous = beforeSnap.exists() ? beforeSnap.data() : null;
    await deleteDoc(ref);

    if (previous?.userId) {
      await logAppNotification({
        userId: previous.userId,
        title: 'Wallet dihapus',
        body: `${previous.name || 'Wallet'} telah dihapus`,
        action: 'delete',
        entityType: 'wallet',
        entityId: walletId,
        actorName: 'Member',
        metadata: { walletName: previous.name || null },
      });
    }

    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

export const adjustWalletBalance = async (walletId, amountDelta) => {
  if (!walletId || !amountDelta) {
    return { error: null };
  }

  try {
    await updateDoc(doc(db, WALLETS_COLLECTION, walletId), {
      balance: increment(amountDelta),
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

export const subscribeToWallets = (userId, callback) => {
  const q = query(
    collection(db, WALLETS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const wallets = snapshot.docs.map((walletDoc) => serializeFirestoreValue({
      id: walletDoc.id,
      ...walletDoc.data(),
    }));
    callback(wallets);
  });
};
