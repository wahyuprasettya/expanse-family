// ============================================================
// Firestore Transactions Service
// ============================================================
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  serverTimestamp,
  Timestamp,
  limit,
  startAfter,
} from 'firebase/firestore';
import { db } from './config';

const TRANSACTIONS_COLLECTION = 'transactions';

// ─── Add Transaction ─────────────────────────────────────────
export const addTransaction = async (accountId, actor, transactionData) => {
  try {
    const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), {
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: docRef.id, error: null };
  } catch (error) {
    return { id: null, error: error.message };
  }
};

// ─── Update Transaction ──────────────────────────────────────
export const updateTransaction = async (transactionId, updates) => {
  try {
    const ref = doc(db, TRANSACTIONS_COLLECTION, transactionId);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// ─── Delete Transaction ──────────────────────────────────────
export const deleteTransaction = async (transactionId) => {
  try {
    await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, transactionId));
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
      date: doc.data().date?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    }));
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
    if (t.type === 'expense') return acc - t.amount;
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
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // Group by category
  const byCategory = transactions.reduce((acc, t) => {
    if (!acc[t.categoryId]) acc[t.categoryId] = { name: t.category, total: 0, count: 0, type: t.type };
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
