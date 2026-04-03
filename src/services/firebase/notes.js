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
import { sendHouseholdNotification, sendPushNotificationToUser } from './notifications';

const NOTES_COLLECTION = 'notes';
const DEFAULT_MEMBER_NAME = 'Member';
const DEFAULT_ASSIGNEE_NAME = 'anggota tim';

const buildAssignmentMessage = (actorName, assignedToName, noteTitle) =>
  `${actorName} menugaskan ${assignedToName || DEFAULT_ASSIGNEE_NAME} terkait "${noteTitle}"`;

const sendNoteAssignmentNotifications = async ({
  accountId,
  noteId,
  noteTitle,
  actorUserId = null,
  actorName = DEFAULT_MEMBER_NAME,
  assignedToUid,
  assignedToName = '',
  status = 'todo',
}) => {
  if (!assignedToUid) {
    return;
  }

  const assignmentMessage = buildAssignmentMessage(actorName, assignedToName, noteTitle);

  await logAppNotification({
    userId: assignedToUid,
    title: 'Tugas baru untukmu',
    body: assignmentMessage,
    action: 'assign',
    entityType: 'note_assignment',
    entityId: noteId,
    actorName,
    actorUid: actorUserId,
    metadata: { status, title: noteTitle, assignedToName },
  });

  await sendPushNotificationToUser(assignedToUid, {
    title: '📝 Tugas baru untukmu',
    body: assignmentMessage,
    data: {
      type: 'note_assignment',
      noteId,
      action: 'assigned',
    },
  });

  if (accountId) {
    await sendHouseholdNotification(
      accountId,
      actorUserId,
      {
        title: '📝 Update catatan tim',
        body: assignmentMessage,
        data: {
          type: 'note_assignment',
          noteId,
          action: 'assigned',
          assignedToUid,
        },
      },
      { excludeUserIds: [assignedToUid] }
    );
  }
};

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

export const addNote = async ({
  accountId,
  userId,
  authorName,
  title,
  description,
  status,
  assignedToUid = null,
  assignedToName = '',
}) => {
  try {
    const docRef = await addDoc(collection(db, NOTES_COLLECTION), {
      accountId,
      userId,
      authorName,
      title,
      description: description || '',
      status,
      assignedToUid,
      assignedToName: assignedToName || '',
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
      metadata: { status, assignedToUid, assignedToName: assignedToName || '' },
    });

    await sendNoteAssignmentNotifications({
      accountId,
      noteId: docRef.id,
      noteTitle: title,
      actorUserId: userId,
      actorName: authorName || DEFAULT_MEMBER_NAME,
      assignedToUid,
      assignedToName: assignedToName || '',
      status,
    });

    return { id: docRef.id, error: null };
  } catch (error) {
    return { id: null, error: error.message };
  }
};

export const updateNote = async (noteId, updates, actor = {}) => {
  try {
    const ref = doc(db, NOTES_COLLECTION, noteId);
    const beforeSnap = await getDoc(ref);
    const previous = beforeSnap.exists() ? beforeSnap.data() : null;

    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    const nextAssignedToUid = updates.assignedToUid ?? previous?.assignedToUid ?? null;
    const assignmentChanged = previous?.assignedToUid !== nextAssignedToUid;

    if (assignmentChanged && nextAssignedToUid) {
      const noteTitle = updates.title || previous?.title || 'Catatan';
      const actorName = actor.authorName || previous?.authorName || DEFAULT_MEMBER_NAME;
      const assignedToName = updates.assignedToName || previous?.assignedToName || '';

      await sendNoteAssignmentNotifications({
        accountId: previous?.accountId || null,
        noteId,
        noteTitle,
        actorUserId: actor.userId || null,
        actorName,
        assignedToUid: nextAssignedToUid,
        assignedToName,
        status: updates.status || previous?.status || 'todo',
      });
    }

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
