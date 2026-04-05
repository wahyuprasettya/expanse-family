// ============================================================
// Wallet Slice
// ============================================================
import { createSlice, createSelector } from '@reduxjs/toolkit';
import { serializeFirestoreValue } from '@utils/firestore';

const sanitizeWallet = (wallet) => serializeFirestoreValue(wallet);
const sanitizeWallets = (wallets) => Array.isArray(wallets) ? wallets.map(sanitizeWallet) : [];
const dedupeWalletsById = (wallets) => {
  const seen = new Set();
  return sanitizeWallets(wallets).filter((wallet) => {
    const key = wallet?.id || `${wallet?.name || 'wallet'}-${wallet?.createdAt || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const walletSlice = createSlice({
  name: 'wallets',
  initialState: {
    items: [],
    isLoading: false,
  },
  reducers: {
    setWallets: (state, action) => {
      state.items = dedupeWalletsById(action.payload);
    },
    addWalletLocal: (state, action) => {
      const nextWallet = sanitizeWallet(action.payload);
      const existingIndex = state.items.findIndex((item) => item.id === nextWallet.id);
      if (existingIndex !== -1) {
        state.items[existingIndex] = { ...state.items[existingIndex], ...nextWallet };
        return;
      }

      state.items.unshift(nextWallet);
    },
    updateWalletLocal: (state, action) => {
      const index = state.items.findIndex((item) => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = sanitizeWallet({ ...state.items[index], ...action.payload });
      }
    },
    removeWalletLocal: (state, action) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
});

export const {
  setWallets,
  addWalletLocal,
  updateWalletLocal,
  removeWalletLocal,
  setLoading,
} = walletSlice.actions;

export const selectWallets = (state) => state.wallets.items;
export const selectWalletsLoading = (state) => state.wallets.isLoading;
export const selectTotalWalletBalance = createSelector(
  [selectWallets],
  (wallets) => wallets.reduce((sum, wallet) => sum + (Number(wallet.balance) || 0), 0)
);

export default walletSlice.reducer;
