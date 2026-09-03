import { useState, useEffect, useCallback } from 'react';
import { subscribeSync, syncPendingBills, retryFailedBill, discardFailedBill } from '../lib/syncManager';

const INITIAL_STATE = {
  pending: 0,
  syncing: false,
  lastSyncAt: null,
  lastError: null,
  online: true,
  failed: 0,
  failedBills: [],
};

/**
 * Mirrors the syncManager store into React state.
 * subscribeSync fires immediately with the current state, so there is no separate
 * getSyncState() read here - that would just duplicate the first callback.
 */
export function useSyncStatus() {
  const [state, setState] = useState(INITIAL_STATE);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let unsubscribe = null;
    try {
      unsubscribe = subscribeSync((next) => {
        // Merge over the defaults so a partial state can never leave `pending`
        // undefined and render "Syncing undefined bills".
        setState({ ...INITIAL_STATE, ...(next || {}) });
      });
    } catch (err) {
      // Offline queueing needs IndexedDB; a browser without it must still render
      // the header rather than crash the whole page.
      unsubscribe = null;
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const syncNow = useCallback(async () => {
    try {
      return await syncPendingBills({ force: true });
    } catch (err) {
      // syncManager already records the failure in its own state (lastError),
      // so swallow it here and let the UI read it from the subscription.
      return null;
    }
  }, []);

  // Both act on a bill the server permanently refused. They are exposed here rather than
  // called directly so every consumer goes through the same subscription and re-renders
  // together when the failed list changes.
  const retryFailed = useCallback(async (clientRef) => {
    try {
      return await retryFailedBill(clientRef);
    } catch (err) {
      return null;
    }
  }, []);

  const discardFailed = useCallback(async (clientRef) => {
    try {
      return await discardFailedBill(clientRef);
    } catch (err) {
      return false;
    }
  }, []);

  return { ...state, syncNow, retryFailed, discardFailed };
}

export default useSyncStatus;
