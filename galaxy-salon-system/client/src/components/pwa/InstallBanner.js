import { useState, useEffect } from 'react';
import InstallAppButton from './InstallAppButton';
import { usePwaInstall } from '../../hooks/usePwaInstall';

const DISMISS_KEY = 'galaxy:install-dismissed';
// Re-ask after two weeks instead of never: staff who dismissed the prompt on a shared
// counter device would otherwise never be offered the offline-capable install again.
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const APPEAR_DELAY_MS = 4000;

function isDismissalStillFresh() {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const dismissedAt = parsed && typeof parsed === 'object' ? Number(parsed.dismissedAt) : Number(parsed);
    if (!dismissedAt || Number.isNaN(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_TTL_MS;
  } catch (err) {
    // Private mode or a corrupted value: showing the banner is the safer failure.
    return false;
  }
}

export default function InstallBanner() {
  const { canInstall, isStandalone, isIOS } = usePwaInstall();
  // Assume dismissed until localStorage has actually been read, so the banner cannot
  // flash on screen during hydration and then vanish.
  const [dismissed, setDismissed] = useState(true);
  const [delayElapsed, setDelayElapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    setDismissed(isDismissalStillFresh());

    // Hold the banner back for a few seconds so it does not land on top of the login
    // form the moment the app opens.
    const timer = setTimeout(() => setDelayElapsed(true), APPEAR_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, JSON.stringify({ dismissedAt: Date.now() }));
    } catch (err) {
      // Storage blocked - the banner still hides for this session.
    }
  };

  const installable = !isStandalone && (canInstall || isIOS);
  if (!installable || dismissed || !delayElapsed) return null;

  // The inline padding uses env() so the card clears the iPhone home indicator and the
  // Android gesture bar; Tailwind has no utility for safe-area insets.
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 px-3 pointer-events-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-xl shadow-xl bg-gradient-to-r from-salon-dark via-salon-purple to-primary-600 text-white">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <span className="text-xl leading-none flex-none" aria-hidden="true">✨</span>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">Install Galaxy Salon</p>
            <p className="text-xs text-white/80 leading-snug mt-0.5">
              Add it to your home screen to keep billing when the internet drops.
            </p>
          </div>

          <div className="flex-none flex items-center gap-1.5">
            <InstallAppButton size="sm" variant="gold" label="Install" className="whitespace-nowrap" />
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
