import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Monitor,
  RefreshCw,
  Share,
  ShieldCheck,
  Smartphone,
  WifiOff,
} from 'lucide-react';
import InstallAppButton from '../components/pwa/InstallAppButton';
import { usePwaInstall } from '../hooks/usePwaInstall';

const BENEFITS = [
  {
    icon: WifiOff,
    title: 'Works offline',
    text: 'Keep billing at the counter when the Wi-Fi drops or the mobile data dies.',
  },
  {
    icon: Monitor,
    title: 'Its own window',
    text: 'Opens like a real till app. No browser tabs, no address bar to lose.',
  },
  {
    icon: Smartphone,
    title: 'Home-screen icon',
    text: 'One tap from the phone home screen or the desktop Start menu.',
  },
  {
    icon: RefreshCw,
    title: 'Bills sync themselves',
    text: 'Offline bills queue up and upload on their own once you are back online.',
  },
  {
    icon: ShieldCheck,
    title: 'Automatic updates',
    text: 'New versions arrive by themselves. Nothing to download or reinstall.',
  },
];

const BROWSER_STEPS = [
  {
    icon: Monitor,
    name: 'Chrome on Windows or Mac',
    steps: [
      'Open this page in Chrome on an https:// address.',
      'Click the install icon ⊞ at the right-hand end of the address bar.',
      'Click Install in the small box that appears.',
      'Galaxy Salon opens in its own window and appears in the Start menu or Applications folder.',
    ],
  },
  {
    icon: Smartphone,
    name: 'Chrome on Android',
    steps: [
      'Open this page in Chrome.',
      'Tap the Install Galaxy Salon button above, or the ⋮ menu, then Add to Home screen.',
      'Tap Install and confirm.',
      'Launch it from the new home-screen icon, not from Chrome.',
    ],
  },
  {
    icon: Share,
    name: 'Safari on iPhone or iPad',
    steps: [
      'Open this page in Safari. Chrome and other iPhone browsers cannot install apps.',
      'Tap the Share button, the square with an arrow pointing up.',
      'Scroll down the list and tap Add to Home Screen.',
      'Tap Add in the top-right corner.',
    ],
  },
  {
    icon: Download,
    name: 'Microsoft Edge',
    steps: [
      'Open this page in Edge on an https:// address.',
      'Click the install icon ⊞ in the address bar, or the ⋯ menu, then Apps, then Install this site as an app.',
      'Click Install.',
      'Say yes when Edge offers to pin it to the taskbar.',
    ],
  },
];

function resolveMode({ mounted, isStandalone, canInstall, isIOS, isSafari }) {
  // Order matters: an installed app never needs a prompt, and iOS never offers one at all.
  if (!mounted) return 'checking';
  if (isStandalone) return 'installed';
  if (canInstall) return 'ready';
  if (isIOS) return isSafari ? 'ios' : 'ios-other';
  return 'desktop';
}

function GuidanceStep({ number, children }) {
  return (
    <li className="flex gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
        {number}
      </span>
      <span className="text-sm text-gray-600 leading-relaxed">{children}</span>
    </li>
  );
}

