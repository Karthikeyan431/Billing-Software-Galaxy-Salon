/*
 * Galaxy Salon service worker - hand written, no workbox.
 * It lives at /sw.js (not under /_next) so its scope is the whole origin.
 *
 * Design rules baked in below:
 *  - only GET is intercepted, so bills, logins and stock writes always hit the network;
 *  - nothing is served from cache for money/auth endpoints;
 *  - every cache.put is guarded, because a full device (QuotaExceededError) must
 *    degrade to "no cache", never to "the app stopped fetching".
 */

// Bump VERSION alone to invalidate everything: each cache name is derived from it and
// activate() deletes any cache that is not in CURRENT_CACHES.
const VERSION = 'v1';
const SHELL_CACHE = 'galaxy-shell-' + VERSION;
const ASSET_CACHE = 'galaxy-assets-' + VERSION;
const DATA_CACHE = 'galaxy-data-' + VERSION;
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE, DATA_CACHE];

const OFFLINE_URL = '/offline.html';

// Kept deliberately small: the Next.js build output is content hashed and picked up
// lazily by the runtime handlers, so precaching it here would only go stale.
// Each URL is precached into the same cache its fetch handler later reads from,
// so a precached entry is actually a hit instead of being fetched a second time.
const PRECACHE_SHELL_URLS = [OFFLINE_URL, '/manifest.webmanifest'];
const PRECACHE_ASSET_URLS = [
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png'
];

// The only API GETs worth replaying offline: the POS cannot render a bill form
// without services, products, employees and customers.
const CACHEABLE_API_PATHS = ['/services', '/products', '/employees', '/customers'];

// A stale answer on any of these means a wrong balance, a phantom login or a
// duplicated bill, so they are never read from or written to the cache.
const NEVER_CACHE_API_PATHS = ['/auth', '/bills', '/reports', '/payment'];

// A cache hit is indistinguishable from a live 200 to the page, so the till would keep
// selling at yesterday's prices with no warning. Catalogue responses are stamped with the
// time they were stored and marked again on the way back out, and dataService reads both.
const SW_CACHE_HEADER = 'X-Galaxy-SW-Cache';
const SW_CACHED_AT_HEADER = 'X-Galaxy-SW-Cached-At';

// Optional hint from the page (postMessage SET_API_ORIGIN). The API base URL is inlined
// into the client bundle at build time and this file is served statically, so the worker
// cannot read it - the '/api' path prefix below is the primary signal.
let apiOriginHint = '';

function isApiRequest(url) {
  if (apiOriginHint && url.origin === apiOriginHint) return true;
  return url.pathname === '/api' || url.pathname.indexOf('/api/') === 0;
}

function collectionMatches(collection, fragments) {
  for (let i = 0; i < fragments.length; i += 1) {
    if (fragments[i] === '/' + collection) return true;
  }
  return false;
}

function isCatalogueApiRequest(url) {
  const segments = url.pathname.split('/').filter(function (part) {
    return part.length > 0;
  });
  // The API is mounted under /api on this origin, or at the root of the API origin.
  if (segments[0] === 'api') segments.shift();
  // Matched segment by segment, never as a substring: '/employees' is also a substring of
  // '/employees/<id>/performance', so the old test cached commission and revenue figures -
  // exactly the money data this worker promises never to serve stale. Only a whole
  // collection ('/api/services') or one document ('/api/customers/<id>') is a plain read;
  // anything deeper is a sub-resource (/performance, /bills, /fee-payment).
  if (segments.length < 1 || segments.length > 2) return false;
  if (collectionMatches(segments[0], NEVER_CACHE_API_PATHS)) return false;
  return collectionMatches(segments[0], CACHEABLE_API_PATHS);
}

// Content hashed build output and the icon set never change under a given URL.
function isImmutableAsset(url) {
  const path = url.pathname;
  return (
    path.indexOf('/_next/static/') === 0 ||
    path.indexOf('/icons/') === 0 ||
    path === '/favicon.ico' ||
    path === '/apple-touch-icon.png'
  );
}

