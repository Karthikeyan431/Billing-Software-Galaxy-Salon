/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  },
  // sw.js must never be cached by the CDN or the browser. A service worker is the one
  // file that can pin users to an old build forever: if a stale copy is served, it keeps
  // handing out its own stale caches and no deploy can reach the device. must-revalidate
  // with max-age=0 forces a freshness check on every registration, so an update always
  // lands. Service-Worker-Allowed: / keeps the worker's scope at the origin root.
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
