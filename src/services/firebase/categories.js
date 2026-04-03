// ============================================================
// Categories Service - Firestore (custom categories)
// ============================================================
import {
  collection, addDoc, deleteDoc, doc,
  query, where, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { DEFAULT_CATEGORIES } from '@constants/categories';

const CATEGORIES_COLLECTION = 'categories';

const serializeCategory = (docSnapshot) => {
  const data = docSnapshot.data();

  return {
    id: docSnapshot.id,
    ...data,
    createdAt: data.createdAt?.toDate?.().toISOString?.() || null,
    isCustom: true,
  };
};

// ─── Subscribe to User Categories ────────────────────────────
export const subscribeToCategories = (userId, callback) => {
  const q = query(
    collection(db, CATEGORIES_COLLECTION),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const custom = snapshot.docs.map(serializeCategory);
    callback([...DEFAULT_CATEGORIES, ...custom]);
  });
};

// ─── Add Custom Category ─────────────────────────────────────
export const addCategory = async (userId, categoryData) => {
  try {
    const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), {
      userId,
      name: categoryData.name,
      icon: categoryData.icon,
      color: categoryData.color,
      type: categoryData.type, // 'income' | 'expense' | 'both'
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, error: null };
  } catch (error) {
    return { id: null, error: error.message };
  }
};

// ─── Delete Custom Category ──────────────────────────────────
export const deleteCategory = async (categoryId) => {
  try {
    await deleteDoc(doc(db, CATEGORIES_COLLECTION, categoryId));
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};
