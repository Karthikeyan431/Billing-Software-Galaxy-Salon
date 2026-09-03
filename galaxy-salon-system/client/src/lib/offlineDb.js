// Offline storage for the POS — a small promise wrapper over raw IndexedDB, no libraries.
//
// Every exported function resolves to a harmless empty value (null / [] / 0 / false) instead
// of rejecting when storage is unavailable. A cashier on a locked-down kiosk profile or in
// Safari private mode must still be able to ring up a bill: losing the offline queue is bad,
// crashing the till in the middle of a sale is worse.

const DB_NAME = 'galaxy-salon-offline';
const DB_VERSION = 1;

const STORE_QUEUED_BILLS = 'queuedBills';
const STORE_COLLECTIONS = 'collections';
const STORE_META = 'meta';

export const CACHE_KEYS = {
  SERVICES: 'services',
  PRODUCTS: 'products',
  EMPLOYEES: 'employees',
  CUSTOMERS: 'customers',
};

// Memoised open promise. Reset to null whenever the connection is closed or refused, so a
// later call retries instead of handing out a dead database forever.
let dbPromise = null;

// Set only once an open has actually failed. `window.indexedDB` is present in Safari private
// mode but throws on open, so availability cannot be decided by feature detection alone.
let openFailed = false;

export function isIndexedDbAvailable() {
  if (typeof window === 'undefined') return false;
  if (openFailed) return false;
  try {
    return !!window.indexedDB;
  } catch (err) {
    // Hardened browser profiles can throw on the property access itself.
    return false;
  }
}

function openDb() {
  if (!isIndexedDbAvailable()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    let request;
    try {
      request = window.indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      // Private-browsing modes throw synchronously here instead of firing onerror.
      openFailed = true;
      dbPromise = null;
      resolve(null);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_QUEUED_BILLS)) {
        const bills = db.createObjectStore(STORE_QUEUED_BILLS, { keyPath: 'clientRef' });
        bills.createIndex('createdAt', 'createdAt', { unique: false });
        bills.createIndex('status', 'status', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_COLLECTIONS)) {
        db.createObjectStore(STORE_COLLECTIONS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onblocked = () => {
      // Another tab is holding an older schema version open. Give up on this attempt rather
      // than hanging, and clear the memo so the next call can try again.
      dbPromise = null;
      settle(null);
    };

    request.onerror = () => {
      // Deliberately does NOT latch `openFailed`. An async open error can be transient (a
      // storage-pressure eviction, a locked profile directory), and latching would disable
      // offline billing for the rest of the page's life over one bad attempt. Clearing the
      // memo is enough: the next call retries. Only the synchronous throw above — the
      // private-mode case, which is a standing device state — latches.
      dbPromise = null;
      settle(null);
    };

    request.onsuccess = () => {
      const db = request.result;
      if (settled) {
        // A `blocked` event already gave up on this attempt — do not leak the connection.
        db.close();
        return;
      }
      // A second tab upgrading the schema fires versionchange here. Holding this connection
      // open would block that tab's upgrade transaction and deadlock both tabs.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      db.onclose = () => {
        dbPromise = null;
      };
      settle(db);
    };
  });

  return dbPromise;
}

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

// Runs `work(store)` inside a single transaction and resolves with whatever it returns.
// Any failure — blocked storage, aborted transaction, malformed record — resolves to
// `fallback` rather than rejecting, so callers never need a try/catch of their own.
async function withStore(storeName, mode, work, fallback = null) {
  const db = await openDb();
  if (!db) return fallback;

  try {
    const tx = db.transaction(storeName, mode);
    // Completion handlers are attached before any work runs: attaching them afterwards can
    // miss an event that already fired and leave this promise pending forever.
    const done = new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
    // If `work` below throws, nothing ever awaits `done`, and its rejection surfaces as an
    // unhandled promise rejection that can take down the page in some error-reporting setups.
    // The real rejection is still delivered to the `await done` further down when reached.
    done.catch(() => {});

    const result = await work(tx.objectStore(storeName));
    await done;
    return result;
  } catch (err) {
    console.warn('[offlineDb] ' + mode + ' on ' + storeName + ' failed:', err);
    return fallback;
  }
}

export async function putQueuedBill(entry) {
  if (!entry || typeof entry !== 'object') return null;
  return withStore(
    STORE_QUEUED_BILLS,
    'readwrite',
    (store) => promisifyRequest(store.put(entry)).then(() => entry),
    null
  );
}

