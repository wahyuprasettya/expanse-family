// ============================================================
// App Notification Slice
// ============================================================
import { createSlice } from '@reduxjs/toolkit';

const appNotificationSlice = createSlice({
  name: 'appNotifications',
  initialState: { items: [] },
  reducers: {
    setAppNotifications: (state, action) => {
      state.items = action.payload;
    },
    markAppNotificationRead: (state, action) => {
      const notif = state.items.find((item) => item.id === action.payload);
      if (notif) notif.isRead = true;
    },
  },
});

export const { setAppNotifications, markAppNotificationRead } = appNotificationSlice.actions;
export const selectAppNotifications = (state) => state.appNotifications.items;
export const selectUnreadAppNotificationCount = (state) => state.appNotifications.items.filter((item) => !item.isRead).length;
export default appNotificationSlice.reducer;
