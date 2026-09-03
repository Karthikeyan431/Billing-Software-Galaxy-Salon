import { Html, Head, Main, NextScript } from 'next/document';

// Kept as a plain string so the browser gets it verbatim, before any React code runs.
const installPromptBridge = `
window.__galaxyInstallEvent = null;
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  window.__galaxyInstallEvent = e;
  window.dispatchEvent(new Event('galaxy:installready'));
});
window.addEventListener('appinstalled', function () {
  window.__galaxyInstallEvent = null;
  window.dispatchEvent(new Event('galaxy:appinstalled'));
});
`;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* No viewport meta here on purpose - Next.js expects it in _app (or a page Head)
            and logs a warning when _document defines it. It lives in _app.js. */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#4263eb" />
        <meta name="application-name" content="Galaxy Salon" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS ignores the manifest for standalone launch and title, so Safari needs its
            own meta tags to open the installed app full-screen with our branding. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* Deliberately `default` and not `black-translucent`: black-translucent lays
            the web view out UNDER the iOS status bar, so every header (dashboard,
            login, /install) would have to reserve env(safe-area-inset-top) or sit
            unreadable and untappable beneath the clock and battery icons. */}
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Galaxy Salon" />

        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />

        {/* This must run before hydration: Chrome usually fires `beforeinstallprompt`
            while the page is still parsing, so a listener registered later from a
            useEffect would never see it and the install button could never appear.
            The event is parked on window.__galaxyInstallEvent and announced via
            `galaxy:installready`, which is what usePwaInstall reads/listens for. */}
        <script dangerouslySetInnerHTML={{ __html: installPromptBridge }} />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
