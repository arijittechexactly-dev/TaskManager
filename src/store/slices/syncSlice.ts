import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export type SyncState = {
  pendingCount: number;
};

const initialState: SyncState = {
  pendingCount: 0,
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setPendingCount(state, action: PayloadAction<number>) {
      state.pendingCount = action.payload;
    },
  },
});

export const {setPendingCount} = syncSlice.actions;
export default syncSlice.reducer;