// Opaque responses have status 0 and an unreadable body: caching one would let a failed
// cross-origin request masquerade as a good shell entry.
function isCacheable(response) {
  return !!response && response.status === 200 && response.type !== 'opaque';
}

async function safePut(cacheName, request, response) {
  if (!isCacheable(response)) return;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  } catch (err) {
    // QuotaExceededError or a blocked storage partition - keep serving the network copy.
  }
}

async function precacheInto(cacheName, urls) {
  const cache = await caches.open(cacheName);
  // Added one by one instead of addAll(): addAll is atomic, so a single 404 would abort
  // the whole install and leave the app with no offline fallback at all.
  await Promise.all(
    urls.map(function (url) {
      // cache: 'reload' bypasses the HTTP cache, so a deploy cannot precache a stale copy.
      return cache.add(new Request(url, { cache: 'reload' })).catch(function () {});
    })
  );
}

async function precache() {
  await Promise.all([
    precacheInto(SHELL_CACHE, PRECACHE_SHELL_URLS),
    precacheInto(ASSET_CACHE, PRECACHE_ASSET_URLS)
  ]);
}

self.addEventListener('install', function (event) {
  // No unconditional skipWaiting(): a cashier mid-bill must not be swapped onto a new
  // worker under their feet. UpdateToast sends SKIP_WAITING when the user opts in.
  event.waitUntil(precache());
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    (async function () {
      const names = await caches.keys();
      await Promise.all(
        names.map(function (name) {
          if (CURRENT_CACHES.indexOf(name) !== -1) return Promise.resolve(false);
          // Only ever delete our own caches - other tools on the origin may own theirs.
          if (name.indexOf('galaxy-') !== 0) return Promise.resolve(false);
          return caches.delete(name);
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', function (event) {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'CLEAR_DATA_CACHE') {
    // Sent on logout. The cached catalogue holds customer PII and employee commission
    // rows, which must not outlive the session on a till that several staff share.
    event.waitUntil(caches.delete(DATA_CACHE));
    return;
  }
  if (data.type === 'SET_API_ORIGIN' && typeof data.origin === 'string') {
    apiOriginHint = data.origin;
  }
});

// Rebuilt on the way in so the entry carries the moment it was stored: without it a later
// hit can only say "this is old", not how old, and the POS toast would have no time to show.
async function putStampedInDataCache(request, response) {
  if (!isCacheable(response)) return;
  let stamped;
  try {
    const body = await response.blob();
    const headers = new Headers(response.headers);
    headers.set(SW_CACHED_AT_HEADER, new Date().toISOString());
    stamped = new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
  } catch (err) {
    // Unreadable body - skip the cache write rather than lose the live response.
    return;
  }
  await safePut(DATA_CACHE, request, stamped);
}

// Rebuilt again on the way out, from a clone so the cached entry survives for the next hit.
// The marker is what stops dataService writing a fresh cachedAt over hours-old prices.
async function markAsCacheHit(cached) {
  try {
    const body = await cached.clone().blob();
    const headers = new Headers(cached.headers);
    headers.set(SW_CACHE_HEADER, 'hit');
    return new Response(body, {
      status: 200,
      statusText: cached.statusText || 'OK',
      headers: headers
    });
  } catch (err) {
    // Unmarked stale data still beats a hard offline error for a cashier mid-sale.
    return cached;
  }
}

async function apiNetworkFirst(request) {
  try {
    const response = await fetch(request);
    // Clone before returning: a Response body can only be read once.
    await putStampedInDataCache(request, response.clone());
    return response;
  } catch (err) {
    const cached = await caches.match(request, { cacheName: DATA_CACHE });
    if (cached) return markAsCacheHit(cached);
    // A synthetic 503 keeps axios on its normal error path. It must never be a 401,
    // or the api.js interceptor would bounce an offline cashier out to /login.
    return new Response(
      JSON.stringify({ success: false, offline: true, message: 'You are offline and this data is not cached.' }),
      { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// The character class stops at the quote or bracket that closes the reference in the markup.
const NEXT_STATIC_URL_RE = /\/_next\/static\/[A-Za-z0-9._~%\-/]+/g;

function extractNextStaticUrls(html) {
  const urls = [];
  const seen = {};
  let match;
  NEXT_STATIC_URL_RE.lastIndex = 0;
  while ((match = NEXT_STATIC_URL_RE.exec(html)) !== null) {
    const found = match[0];
    // Scripts and stylesheets are what a blank screen actually depends on.
    if (!/\.(js|css)$/.test(found)) continue;
    if (seen[found]) continue;
    seen[found] = true;
    urls.push(found);
    // One navigation must never fan out into hundreds of fetches.
    if (urls.length >= 60) break;
  }
  return urls;
}

// A freshly deployed document names content-hashed chunks that the asset cache may not hold,
// because those are only picked up opportunistically. Caching such a document pairs new HTML
// with the previous build's chunks: offline, every script is a miss and the cashier gets a
// white screen - worse than the offline page. So the document is only kept once its own
// chunks are in ASSET_CACHE; otherwise the last known-good document stays.
async function cacheNavigationDocument(request, response) {
  try {
    if (!isCacheable(response)) return;
    const html = await response.text();
    const cache = await caches.open(ASSET_CACHE);
    const assetUrls = extractNextStaticUrls(html);
    for (let i = 0; i < assetUrls.length; i += 1) {
      const existing = await cache.match(assetUrls[i]);
      if (existing) continue;
      // Rejects on a 404 or a dropped connection, which abandons the document below.
      await cache.add(assetUrls[i]);
    }
    await safePut(
      SHELL_CACHE,
      request,
      new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers)
      })
    );
  } catch (err) {
    // Missing chunk, full quota or an unreadable body - keep whatever document is already
    // cached, since that one was verified against chunks that were fetchable.
  }
}

async function handleNavigation(event, request) {
  try {
    const response = await fetch(request);
    // Behind the live response, never in front of it: pairing the document with its chunks
    // costs extra fetches and a cashier opening the till must not wait for them.
    event.waitUntil(cacheNavigationDocument(request, response.clone()));
    return response;
  } catch (err) {
    const cachedPage = await caches.match(request, { ignoreSearch: true });
    if (cachedPage) return cachedPage;
    const shell = await caches.match('/', { ignoreSearch: true });
    if (shell) return shell;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response('<h1>Offline</h1>', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { cacheName: cacheName });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    await safePut(cacheName, request, response.clone());
    return response;
  } catch (err) {
    const anyCached = await caches.match(request);
    if (anyCached) return anyCached;
    return Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request, { cacheName: cacheName });
  const network = fetch(request)
    .then(function (response) {
      // Fire and forget: revalidation must not delay the cached response.
      safePut(cacheName, request, response.clone());
      return response;
    })
    .catch(function () {
      return null;
    });
  if (cached) return cached;
  const response = await network;
  if (response) return response;
  return Response.error();
}

self.addEventListener('fetch', function (event) {
  const request = event.request;

  // Writes (bills, logins, stock updates) always go straight to the network.
  if (request.method !== 'GET') return;

  // Chrome devtools issue only-if-cached requests that throw if we respond to them.
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;

  // Range requests (media seeks) need a 206, which the Cache API cannot produce.
  if (request.headers.get('range')) return;

  let url;
  try {
    url = new URL(request.url);
  } catch (err) {
    return;
  }

  // chrome-extension: and friends cannot be cached at all.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (isApiRequest(url)) {
    // Catalogue reads get network-first with a DATA_CACHE fallback; every other API
    // call is left completely untouched so it can never be answered from cache.
    if (isCatalogueApiRequest(url)) {
      event.respondWith(apiNetworkFirst(request));
    }
    return;
  }

  // Razorpay checkout, Google fonts, analytics - not ours to cache or rewrite.
  if (url.origin !== self.location.origin) return;

  // Dev-server hot reload must stay live.
  if (url.pathname.indexOf('/_next/webpack-hmr') === 0) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event, request));
    return;
  }

  if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
});
