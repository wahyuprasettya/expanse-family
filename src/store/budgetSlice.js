// ============================================================
// Budget Slice
// ============================================================
import { createSlice, createSelector } from '@reduxjs/toolkit';
import { serializeFirestoreValue } from '@utils/firestore';

const sanitizeBudget = (budget) => serializeFirestoreValue(budget);
const sanitizeBudgets = (budgets) => Array.isArray(budgets) ? budgets.map(sanitizeBudget) : [];

const budgetSlice = createSlice({
  name: 'budgets',
  initialState: {
    items: [],
    isLoading: false,
    error: null,
  },
  reducers: {
    setBudgets: (state, action) => { state.items = sanitizeBudgets(action.payload); },
    addBudgetLocal: (state, action) => { state.items.push(sanitizeBudget(action.payload)); },
    updateBudgetLocal: (state, action) => {
      const idx = state.items.findIndex((b) => b.id === action.payload.id);
      if (idx !== -1) state.items[idx] = sanitizeBudget({ ...state.items[idx], ...action.payload });
    },
    removeBudgetLocal: (state, action) => {
      state.items = state.items.filter((b) => b.id !== action.payload);
    },
    setLoading: (state, action) => { state.isLoading = action.payload; },
    setError: (state, action) => { state.error = action.payload; },
  },
});

export const { setBudgets, addBudgetLocal, updateBudgetLocal, removeBudgetLocal, setLoading, setError } =
  budgetSlice.actions;

export const selectBudgets = (state) => state.budgets.items;
export const selectBudgetsLoading = (state) => state.budgets.isLoading;
export const selectBudgetWarnings = createSelector(
  [selectBudgets],
  (budgets) => budgets.filter((b) => b.amount > 0 && (b.spent / b.amount) >= 0.8)
);

export default budgetSlice.reducer;
