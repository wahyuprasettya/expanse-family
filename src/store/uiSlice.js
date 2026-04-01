// ============================================================
// UI Slice (modals, toasts, loading states)
// ============================================================
import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: 'dark',
    language: 'id',
    isAddTransactionModalOpen: false,
    activeTab: 'home',
    toastMessage: null,
    globalLoading: false,
  },
  reducers: {
    setTheme: (state, action) => { state.theme = action.payload; },
    setLanguage: (state, action) => { state.language = action.payload; },
    openAddTransactionModal: (state) => { state.isAddTransactionModalOpen = true; },
    closeAddTransactionModal: (state) => { state.isAddTransactionModalOpen = false; },
    setActiveTab: (state, action) => { state.activeTab = action.payload; },
    showToast: (state, action) => { state.toastMessage = action.payload; },
    clearToast: (state) => { state.toastMessage = null; },
    setGlobalLoading: (state, action) => { state.globalLoading = action.payload; },
  },
});

export const {
  setTheme, setLanguage, openAddTransactionModal, closeAddTransactionModal,
  setActiveTab, showToast, clearToast, setGlobalLoading,
} = uiSlice.actions;

export const selectTheme = (state) => state.ui.theme;
export const selectLanguage = (state) => state.ui.language;
export const selectIsAddTransactionModalOpen = (state) => state.ui.isAddTransactionModalOpen;

export default uiSlice.reducer;
