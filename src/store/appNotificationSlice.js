// ============================================================
// App Notification Slice
// ============================================================
import { createSlice } from '@reduxjs/toolkit';

const appNotificationSlice = createSlice({
  name: 'appNotifications',
  initialState: { items: [], isLoading: false },
  reducers: {
    setAppNotifications: (state, action) => {
      state.items = action.payload.map((item) => ({
        ...item,
        isRead: item.isRead ?? false,
      }));
    },
    markAppNotificationRead: (state, action) => {
      const notif = state.items.find((item) => item.id === action.payload);
      if (notif) notif.isRead = true;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setAppNotifications, markAppNotificationRead, setLoading } = appNotificationSlice.actions;
export const selectAppNotifications = (state) => state.appNotifications.items;
export const selectAppNotificationCount = (state) => state.appNotifications.items.length;
export const selectUnreadAppNotificationCount = (state) => state.appNotifications.items.filter((item) => !item.isRead).length;
export const selectAppNotificationsLoading = (state) => state.appNotifications.isLoading;
export default appNotificationSlice.reducer;
