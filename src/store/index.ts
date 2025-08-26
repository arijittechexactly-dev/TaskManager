import {configureStore} from '@reduxjs/toolkit';
import networkReducer from './slices/networkSlice';
import syncReducer from './slices/syncSlice';

export const store = configureStore({
  reducer: {
    network: networkReducer,
    sync: syncReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
