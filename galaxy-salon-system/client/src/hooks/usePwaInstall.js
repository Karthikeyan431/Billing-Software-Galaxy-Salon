import { useState, useEffect, useCallback } from 'react';

function detectStandalone() {
  if (typeof window === 'undefined') return false;
  const displayMode = typeof window.matchMedia === 'function'
    && window.matchMedia('(display-mode: standalone)').matches;
  // navigator.standalone is the iOS-only flag for "launched from the home screen";
  // iOS Safari never reports display-mode: standalone.
  return Boolean(displayMode || (window.navigator && window.navigator.standalone === true));
}

function detectIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ ships a desktop-Safari user agent that claims "Macintosh"; a Mac has
  // no touch points, so maxTouchPoints is the only reliable way to spot an iPad.
  return /Macintosh/.test(ua) && Number(navigator.maxTouchPoints) > 1;
}

function detectSafari() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // Every iOS browser is Safari under the hood and carries "Safari" in its UA, so
  // real Safari is what is left after excluding the wrappers' own tokens.
  return /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|OPiOS|OPR\/|Edg\//i.test(ua);
}

/**
 * Exposes the install state of the PWA.
 * The beforeinstallprompt event is stashed on window by the inline script in
 * _document.js, because Chrome usually fires it before React hydrates and a
 * listener registered inside an effect would never see it.
 */
export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncFromWindow = () => {
      const standalone = detectStandalone();
      setIsStandalone(standalone);
      setCanInstall(Boolean(window.__galaxyInstallEvent) && !standalone);
    };

    setIsIOS(detectIOS());
    setIsSafari(detectSafari());
    syncFromWindow();

    const handleInstallReady = () => syncFromWindow();
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setCanInstall(false);
    };

    window.addEventListener('galaxy:installready', handleInstallReady);
    window.addEventListener('galaxy:appinstalled', handleAppInstalled);

    // display-mode flips live when the user opens the installed app, so keep the
    // banner/button in step instead of waiting for a reload.
    let media = null;
    const handleDisplayModeChange = (event) => {
      setIsStandalone(event.matches);
      if (event.matches) setCanInstall(false);
    };
    if (typeof window.matchMedia === 'function') {
      media = window.matchMedia('(display-mode: standalone)');
      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', handleDisplayModeChange);
      } else if (typeof media.addListener === 'function') {
        media.addListener(handleDisplayModeChange); // Safari < 14
      }
    }

    return () => {
      window.removeEventListener('galaxy:installready', handleInstallReady);
      window.removeEventListener('galaxy:appinstalled', handleAppInstalled);
      if (media) {
        if (typeof media.removeEventListener === 'function') {
          media.removeEventListener('change', handleDisplayModeChange);
        } else if (typeof media.removeListener === 'function') {
          media.removeListener(handleDisplayModeChange);
        }
      }
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (typeof window === 'undefined') return 'unavailable';

    const event = window.__galaxyInstallEvent;
    if (!event || typeof event.prompt !== 'function') return 'unavailable';

    // A beforeinstallprompt event can only be prompted once, so drop the reference
    // before awaiting the choice - a double click would otherwise throw.
    window.__galaxyInstallEvent = null;
    // This hook is mounted in several places at once (header button, install banner,
    // /install page) and only this instance re-derives its own state. The event is
    // reused as a generic "install state changed" signal so the other instances drop
    // canInstall too, instead of leaving buttons that error when clicked.
    window.dispatchEvent(new Event('galaxy:installready'));
    setCanInstall(false);

    try {
      event.prompt();
      const choice = await event.userChoice;
      return choice && choice.outcome === 'accepted' ? 'accepted' : 'dismissed';
    } catch (err) {
      return 'unavailable';
    }
  }, []);

  return { canInstall, isStandalone, isIOS, isSafari, promptInstall };
}

export default usePwaInstall;
