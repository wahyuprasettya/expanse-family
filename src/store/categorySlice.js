// ============================================================
// Category Slice
// ============================================================
import { createSlice } from '@reduxjs/toolkit';
import { DEFAULT_CATEGORIES } from '@constants/categories';

const categorySlice = createSlice({
  name: 'categories',
  initialState: {
    items: DEFAULT_CATEGORIES,
    isLoading: false,
    error: null,
  },
  reducers: {
    setCategories: (state, action) => { state.items = action.payload; },
    addCategoryLocal: (state, action) => { state.items.push(action.payload); },
    removeCategoryLocal: (state, action) => {
      state.items = state.items.filter((c) => c.id !== action.payload);
    },
    setLoading: (state, action) => { state.isLoading = action.payload; },
    setError: (state, action) => { state.error = action.payload; },
  },
});

export const { setCategories, addCategoryLocal, removeCategoryLocal, setLoading, setError } =
  categorySlice.actions;

export const selectCategories = (state) => state.categories.items;
export const selectCategoriesByType = (type) => (state) =>
  state.categories.items.filter((c) => c.type === type || c.type === 'both');

export default categorySlice.reducer;
