// ============================================================
// Firestore Budgets Service
// ============================================================
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

const BUDGETS_COLLECTION = 'budgets';

// ─── Add Budget ──────────────────────────────────────────────
export const addBudget = async (userId, budgetData) => {
  try {
    const docRef = await addDoc(collection(db, BUDGETS_COLLECTION), {
      userId,
      categoryId: budgetData.categoryId,
      categoryName: budgetData.categoryName,
      amount: budgetData.amount,
      period: budgetData.period, // 'monthly' | 'weekly' | 'yearly'
      month: budgetData.month,   // 1-12
      year: budgetData.year,
      spent: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: docRef.id, error: null };
  } catch (error) {
    return { id: null, error: error.message };
  }
};

// ─── Update Budget ───────────────────────────────────────────
export const updateBudget = async (budgetId, updates) => {
  try {
    await updateDoc(doc(db, BUDGETS_COLLECTION, budgetId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// ─── Delete Budget ───────────────────────────────────────────
export const deleteBudget = async (budgetId) => {
  try {
    await deleteDoc(doc(db, BUDGETS_COLLECTION, budgetId));
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// ─── Real-time Listener ──────────────────────────────────────
export const subscribeToBudgets = (userId, year, month, callback) => {
  const q = query(
    collection(db, BUDGETS_COLLECTION),
    where('userId', '==', userId),
    where('year', '==', year),
    where('month', '==', month)
  );

  return onSnapshot(q, (snapshot) => {
    const budgets = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(budgets);
  });
};

// ─── Update Budget Spent ─────────────────────────────────────
export const updateBudgetSpent = async (userId, categoryId, year, month, amount) => {
  try {
    const q = query(
      collection(db, BUDGETS_COLLECTION),
      where('userId', '==', userId),
      where('categoryId', '==', categoryId),
      where('year', '==', year),
      where('month', '==', month)
    );
    const snapshot = await getDocs(q);
    for (const document of snapshot.docs) {
      const current = document.data().spent || 0;
      await updateDoc(doc(db, BUDGETS_COLLECTION, document.id), {
        spent: current + amount,
        updatedAt: serverTimestamp(),
      });
    }
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};
