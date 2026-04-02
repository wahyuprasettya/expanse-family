// ============================================================
// Firestore Chat Service
// ============================================================
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from './config';
import { logAppNotification } from './appNotifications';
import { getHouseholdMembers, sendHouseholdNotification } from './notifications';

const CHAT_MESSAGES_COLLECTION = 'chatMessages';

export const getChatThreadId = (householdId) => `household_${householdId}`;

export const subscribeToChatMessages = (threadId, callback) => {
  const q = query(
    collection(db, CHAT_MESSAGES_COLLECTION),
    where('threadId', '==', threadId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((messageDoc) => ({
      id: messageDoc.id,
      ...messageDoc.data(),
      createdAt: messageDoc.data().createdAt?.toDate?.()?.toISOString?.() || null,
    }));

    callback(messages);
  });
};

export const sendChatMessage = async ({ threadId, householdId, senderUid, senderName, text }) => {
  try {
    const docRef = await addDoc(collection(db, CHAT_MESSAGES_COLLECTION), {
      threadId,
      householdId,
      senderUid,
      senderName,
      text,
      createdAt: serverTimestamp(),
      isRead: false,
    });

    const members = await getHouseholdMembers(householdId);
    const recipients = members.filter((member) => member.uid !== senderUid);

    await Promise.all(recipients.map((member) => logAppNotification({
      userId: member.uid,
      title: 'Pesan baru',
      body: `${senderName} mengirim pesan: ${text}`,
      action: 'message',
      entityType: 'chat',
      entityId: docRef.id,
      actorName: senderName,
      actorUid: senderUid,
      metadata: {
        threadId,
        householdId,
      },
    })));

    await sendHouseholdNotification(householdId, senderUid, {
      title: 'Pesan baru',
      body: `${senderName}: ${text}`,
      data: {
        type: 'chat',
        threadId,
        messageId: docRef.id,
      },
    });

    return { id: docRef.id, error: null };
  } catch (error) {
    return { id: null, error: error.message };
  }
};

export const deleteChatMessage = async (messageId) => {
  try {
    await deleteDoc(doc(db, CHAT_MESSAGES_COLLECTION, messageId));
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};
