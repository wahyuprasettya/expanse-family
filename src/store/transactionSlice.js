// ============================================================
// Transaction Slice
// ============================================================
import { createSlice, createSelector } from '@reduxjs/toolkit';
import { calculateBalance } from '@services/firebase/transactions';

const recalculateTransactionTotals = (state) => {
  state.balance = calculateBalance(state.items);
  state.totalIncome = state.items
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  state.totalExpense = state.items
    .filter((t) => t.type === 'expense' || t.type === 'debt')
    .reduce((sum, t) => sum + t.amount, 0);
};

const transactionSlice = createSlice({
  name: 'transactions',
  initialState: {
    items: [],
    balance: 0,
    totalIncome: 0,
    totalExpense: 0,
    isLoading: false,
    filter: {
      type: null,
      categoryId: null,
      dateRange: null,
    },
    error: null,
  },
  reducers: {
    setTransactions: (state, action) => {
      state.items = action.payload;
      recalculateTransactionTotals(state);
    },
    addTransactionLocal: (state, action) => {
      state.items.unshift(action.payload);
      if (action.payload.type === 'income') {
        state.balance += action.payload.amount;
        state.totalIncome += action.payload.amount;
      } else if (action.payload.type === 'expense' || action.payload.type === 'debt') {
        state.balance -= action.payload.amount;
        state.totalExpense += action.payload.amount;
      }
    },
    removeTransactionLocal: (state, action) => {
      const tx = state.items.find((t) => t.id === action.payload);
      if (tx) {
        if (tx.type === 'income') {
          state.balance -= tx.amount;
          state.totalIncome -= tx.amount;
        } else if (tx.type === 'expense' || tx.type === 'debt') {
          state.balance += tx.amount;
          state.totalExpense -= tx.amount;
        }
        state.items = state.items.filter((t) => t.id !== action.payload);
      }
    },
    updateTransactionLocal: (state, action) => {
      const index = state.items.findIndex((t) => t.id === action.payload.id);
      if (index === -1) return;

      state.items[index] = {
        ...state.items[index],
        ...action.payload,
      };
      recalculateTransactionTotals(state);
      state.items.sort((first, second) => new Date(second.date) - new Date(first.date));
    },
    setFilter: (state, action) => {
      state.filter = { ...state.filter, ...action.payload };
    },
    clearFilter: (state) => {
      state.filter = { type: null, categoryId: null, dateRange: null };
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {
  setTransactions, addTransactionLocal, removeTransactionLocal, updateTransactionLocal,
  setFilter, clearFilter, setLoading, setError,
} = transactionSlice.actions;

// Selectors
export const selectTransactions = (state) => state.transactions.items;
export const selectBalance = (state) => state.transactions.balance;
export const selectTotalIncome = (state) => state.transactions.totalIncome;
export const selectTotalExpense = (state) => state.transactions.totalExpense;
export const selectFilter = (state) => state.transactions.filter;
export const selectTransactionsLoading = (state) => state.transactions.isLoading;
export const selectFilteredTransactions = createSelector(
  [selectTransactions, selectFilter],
  (items, filter) => items.filter((t) => {
    if (filter.type && t.type !== filter.type) return false;
    if (filter.categoryId && t.categoryId !== filter.categoryId) return false;
    return true;
  })
);

export default transactionSlice.reducer;
