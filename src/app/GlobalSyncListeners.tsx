import React, { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAppDispatch } from '../store/hooks';
import { setOnline } from '../store/slices/networkSlice';
import { setPendingCount } from '../store/slices/syncSlice';
import { getRealm, TaskRecord } from '../data/realm';
import { useAuth } from '../auth/AuthContext';

const GlobalSyncListeners: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  useEffect(() => {
    // Connectivity listener
    const unsubscribeNet = NetInfo.addEventListener(state => {
      const isOnline = Boolean(state.isConnected && state.isInternetReachable);
      dispatch(setOnline(isOnline));
    });
    // Initial fetch
    NetInfo.fetch().then(net => {
      dispatch(setOnline(Boolean(net.isConnected && net.isInternetReachable)));
    });
    return () => {
      unsubscribeNet?.();
    };
  }, [dispatch]);

  useEffect(() => {
    // Pending (dirty) items listener per user
    let pendingResults: any | null = null;
    let cancelled = false;

    const attach = async () => {
      if (!user?.uid) {
        dispatch(setPendingCount(0));
        return;
      }
      const realm = await getRealm();
      if (cancelled) return;
      pendingResults = realm
        .objects<TaskRecord>('Task')
        .filtered('userId == $0 AND dirty == true', user.uid);
      const update = () => dispatch(setPendingCount(pendingResults.length));
      update();
      pendingResults.addListener(update);
    };

    attach();
    return () => {
      try { pendingResults?.removeAllListeners?.(); } catch {}
      cancelled = true;
    };
  }, [user?.uid, dispatch]);

  return null;
};

export default GlobalSyncListeners;
