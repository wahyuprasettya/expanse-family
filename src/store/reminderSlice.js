// ============================================================
// Reminder Slice
// ============================================================
import { createSlice, createSelector } from '@reduxjs/toolkit';

const reminderSlice = createSlice({
  name: 'reminders',
  initialState: { items: [], isLoading: false, error: null },
  reducers: {
    setReminders: (state, action) => { state.items = action.payload; },
    addReminderLocal: (state, action) => { state.items.push(action.payload); },
    removeReminderLocal: (state, action) => {
      state.items = state.items.filter((r) => r.id !== action.payload);
    },
    toggleReminderLocal: (state, action) => {
      const r = state.items.find((r) => r.id === action.payload);
      if (r) r.isActive = !r.isActive;
    },
    setLoading: (state, action) => { state.isLoading = action.payload; },
    setError: (state, action) => { state.error = action.payload; },
  },
});

export const { setReminders, addReminderLocal, removeReminderLocal, toggleReminderLocal, setLoading } =
  reminderSlice.actions;

export const selectReminders = (state) => state.reminders.items;
export const selectRemindersLoading = (state) => state.reminders.isLoading;
const selectReminderWindowKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
};

export const selectUpcomingReminders = createSelector(
  [selectReminders, selectReminderWindowKey],
  (reminders) => {
    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);

    return reminders
      .filter((r) => r.isActive && new Date(r.dueDate) <= in7Days)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }
);

export default reminderSlice.reducer;