function InstallGuidance({ mode }) {
  if (mode === 'checking') {
    // Placeholder keeps the card from collapsing during the one tick between the first
    // render and the effect in usePwaInstall that works out what this browser can do.
    return <p className="text-sm text-gray-400 text-center py-4">Checking this device...</p>;
  }

  if (mode === 'installed') {
    return (
      <div className="text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900">
          You&apos;re all set &mdash; the app is installed
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          You are looking at the installed app right now. Keep it on the home screen and open the
          till straight from there.
        </p>
        <Link
          href="/pos"
          className="inline-flex items-center justify-center mt-5 px-6 py-3 text-base font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 shadow-sm transition-all duration-150 active:scale-95"
        >
          Open the billing screen
        </Link>
      </div>
    );
  }

  if (mode === 'ready') {
    return (
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-900">This device is ready</h2>
        <p className="text-sm text-gray-500 mt-2">
          Tap the gold button above. It takes about three seconds and puts Galaxy Salon next to
          your other apps &mdash; no app store, nothing to download.
        </p>
      </div>
    );
  }

  if (mode === 'ios') {
    return (
      <div>
        <h2 className="text-lg font-bold text-gray-900 text-center">Add it from the Share menu</h2>
        <p className="text-sm text-gray-500 mt-2 mb-5 text-center">
          Safari on iPhone and iPad has no install button, so you add the app by hand. Four taps.
        </p>
        <ol className="space-y-3">
          <GuidanceStep number={1}>
            Tap the <strong>Share</strong> button &mdash; the square with an arrow pointing up, at
            the bottom of Safari (top-right on an iPad).
          </GuidanceStep>
          <GuidanceStep number={2}>
            Scroll down the grey list and tap <strong>Add to Home Screen</strong>.
          </GuidanceStep>
          <GuidanceStep number={3}>
            Tap <strong>Add</strong> in the top-right corner.
          </GuidanceStep>
          <GuidanceStep number={4}>
            Close Safari and open <strong>Galaxy Salon</strong> from the new home-screen icon.
          </GuidanceStep>
        </ol>
      </div>
    );
  }

  if (mode === 'ios-other') {
    return (
      <div>
        <h2 className="text-lg font-bold text-gray-900 text-center">Open this page in Safari</h2>
        <p className="text-sm text-gray-500 mt-2 mb-5 text-center">
          On an iPhone or iPad only Safari can put an app on the home screen. Chrome, Edge and
          Firefox cannot, whatever they offer you.
        </p>
        <ol className="space-y-3">
          <GuidanceStep number={1}>
            Open the browser menu and choose <strong>Open in Safari</strong>, or copy this page
            address and paste it into Safari.
          </GuidanceStep>
          <GuidanceStep number={2}>
            In Safari, tap the <strong>Share</strong> button at the bottom of the screen.
          </GuidanceStep>
          <GuidanceStep number={3}>
            Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
          </GuidanceStep>
        </ol>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 text-center">
        Use the install icon in the address bar
      </h2>
      <p className="text-sm text-gray-500 mt-2 mb-5 text-center">
        This browser has not offered an install prompt yet. Chrome and Edge always keep a manual
        way in.
      </p>
      <ol className="space-y-3">
        <GuidanceStep number={1}>
          Look at the right-hand end of the address bar for the install icon{' '}
          <span className="font-mono font-bold text-gray-800">&#8862;</span> &mdash; a small screen
          with an arrow. Click it, then click <strong>Install</strong>.
        </GuidanceStep>
        <GuidanceStep number={2}>
          No icon there? Open the browser menu &mdash; <strong>&#8942;</strong> in Chrome,{' '}
          <strong>&#8943;</strong> in Edge &mdash; and look for{' '}
          <strong>Install page as app</strong>, or <strong>Apps</strong> then{' '}
          <strong>Install this site as an app</strong>.
        </GuidanceStep>
        <GuidanceStep number={3}>
          Check the web address starts with <strong>https://</strong>. Browsers refuse to install an
          app from an insecure page, and Firefox on the desktop cannot install one at all.
        </GuidanceStep>
        <GuidanceStep number={4}>
          Still nothing? It is probably installed already. Look for Galaxy Salon in your Start menu
          or Applications folder.
        </GuidanceStep>
      </ol>
    </div>
  );
}

export default function InstallPage() {
  const { canInstall, isStandalone, isIOS, isSafari } = usePwaInstall();
  const [mounted, setMounted] = useState(false);

  // usePwaInstall can only sniff the browser from inside an effect, so the server render and
  // the first client render both look like "desktop, no prompt". Gating on mount stops an
  // iPhone user seeing a flash of the wrong instructions before the right ones swap in.
  useEffect(() => {
    setMounted(true);
  }, []);

  const mode = resolveMode({ mounted, isStandalone, canInstall, isIOS, isSafari });

  // InstallAppButton renders null when there is nothing it can do (already installed, or a
  // desktop browser that has not offered a prompt). Mirror its own condition here so the
  // caption underneath does not sit in the hero on its own with no button above it.
  const showInstallButton = mounted && !isStandalone && (canInstall || isIOS);

  return (
    <>
      <Head>
        <title>Install Galaxy Salon on this device</title>
        <meta
          name="description"
          content="Install the Galaxy Salon till on this phone, tablet or computer. It works offline at the counter and syncs bills automatically."
        />
      </Head>

      {/* Deliberately no auth guard and no DashboardLayout: a staff member who has never
          signed in still has to be able to reach this page and install the app. */}
      <div className="min-h-screen bg-gray-50">
        {/* Hero uses the same indigo-to-purple ramp as the app icons */}
        <header className="bg-gradient-to-br from-primary-600 via-primary-700 to-salon-purple text-white">
          <div className="max-w-5xl mx-auto px-4 py-10 sm:py-16 text-center">
            {/* Plain img rather than next/image: this is a fixed static icon and the page must
                render identically when it is served from the offline cache. */}
            <img
              src="/icons/icon-192.png"
              alt="Galaxy Salon app icon"
              width={96}
              height={96}
              className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl shadow-2xl ring-1 ring-white/30"
            />
            <h1 className="text-3xl sm:text-4xl font-bold mt-5">&#10024; Galaxy Salon</h1>
            <p className="text-sm sm:text-base text-white/80 mt-1">
              Unisex Saloon &amp; Beauty Academy
            </p>
            <p className="text-base sm:text-lg text-white/90 mt-5 max-w-xl mx-auto leading-relaxed">
              Install the till on this device. It keeps working at the counter with no internet,
              and every bill syncs itself the moment you are back online.
            </p>

            {showInstallButton && (
              <div className="mt-8">
                <InstallAppButton size="lg" variant="gold" label="Install Galaxy Salon" />
                <p className="text-xs text-white/70 mt-3">
                  Free. No app store, nothing to download.
                </p>
              </div>
            )}
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 pb-12 sm:pb-16">
          {/* State-aware panel, pulled up so it overlaps the bottom of the hero */}
          <section className="-mt-6 sm:-mt-8">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
              <InstallGuidance mode={mode} />
            </div>
          </section>

          <section className="mt-10 sm:mt-14">
            <h2 className="text-xl font-bold text-gray-900 text-center">What you get</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
              {BENEFITS.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={benefit.title}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center"
                  >
                    <Icon className="w-6 h-6 text-primary-600 mx-auto" />
                    <h3 className="text-sm font-semibold text-gray-900 mt-3">{benefit.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{benefit.text}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-10 sm:mt-14">
            <h2 className="text-xl font-bold text-gray-900 text-center">Step by step, per browser</h2>
            <p className="text-sm text-gray-500 text-center mt-2">
              Find your browser below. Every route ends with the same app.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              {BROWSER_STEPS.map((browser) => {
                const Icon = browser.icon;
                return (
                  <div
                    key={browser.name}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5" />
                      </span>
                      <h3 className="text-sm font-bold text-gray-900">{browser.name}</h3>
                    </div>
                    <ol className="space-y-3">
                      {browser.steps.map((step, index) => (
                        <GuidanceStep key={step} number={index + 1}>
                          {step}
                        </GuidanceStep>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Short version of the offline rules; the full set lives in PWA-GUIDE.md */}
          <section className="mt-10 sm:mt-14">
            <div className="bg-salon-dark text-white rounded-2xl p-6 sm:p-8">
              <h2 className="text-lg font-bold">Before you rely on it offline</h2>
              <ul className="mt-4 space-y-3 text-sm text-white/80 leading-relaxed">
                <li>
                  <span className="text-salon-gold font-semibold">Sign in once while online.</span>{' '}
                  Logging in needs a connection, so do it before you lose signal.
                </li>
                <li>
                  <span className="text-salon-gold font-semibold">Cash bills only offline.</span>{' '}
                  UPI and card payments go through the payment gateway, which needs the internet.
                </li>
                <li>
                  <span className="text-salon-gold font-semibold">Bills queue on this device.</span>{' '}
                  An offline bill stays on the phone or PC that took it until the connection
                  returns, and only then gets its real bill number.
                </li>
              </ul>
            </div>
          </section>

          <footer className="mt-10 sm:mt-14 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
            <p className="text-xs text-gray-400 mt-4">
              Galaxy Unisex Saloon &amp; Beauty Academy &copy; {new Date().getFullYear()}
            </p>
          </footer>
        </main>
      </div>
    </>
  );
}
