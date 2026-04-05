// ============================================================
// Debt Slice
// ============================================================
import { createSelector, createSlice } from '@reduxjs/toolkit';
import { buildDebtSnapshot, getDebtStatus, isDebtDueSoon } from '@utils/debts';

const sanitizeDebt = (debt) => buildDebtSnapshot(debt);

const debtSlice = createSlice({
  name: 'debts',
  initialState: {
    items: [],
    isLoading: false,
    error: null,
  },
  reducers: {
    setDebts: (state, action) => {
      state.items = Array.isArray(action.payload) ? action.payload.map(sanitizeDebt) : [];
    },
    addDebtLocal: (state, action) => {
      state.items.unshift(sanitizeDebt(action.payload));
    },
    updateDebtLocal: (state, action) => {
      const index = state.items.findIndex((item) => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = sanitizeDebt({
          ...state.items[index],
          ...action.payload,
        });
      }
    },
    removeDebtLocal: (state, action) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
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
  setDebts,
  addDebtLocal,
  updateDebtLocal,
  removeDebtLocal,
  setLoading,
  setError,
} = debtSlice.actions;

export const selectDebts = (state) => state.debts.items;
export const selectDebtsLoading = (state) => state.debts.isLoading;
export const selectDebtError = (state) => state.debts.error;

export const selectDebtSummary = createSelector(
  [selectDebts],
  (debts) => {
    const activeItems = debts.filter((item) => item.outstandingAmount > 0);

    return {
      activeCount: activeItems.length,
      debtOutstanding: activeItems
        .filter((item) => item.type === 'debt')
        .reduce((sum, item) => sum + item.outstandingAmount, 0),
      receivableOutstanding: activeItems
        .filter((item) => item.type === 'receivable')
        .reduce((sum, item) => sum + item.outstandingAmount, 0),
      overdueCount: activeItems.filter((item) => getDebtStatus(item) === 'overdue').length,
      dueSoonCount: activeItems.filter((item) => isDebtDueSoon(item, 7)).length,
      paidCount: debts.filter((item) => item.outstandingAmount <= 0).length,
      activeItems,
    };
  }
);

export default debtSlice.reducer;
