import { useEffect } from 'react';
import { startAutoSync, stopAutoSync } from '../../lib/syncManager';
import InstallBanner from './InstallBanner';
import UpdateToast from './UpdateToast';

// Kept at module scope, not in state: controllerchange can fire more than once per
// activation, and a per-component flag would reset on every remount - either way the
// page could reload in a loop.
let hasReloadedForUpdate = false;

// Matches the literal in UpdateToast.js. Deliberately duplicated instead of shared
// through an import, because PwaProvider renders UpdateToast and importing back the
// other way would create a circular module.
const SW_WAITING_EVENT = 'galaxy:swwaiting';

/**
 * App-root PWA host: registers the service worker, drives background bill sync and
 * renders the install / update surfaces.
 */
export default function PwaProvider({ children }) {
  useEffect(() => {
    try {
      startAutoSync();
    } catch (err) {
      // Auto-sync is best-effort; without IndexedDB the app just stays online-only.
    }
    return () => {
      try {
        stopAutoSync();
      } catch (err) {
        // ignore - nothing to tear down
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return undefined;

    if (process.env.NODE_ENV !== 'production') {
      // Next's dev server rebuilds bundles on every save, while a service worker
      // keeps serving whatever it cached from a previous production build. Unregister
      // so a developer who once ran `next start` is not stuck on a stale app.
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => registrations.forEach((registration) => registration.unregister()))
        .catch(() => { /* nothing we can do, and nothing worth breaking dev over */ });
      return undefined;
    }

    let disposed = false;

    const announceWaiting = (registration) => {
      if (disposed || !registration || !registration.waiting) return;
      window.dispatchEvent(new CustomEvent(SW_WAITING_EVENT, { detail: registration }));
    };

    const watchForUpdates = (registration) => {
      if (!registration) return;

      // An update may already be parked from an earlier visit.
      announceWaiting(registration);

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          // 'installed' while a controller exists means this is an update waiting for
          // the current page to release the old worker - not a first-time install.
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            announceWaiting(registration);
          }
        });
      });
    };

    const register = () => {
      navigator.serviceWorker.register('/sw.js')
        .then(watchForUpdates)
        .catch(() => { /* a failed registration must never take the app down */ });
    };

    // Registering during load competes with the page's own resources for bandwidth.
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register);

    // Null until the very first worker claims this page. That claim also fires
    // controllerchange, but it is an install rather than an update - reloading there
    // would throw away the bill a cashier is halfway through ringing up. Tracked with
    // let, not const, so the claim promotes the page to "controlled" and a genuine
    // update later in the same session still reloads.
    let hadController = !!navigator.serviceWorker.controller;

    const handleControllerChange = () => {
      if (!hadController) {
        hadController = true;
        return;
      }
      if (hasReloadedForUpdate) return;
      hasReloadedForUpdate = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      disposed = true;
      window.removeEventListener('load', register);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return (
    <>
      {children}
      <InstallBanner />
      <UpdateToast />
    </>
  );
}
