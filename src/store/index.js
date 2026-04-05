// ============================================================
// Redux Store Configuration with Persistence
// ============================================================
import { configureStore } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistStore, persistReducer, createTransform, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import authReducer from './authSlice';
import transactionReducer from './transactionSlice';
import budgetReducer from './budgetSlice';
import categoryReducer from './categorySlice';
import assetReducer from './assetSlice';
import reminderReducer from './reminderSlice';
import appNotificationReducer from './appNotificationSlice';
import uiReducer from './uiSlice';
import walletReducer from './walletSlice';
import { serializeFirestoreValue } from '@utils/firestore';

const budgetItemsTransform = createTransform(
  (inboundState) => (Array.isArray(inboundState) ? inboundState.map(serializeFirestoreValue) : []),
  (outboundState) => (Array.isArray(outboundState) ? outboundState.map(serializeFirestoreValue) : []),
  { whitelist: ['items'] }
);

// Persist configuration for transactions
const transactionPersistConfig = {
  key: 'transactions',
  storage: AsyncStorage,
  whitelist: ['items', 'balance', 'totalIncome', 'totalExpense'], // Only persist these fields
};

// Persist configuration for budgets
const budgetPersistConfig = {
  key: 'budgets',
  storage: AsyncStorage,
  whitelist: ['items'],
  transforms: [budgetItemsTransform],
};

const assetPersistConfig = {
  key: 'assets',
  storage: AsyncStorage,
  whitelist: ['items'],
};

const walletPersistConfig = {
  key: 'wallets',
  storage: AsyncStorage,
  whitelist: ['items'],
};

// Persist configuration for UI preferences
const uiPersistConfig = {
  key: 'ui',
  storage: AsyncStorage,
  whitelist: ['language', 'theme'],
};

// Create persisted reducers
const persistedTransactionReducer = persistReducer(transactionPersistConfig, transactionReducer);
const persistedBudgetReducer = persistReducer(budgetPersistConfig, budgetReducer);
const persistedAssetReducer = persistReducer(assetPersistConfig, assetReducer);
const persistedWalletReducer = persistReducer(walletPersistConfig, walletReducer);
const persistedUiReducer = persistReducer(uiPersistConfig, uiReducer);

export const store = configureStore({
  reducer: {
    auth: authReducer,
    transactions: persistedTransactionReducer,
    budgets: persistedBudgetReducer,
    categories: categoryReducer,
    assets: persistedAssetReducer,
    wallets: persistedWalletReducer,
    reminders: reminderReducer,
    appNotifications: appNotificationReducer,
    ui: persistedUiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: {
        warnAfter: 128,
      },
      serializableCheck: {
        warnAfter: 128,
        ignoredActions: [
          FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER,
          'auth/setUser',
        ],
        ignoredPaths: ['auth.user'],
      },
    }),
});

export const persistor = persistStore(store);

export default store;
