import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export type NetworkState = {
  online: boolean;
};

const initialState: NetworkState = {
  online: false,
};

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setOnline(state, action: PayloadAction<boolean>) {
      state.online = action.payload;
    },
  },
});

export const {setOnline} = networkSlice.actions;
export default networkSlice.reducer;
