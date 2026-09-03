import { useState, useEffect, useCallback } from 'react';
import Button from '../ui/Button';

// Matches the literal in PwaProvider.js - see the note there on why it is duplicated
// rather than imported.
const SW_WAITING_EVENT = 'galaxy:swwaiting';
// If the worker never calls skipWaiting (or the message is dropped), reload anyway so
// the button is never a dead end.
const RELOAD_FALLBACK_MS = 3000;

export default function UpdateToast() {
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return undefined;

    let disposed = false;

    const adopt = (registration) => {
      if (disposed || !registration || !registration.waiting) return;
      // No controller means this is the very first install, not an update - there is
      // nothing for the user to reload into.
      if (!navigator.serviceWorker.controller) return;
      setWaitingWorker(registration.waiting);
    };

    // Two paths on purpose: the provider's event catches an update that arrives while
    // this page is open, and the direct lookup catches one that was already waiting
    // before this component mounted.
    const handleWaitingEvent = (event) => adopt(event && event.detail);
    window.addEventListener(SW_WAITING_EVENT, handleWaitingEvent);

    if (typeof navigator.serviceWorker.getRegistration === 'function') {
      navigator.serviceWorker.getRegistration()
        .then(adopt)
        .catch(() => { /* no registration yet - the event path still covers us */ });
    }

    return () => {
      disposed = true;
      window.removeEventListener(SW_WAITING_EVENT, handleWaitingEvent);
    };
  }, []);

  const handleReload = useCallback(() => {
    setReloading(true);

    if (!waitingWorker || typeof waitingWorker.postMessage !== 'function') {
      window.location.reload();
      return;
    }

    try {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } catch (err) {
      window.location.reload();
      return;
    }

    // PwaProvider reloads on controllerchange; this timer only fires if that never
    // happens (the page unloads first in the normal case).
    setTimeout(() => window.location.reload(), RELOAD_FALLBACK_MS);
  }, [waitingWorker]);

  if (!waitingWorker) return null;

  return (
    // Lifted a banner's height off the bottom edge: InstallBanner is pinned to
    // bottom-0 and the two can be on screen together, so sitting flush would bury its
    // Install and dismiss buttons.
    <div
      className="fixed z-50 left-3 right-3 bottom-20 sm:left-auto sm:right-4 sm:w-auto"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="status"
    >
      <div className="mx-auto sm:mx-0 max-w-sm flex items-center gap-3 rounded-xl bg-salon-dark text-white shadow-xl px-4 py-3">
        <span className="text-lg leading-none flex-none" aria-hidden="true">🚀</span>
        <p className="flex-1 text-sm leading-snug">A new version is available</p>
        <Button variant="gold" size="sm" onClick={handleReload} disabled={reloading} className="flex-none">
          {reloading ? 'Reloading...' : 'Reload'}
        </Button>
        <button
          type="button"
          onClick={() => setWaitingWorker(null)}
          aria-label="Dismiss update notice"
          className="flex-none p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
