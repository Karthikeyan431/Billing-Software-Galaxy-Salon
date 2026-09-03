import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { cn } from '../../utils/helpers';

export default function InstallAppButton({ className, variant = 'gold', size = 'sm', label = 'Install App' }) {
  const { canInstall, isStandalone, isIOS, isSafari, promptInstall } = usePwaInstall();
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [prompting, setPrompting] = useState(false);

  // Already launched from the home screen - there is nothing left to install.
  if (isStandalone) return null;
  // iOS Safari never fires beforeinstallprompt, so canInstall is always false there;
  // the button stays visible and explains the manual Share flow instead.
  if (!canInstall && !isIOS) return null;

  const handleClick = async () => {
    if (!canInstall) {
      setShowIosSteps(true);
      return;
    }

    setPrompting(true);
    const outcome = await promptInstall();
    setPrompting(false);

    if (outcome === 'accepted') toast.success('Installing Galaxy Salon...');
    else if (outcome === 'dismissed') toast('Maybe next time', { icon: '👍' });
    else toast.error('Install is not available in this browser');
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn('gap-1.5', className)}
        onClick={handleClick}
        disabled={prompting}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
        </svg>
        {label}
      </Button>

      <Modal
        isOpen={showIosSteps}
        onClose={() => setShowIosSteps(false)}
        title="Add to Home Screen"
        size="sm"
      >
        <div className="space-y-4 text-sm text-gray-600">
          <p>
            Install Galaxy Salon on this device to bill customers even when the internet drops.
          </p>
          {isIOS && !isSafari && (
            <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800">
              Only Safari can add apps to the iOS home screen. Open this page in Safari first.
            </p>
          )}
          <ol className="space-y-2">
            <li className="flex gap-3">
              <span className="flex-none w-6 h-6 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold flex items-center justify-center">1</span>
              <span>Tap the <span className="font-medium text-gray-900">Share</span> button in the browser toolbar.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-none w-6 h-6 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold flex items-center justify-center">2</span>
              <span>Scroll down and choose <span className="font-medium text-gray-900">Add to Home Screen</span>.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-none w-6 h-6 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold flex items-center justify-center">3</span>
              <span>Tap <span className="font-medium text-gray-900">Add</span> - Galaxy Salon appears with your other apps.</span>
            </li>
          </ol>
          <div className="pt-2 flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setShowIosSteps(false)}>Got it</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
