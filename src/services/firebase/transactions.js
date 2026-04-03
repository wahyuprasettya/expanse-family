// ============================================================
// Firestore Transactions Service
// ============================================================
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  setDoc,
  serverTimestamp,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { db } from './config';
import { logAppNotification } from './appNotifications';

const TRANSACTIONS_COLLECTION = 'transactions';
const buildTransactionDocId = (accountId, clientRequestId) => `tx_${accountId}_${clientRequestId}`;

// ─── Add Transaction ─────────────────────────────────────────
export const addTransaction = async (accountId, actor, transactionData) => {
  try {
    console.log('[tx:add] request:start', {
      accountId,
      actorUid: actor?.uid,
      clientRequestId: transactionData.clientRequestId || null,
      type: transactionData.type,
      amount: transactionData.amount,
      categoryId: transactionData.categoryId,
      date: transactionData.date,
    });

    const now = serverTimestamp();
    const payload = {
      userId: actor.uid,
      householdId: accountId,
      createdByUid: actor.uid,
      createdByName: actor.displayName || actor.email || 'Member',
      amount: transactionData.amount,
      type: transactionData.type, // 'income' | 'expense'
      category: transactionData.category,
      categoryId: transactionData.categoryId,
      description: transactionData.description || '',
      date: Timestamp.fromDate(new Date(transactionData.date)),
      receiptUrl: transactionData.receiptUrl || null,
      tags: transactionData.tags || [],
      debtMeta: transactionData.debtMeta || null,
      clientRequestId: transactionData.clientRequestId || null,
      createdAt: now,
      updatedAt: now,
    };

    let transactionId = null;
    if (transactionData.clientRequestId) {
      transactionId = buildTransactionDocId(accountId, transactionData.clientRequestId);
      const ref = doc(db, TRANSACTIONS_COLLECTION, transactionId);
      const existingDoc = await getDoc(ref);
      if (existingDoc.exists()) {
        console.log('[tx:add] request:dedup-hit', {
          clientRequestId: transactionData.clientRequestId,
          existingId: transactionId,
        });
        return { id: transactionId, error: null };
      }

      await setDoc(ref, payload);
    } else {
      const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), payload);
      transactionId = docRef.id;
    }

    await logAppNotification({
      userId: actor.uid,
      title: 'Transaksi baru ditambahkan',
      body: `${actor.displayName || actor.email || 'Member'} menambahkan ${transactionData.category} sebesar ${transactionData.amount}`,
      action: 'insert',
      entityType: 'transaction',
      entityId: transactionId,
      actorName: actor.displayName || actor.email || 'Member',
      actorUid: actor.uid,
      metadata: { householdId: accountId },
    });
    console.log('[tx:add] request:created', {
      id: transactionId,
      clientRequestId: transactionData.clientRequestId || null,
    });
    return { id: transactionId, error: null };
  } catch (error) {
    console.log('[tx:add] request:error', {
      clientRequestId: transactionData.clientRequestId || null,
      message: error.message,
    });
    return { id: null, error: error.message };
  }
};

// ─── Update Transaction ──────────────────────────────────────
export const updateTransaction = async (transactionId, updates) => {
  try {
    const ref = doc(db, TRANSACTIONS_COLLECTION, transactionId);
    const beforeSnap = await getDoc(ref);
    const previous = beforeSnap.exists() ? beforeSnap.data() : null;
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    await logAppNotification({
      userId: updates.userId || previous?.userId,
      title: 'Transaksi diperbarui',
      body: `${updates.updatedByName || previous?.createdByName || 'Member'} memperbarui transaksi`,
      action: 'update',
      entityType: 'transaction',
      entityId: transactionId,
      actorName: updates.updatedByName || previous?.createdByName || 'Member',
      actorUid: updates.updatedByUid || null,
    });
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// ─── Delete Transaction ──────────────────────────────────────
export const deleteTransaction = async (transactionId) => {
  try {
    const ref = doc(db, TRANSACTIONS_COLLECTION, transactionId);
    const beforeSnap = await getDoc(ref);
    const previous = beforeSnap.exists() ? beforeSnap.data() : null;
    await deleteDoc(ref);
    if (previous?.userId) {
      await logAppNotification({
        userId: previous.userId,
        title: 'Transaksi dihapus',
        body: `${previous.createdByName || 'Member'} menghapus transaksi`,
        action: 'delete',
        entityType: 'transaction',
        entityId: transactionId,
        actorName: previous.createdByName || 'Member',
        actorUid: previous.userId,
      });
    }
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// ─── Real-time Listener for Transactions ─────────────────────
export const subscribeToTransactions = (accountId, callback, filters = {}) => {
  let q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where('householdId', '==', accountId),
    orderBy('date', 'desc')
  );

  if (filters.type) {
    q = query(q, where('type', '==', filters.type));
  }
  if (filters.categoryId) {
    q = query(q, where('categoryId', '==', filters.categoryId));
  }

  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate().toISOString(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString?.() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString?.() || null,
    }));
    const duplicateClientRequestIds = transactions.reduce((acc, tx) => {
      if (!tx.clientRequestId) return acc;
      acc[tx.clientRequestId] = (acc[tx.clientRequestId] || 0) + 1;
      return acc;
    }, {});

    console.log('[tx:subscribe] snapshot', {
      accountId,
      total: transactions.length,
      ids: transactions.map((tx) => tx.id),
      duplicateClientRequestIds: Object.entries(duplicateClientRequestIds)
        .filter(([, count]) => count > 1)
        .map(([clientRequestId, count]) => ({ clientRequestId, count })),
    });
    callback(transactions);
  });
};

// ─── Get Transactions by Date Range ──────────────────────────
export const getTransactionsByDateRange = async (accountId, startDate, endDate) => {
  try {
    const q = query(
      collection(db, TRANSACTIONS_COLLECTION),
      where('householdId', '==', accountId),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString?.() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString?.() || null,
    }));
    return { transactions, error: null };
  } catch (error) {
    return { transactions: [], error: error.message };
  }
};

// ─── Calculate Balance ───────────────────────────────────────
export const calculateBalance = (transactions) => {
  return transactions.reduce((acc, t) => {
    if (t.type === 'income') return acc + t.amount;
    if (t.type === 'expense' || t.type === 'debt') return acc - t.amount;
    return acc;
  }, 0);
};

// ─── Get Monthly Summary ─────────────────────────────────────
export const getMonthlyReport = async (accountId, year, month) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const { transactions, error } = await getTransactionsByDateRange(accountId, startDate, endDate);
  if (error) return { report: null, error };

  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === 'expense' || t.type === 'debt')
    .reduce((s, t) => s + t.amount, 0);

  // Group by category
  const byCategory = transactions.reduce((acc, t) => {
    if (!acc[t.categoryId]) {
      acc[t.categoryId] = {
        categoryId: t.categoryId,
        name: t.category,
        total: 0,
        count: 0,
        type: t.type,
      };
    }
    acc[t.categoryId].total += t.amount;
    acc[t.categoryId].count += 1;
    return acc;
  }, {});

  return {
    report: {
      income,
      expense,
      balance: income - expense,
      transactions,
      byCategory: Object.values(byCategory),
    },
    error: null,
  };
};
