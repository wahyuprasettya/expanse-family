// ============================================================
// Firestore Debts Service
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
import { buildDebtSnapshot } from '@utils/debts';
import { serializeFirestoreValue } from '@utils/firestore';

const DEBTS_COLLECTION = 'debts';

const serializeDebt = (debtDoc) => buildDebtSnapshot(serializeFirestoreValue({
  id: debtDoc.id,
  ...debtDoc.data(),
}));

export const addDebt = async (accountId, actor, debtData) => {
  try {
    const snapshot = buildDebtSnapshot(debtData);
    const payload = {
      householdId: accountId,
      userId: actor.uid,
      createdByUid: actor.uid,
      createdByName: actor.displayName || actor.email || 'Member',
      updatedByUid: actor.uid,
      updatedByName: actor.displayName || actor.email || 'Member',
      title: snapshot.title,
      type: snapshot.type,
      counterpartName: snapshot.counterpartName,
      principalAmount: snapshot.principalAmount,
      paidAmount: snapshot.paidAmount,
      outstandingAmount: snapshot.outstandingAmount,
      paymentScheme: snapshot.paymentScheme,
      installmentAmount: snapshot.installmentAmount,
      installmentFrequency: snapshot.installmentFrequency,
      totalInstallments: snapshot.totalInstallments,
      paidInstallments: snapshot.paidInstallments,
      dueDate: snapshot.dueDate,
      startDate: snapshot.startDate,
      remindDaysBefore: snapshot.remindDaysBefore,
      walletId: snapshot.walletId,
      walletName: snapshot.walletName,
      description: snapshot.description,
      paymentHistory: snapshot.paymentHistory,
      lastPaymentDate: snapshot.lastPaymentDate,
      status: snapshot.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, DEBTS_COLLECTION), payload);

    await logAppNotification({
      userId: actor.uid,
      title: snapshot.type === 'receivable' ? 'Piutang baru ditambahkan' : 'Hutang baru ditambahkan',
      body: `${snapshot.title || snapshot.counterpartName || 'Catatan hutang'} berhasil dibuat`,
      action: 'insert',
      entityType: 'debt',
      entityId: docRef.id,
      actorName: actor.displayName || actor.email || 'Member',
      actorUid: actor.uid,
      metadata: {
        debtType: snapshot.type,
        householdId: accountId,
      },
    });

    return { id: docRef.id, error: null };
  } catch (error) {
    return { id: null, error: error.message };
  }
};

export const updateDebt = async (debtId, updates) => {
  try {
    const ref = doc(db, DEBTS_COLLECTION, debtId);
    const beforeSnap = await getDoc(ref);
    const previous = beforeSnap.exists() ? beforeSnap.data() : null;
    const snapshot = buildDebtSnapshot({
      ...(previous || {}),
      ...serializeFirestoreValue(updates),
    });

    await updateDoc(ref, {
      title: snapshot.title,
      type: snapshot.type,
      counterpartName: snapshot.counterpartName,
      principalAmount: snapshot.principalAmount,
      paidAmount: snapshot.paidAmount,
      outstandingAmount: snapshot.outstandingAmount,
      paymentScheme: snapshot.paymentScheme,
      installmentAmount: snapshot.installmentAmount,
      installmentFrequency: snapshot.installmentFrequency,
      totalInstallments: snapshot.totalInstallments,
      paidInstallments: snapshot.paidInstallments,
      dueDate: snapshot.dueDate,
      startDate: snapshot.startDate,
      remindDaysBefore: snapshot.remindDaysBefore,
      walletId: snapshot.walletId,
      walletName: snapshot.walletName,
      description: snapshot.description,
      paymentHistory: snapshot.paymentHistory,
      lastPaymentDate: snapshot.lastPaymentDate,
      status: snapshot.status,
      updatedByUid: updates.updatedByUid || previous?.updatedByUid || null,
      updatedByName: updates.updatedByName || previous?.updatedByName || 'Member',
      updatedAt: serverTimestamp(),
    });

    await logAppNotification({
      userId: previous?.userId,
      title: snapshot.type === 'receivable' ? 'Piutang diperbarui' : 'Hutang diperbarui',
      body: `${snapshot.title || previous?.title || 'Catatan hutang'} berhasil diperbarui`,
      action: 'update',
      entityType: 'debt',
      entityId: debtId,
      actorName: updates.updatedByName || previous?.updatedByName || 'Member',
      actorUid: updates.updatedByUid || previous?.updatedByUid || null,
      metadata: {
        debtType: snapshot.type,
        householdId: previous?.householdId || null,
      },
    });

    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

export const deleteDebt = async (debtId) => {
  try {
    const ref = doc(db, DEBTS_COLLECTION, debtId);
    const beforeSnap = await getDoc(ref);
    const previous = beforeSnap.exists() ? beforeSnap.data() : null;
    await deleteDoc(ref);

    if (previous?.userId) {
      await logAppNotification({
        userId: previous.userId,
        title: previous.type === 'receivable' ? 'Piutang dihapus' : 'Hutang dihapus',
        body: `${previous.title || previous.counterpartName || 'Catatan hutang'} telah dihapus`,
        action: 'delete',
        entityType: 'debt',
        entityId: debtId,
        actorName: previous.updatedByName || previous.createdByName || 'Member',
        actorUid: previous.updatedByUid || previous.createdByUid || previous.userId,
        metadata: {
          debtType: previous.type || 'debt',
          householdId: previous.householdId || null,
        },
      });
    }

    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

export const subscribeToDebts = (accountId, callback) => {
  const q = query(
    collection(db, DEBTS_COLLECTION),
    where('householdId', '==', accountId),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(serializeDebt));
  });
};
