import { useState, useEffect } from 'react';

/**
 * Tracks browser connectivity.
 * Starts as `online: true` on purpose: navigator.onLine does not exist during the
 * server render, so reading it in useState would make the SSR markup and the first
 * client render disagree and blow up hydration. The real value is applied in the
 * effect, one tick later.
 */
export function useOnlineStatus() {
  const [state, setState] = useState({ online: true, lastChangedAt: null });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const apply = (online) => {
      setState((prev) => (
        prev.online === online ? prev : { online, lastChangedAt: new Date().toISOString() }
      ));
    };

    // Some very old browsers do not implement navigator.onLine; treat only an
    // explicit `false` as offline so an undefined value does not fake a dropout.
    apply(typeof navigator === 'undefined' || navigator.onLine !== false);

    const handleOnline = () => apply(true);
    const handleOffline = () => apply(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return state;
}

export default useOnlineStatus;
