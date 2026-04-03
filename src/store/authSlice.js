// ============================================================
// Auth Slice
// ============================================================
import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
    isPinVerified: false,
    isBiometricEnabled: false,
    error: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload ? {
        uid: action.payload.uid,
        email: action.payload.email,
        displayName: action.payload.displayName,
        photoURL: action.payload.photoURL,
      } : null;
      state.isAuthenticated = !!action.payload;
    },
    setProfile: (state, action) => {
      state.profile = action.payload;
      if (action.payload) {
        state.isBiometricEnabled = action.payload.biometricEnabled ?? false;
      }
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setPinVerified: (state, action) => {
      state.isPinVerified = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    logout: (state) => {
      state.user = null;
      state.profile = null;
      state.isAuthenticated = false;
      state.isPinVerified = false;
      state.isLoading = false;
      state.error = null;
    },
  },
});

export const { setUser, setProfile, setLoading, setPinVerified, setError, clearError, logout } =
  authSlice.actions;

// Selectors
export const selectUser = (state) => state.auth.user;
export const selectProfile = (state) => state.auth.profile;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectIsLoading = (state) => state.auth.isLoading;
export const selectIsPinVerified = (state) => state.auth.isPinVerified;

export default authSlice.reducer;
