// ============================================================
// Legacy Firebase Cleanup Service
// ============================================================
import { collection, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './config';

const CHAT_MESSAGES_COLLECTION = 'chatMessages';

export const deleteLegacyChatMessages = async (accountId) => {
  try {
    const q = query(
      collection(db, CHAT_MESSAGES_COLLECTION),
      where('householdId', '==', accountId)
    );
    const snapshot = await getDocs(q);

    await Promise.all(snapshot.docs.map((chatDoc) => deleteDoc(chatDoc.ref)));
    return { count: snapshot.size, error: null };
  } catch (error) {
    return { count: 0, error: error.message };
  }
};
