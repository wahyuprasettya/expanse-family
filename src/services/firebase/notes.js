// ============================================================
// Firestore Notes Service
// ============================================================
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './config';
import { logAppNotification } from './appNotifications';

const NOTES_COLLECTION = 'notes';

const serializeNote = (noteDoc) => {
  const data = noteDoc.data();

  return {
    id: noteDoc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null,
  };
};

export const subscribeToNotes = (accountId, callback) => {
  const q = query(
    collection(db, NOTES_COLLECTION),
    where('accountId', '==', accountId),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(serializeNote));
  });
};

export const addNote = async ({ accountId, userId, authorName, title, description, status }) => {
  try {
    const docRef = await addDoc(collection(db, NOTES_COLLECTION), {
      accountId,
      userId,
      authorName,
      title,
      description: description || '',
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await logAppNotification({
      userId,
      title: 'Catatan baru ditambahkan',
      body: `${title} masuk ke papan catatan`,
      action: 'insert',
      entityType: 'note',
      entityId: docRef.id,
      actorName: authorName || 'Member',
      metadata: { status },
    });

    return { id: docRef.id, error: null };
  } catch (error) {
    return { id: null, error: error.message };
  }
};

export const updateNote = async (noteId, updates) => {
  try {
    await updateDoc(doc(db, NOTES_COLLECTION, noteId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

export const deleteNote = async (noteId) => {
  try {
    const ref = doc(db, NOTES_COLLECTION, noteId);
    const beforeSnap = await getDoc(ref);
    const previous = beforeSnap.exists() ? beforeSnap.data() : null;

    await deleteDoc(ref);

    if (previous?.userId) {
      await logAppNotification({
        userId: previous.userId,
        title: 'Catatan dihapus',
        body: `${previous.title || 'Catatan'} telah dihapus`,
        action: 'delete',
        entityType: 'note',
        entityId: noteId,
        actorName: previous.authorName || 'Member',
        metadata: { status: previous.status },
      });
    }

    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};