export async function getQueuedBills() {
  const rows = await withStore(
    STORE_QUEUED_BILLS,
    'readonly',
    (store) => promisifyRequest(store.getAll()),
    []
  );

  const items = Array.isArray(rows) ? rows.slice() : [];
  // Sorted in JS rather than read through the createdAt index on purpose: IndexedDB silently
  // omits records whose index key is undefined, and a queued bill that somehow lost its
  // timestamp must still replay instead of becoming invisible to the sync loop. The order is
  // load-bearing — the server decrements product stock per bill, so bills have to reach it in
  // the order the salon actually rang them up.
  items.sort((a, b) => {
    const left = String((a && a.createdAt) || '');
    const right = String((b && b.createdAt) || '');
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  });
  return items;
}

export async function updateQueuedBill(clientRef, patch) {
  if (!clientRef) return null;
  return withStore(
    STORE_QUEUED_BILLS,
    'readwrite',
    async (store) => {
      const existing = await promisifyRequest(store.get(clientRef));
      if (!existing) return null;
      // clientRef is the keyPath, so a patch must never be allowed to move the record.
      const merged = Object.assign({}, existing, patch || {}, { clientRef: existing.clientRef });
      await promisifyRequest(store.put(merged));
      return merged;
    },
    null
  );
}

export async function removeQueuedBill(clientRef) {
  if (!clientRef) return false;
  return withStore(
    STORE_QUEUED_BILLS,
    'readwrite',
    (store) => promisifyRequest(store.delete(clientRef)).then(() => true),
    false
  );
}

export async function countQueuedBills() {
  return withStore(
    STORE_QUEUED_BILLS,
    'readonly',
    (store) => {
      const index = store.index('status');
      // Both counts are issued up front so the transaction cannot auto-commit between them,
      // and counting through the index avoids deserialising every queued bill payload.
      const pendingRequest = index.count(IDBKeyRange.only('pending'));
      const syncingRequest = index.count(IDBKeyRange.only('syncing'));
      return Promise.all([
        promisifyRequest(pendingRequest),
        promisifyRequest(syncingRequest),
      ]).then((counts) => (counts[0] || 0) + (counts[1] || 0));
    },
    0
  );
}

// A bill the server permanently rejected (insufficient stock, a deleted product) is an
// accounting problem, not garbage: the cash is already in the drawer and the customer has a
// receipt. It is excluded from countQueuedBills so the "syncing" badge stays truthful, but it
// must stay readable so the UI can put it in front of a human.
export async function countFailedBills() {
  return withStore(
    STORE_QUEUED_BILLS,
    'readonly',
    (store) => promisifyRequest(store.index('status').count(IDBKeyRange.only('failed'))),
    0
  );
}

export async function getFailedBills() {
  const rows = await withStore(
    STORE_QUEUED_BILLS,
    'readonly',
    (store) => promisifyRequest(store.index('status').getAll(IDBKeyRange.only('failed'))),
    []
  );
  return Array.isArray(rows) ? rows : [];
}

export async function cacheCollection(key, items) {
  if (!key) return null;
  const record = {
    key,
    items: Array.isArray(items) ? items : [],
    cachedAt: new Date().toISOString(),
  };
  return withStore(
    STORE_COLLECTIONS,
    'readwrite',
    (store) => promisifyRequest(store.put(record)).then(() => record),
    null
  );
}

export async function readCachedCollection(key) {
  if (!key) return null;
  const record = await withStore(
    STORE_COLLECTIONS,
    'readonly',
    (store) => promisifyRequest(store.get(key)),
    null
  );
  if (!record) return null;
  return {
    items: Array.isArray(record.items) ? record.items : [],
    cachedAt: record.cachedAt || null,
  };
}

export async function setMeta(key, value) {
  if (!key) return null;
  return withStore(
    STORE_META,
    'readwrite',
    (store) => promisifyRequest(store.put({ key, value })).then(() => value),
    null
  );
}

export async function getMeta(key) {
  if (!key) return null;
  const record = await withStore(
    STORE_META,
    'readonly',
    (store) => promisifyRequest(store.get(key)),
    null
  );
  return record ? record.value : null;
}

export async function clearOfflineData() {
  const db = await openDb();
  if (!db) return false;

  try {
    // One transaction across all three stores so a sign-out cannot leave half the offline
    // data behind if the browser kills the tab midway.
    const tx = db.transaction([STORE_QUEUED_BILLS, STORE_COLLECTIONS, STORE_META], 'readwrite');
    const done = new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });

    tx.objectStore(STORE_QUEUED_BILLS).clear();
    tx.objectStore(STORE_COLLECTIONS).clear();
    tx.objectStore(STORE_META).clear();

    await done;
    return true;
  } catch (err) {
    console.warn('[offlineDb] clearOfflineData failed:', err);
    return false;
  }
}
