// ============================================================
// Asset Slice
// ============================================================
import { createSlice, nanoid } from '@reduxjs/toolkit';

const assetSlice = createSlice({
  name: 'assets',
  initialState: {
    items: [],
  },
  reducers: {
    addAssetLocal: {
      reducer: (state, action) => {
        state.items.unshift(action.payload);
      },
      prepare: (asset) => ({
        payload: {
          id: asset.id || nanoid(),
          ...asset,
          createdAt: asset.createdAt || new Date().toISOString(),
        },
      }),
    },
    updateAssetLocal: (state, action) => {
      const index = state.items.findIndex((item) => item.id === action.payload.id);
      if (index !== -1) state.items[index] = { ...state.items[index], ...action.payload };
    },
    removeAssetLocal: (state, action) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    setAssets: (state, action) => {
      state.items = action.payload;
    },
  },
});

export const { addAssetLocal, updateAssetLocal, removeAssetLocal, setAssets } = assetSlice.actions;
export const selectAssets = (state) => state.assets.items;
export default assetSlice.reducer;
