// ============================================================
// Firestore Assets Service
// ============================================================
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { getDoc } from 'firebase/firestore';
import { logAppNotification } from './appNotifications';

const ASSETS_COLLECTION = 'assets';

export const addAsset = async (userId, assetData) => {
  try {
    const docRef = await addDoc(collection(db, ASSETS_COLLECTION), {
      userId,
      ...assetData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await logAppNotification({
      userId,
      title: 'Aset baru ditambahkan',
      body: `Aset ${assetData.name} berhasil ditambahkan`,
      action: 'insert',
      entityType: 'asset',
      entityId: docRef.id,
      actorName: 'Member',
      metadata: { assetName: assetData.name, assetType: assetData.type },
    });

    return { id: docRef.id, error: null };
  } catch (error) {
    return { id: null, error: error.message };
  }
};

export const removeAsset = async (assetId) => {
  try {
    const ref = doc(db, ASSETS_COLLECTION, assetId);
    const beforeSnap = await getDoc(ref);
    const previous = beforeSnap.exists() ? beforeSnap.data() : null;
    await deleteDoc(ref);
    if (previous?.userId) {
      await logAppNotification({
        userId: previous.userId,
        title: 'Aset dihapus',
        body: `Aset ${previous.name || 'item'} telah dihapus`,
        action: 'delete',
        entityType: 'asset',
        entityId: assetId,
        actorName: 'Member',
        metadata: { assetName: previous.name, assetType: previous.type },
      });
    }
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

export const subscribeToAssets = (userId, callback) => {
  const q = query(
    collection(db, ASSETS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const assets = snapshot.docs.map((assetDoc) => ({
      id: assetDoc.id,
      ...assetDoc.data(),
      createdAt: assetDoc.data().createdAt?.toDate?.()?.toISOString?.() || null,
      updatedAt: assetDoc.data().updatedAt?.toDate?.()?.toISOString?.() || null,
    }));

    callback(assets);
  });
};
