// Owns the offline bill queue lifecycle: stamp a bill, park it in IndexedDB, and replay it
// to the server when the connection comes back.
//
// This module deliberately uses plain fetch() instead of the axios instance in
// services/api.js. That instance hard-redirects the browser to /login on any 401, which
// during a replay would yank the cashier out of the app mid-sale and strand the rest of the
// queue. Here an expired token is just another retryable outcome.

import {
  putQueuedBill,
  getQueuedBills,
  updateQueuedBill,
  removeQueuedBill,
  countQueuedBills,
  countFailedBills,
  getFailedBills,
  setMeta,
  getMeta,
} from './offlineDb';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const OFFLINE_COUNTER_KEY = 'offlineBillCounter';
const RETRY_INTERVAL_MS = 30000;
const AUTH_ERROR_MESSAGE = 'Sign in again to finish syncing your offline bills.';

function noop() {}

function isOnline() {
  // Assume online when the browser will not tell us — a needless "you are offline" banner on
  // a working connection is worse than one optimistic request that fails.
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') return true;
  return navigator.onLine;
}

/* ------------------------------------------------------------------ *
 * Subscriber machinery
 * ------------------------------------------------------------------ */

const listeners = new Set();

let state = {
  pending: 0,
  syncing: false,
  lastSyncAt: null,
  lastError: null,
  online: isOnline(),
  // Bills the server permanently refused. Tracked separately from `pending` because they are
  // not going to sync on their own — they need a person to look at them — and folding them
  // into the pending count would make the badge promise a sync that will never happen.
  failed: 0,
  failedBills: [],
};

// Always replaced with a fresh object rather than mutated, so React consumers comparing the
// snapshot by reference actually re-render.
function setState(patch) {
  state = Object.assign({}, state, patch);
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch (err) {
      console.warn('[syncManager] subscriber threw:', err);
    }
  });
}

export function getSyncState() {
  return state;
}

export function subscribeSync(listener) {
  if (typeof listener !== 'function') return noop;
  listeners.add(listener);
  // Fire immediately so a freshly mounted component never renders a blank badge while it
  // waits for the next change.
  try {
    listener(state);
  } catch (err) {
    console.warn('[syncManager] subscriber threw:', err);
  }
  return () => {
    listeners.delete(listener);
  };
}

export async function refreshPendingCount() {
  const pending = await countQueuedBills();
  const failedBills = await getFailedBills();
  setState({ pending, failed: failedBills.length, failedBills, online: isOnline() });
  return pending;
}

// Put a permanently-rejected bill back in the replay queue. The rejection is usually
// fixable off-screen — restock the product, re-create a deleted service — so the cashier
// needs a way to say "try again now" without re-keying the whole sale. The clientRef is
// unchanged, so if the bill did somehow reach the server the dedupe still collapses it.
export async function retryFailedBill(clientRef) {
  if (!clientRef) return null;
  const updated = await updateQueuedBill(clientRef, { status: 'pending', lastError: null });
  await refreshPendingCount();
  if (updated) await syncPendingBills({ force: true });
  return updated;
}

// Drop a rejected bill for good. Only ever called from an explicit confirmation in the UI —
// this is the one action that genuinely destroys a record of collected cash.
export async function discardFailedBill(clientRef) {
  if (!clientRef) return false;
  const removed = await removeQueuedBill(clientRef);
  await refreshPendingCount();
  return removed;
}

/* ------------------------------------------------------------------ *
 * Queueing
 * ------------------------------------------------------------------ */

let fallbackRefCounter = 0;

export function generateClientRef() {
  let cryptoObj;
  try {
    cryptoObj = typeof window !== 'undefined' ? window.crypto : undefined;
  } catch (err) {
    cryptoObj = undefined;
  }

  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    try {
      // Only available in secure contexts; throws on plain http in some browsers.
      return cryptoObj.randomUUID();
    } catch (err) {
      // fall through to the byte-based build below
    }
  }

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    try {
      const bytes = cryptoObj.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
      let hex = '';
      for (let i = 0; i < bytes.length; i += 1) {
        hex += bytes[i].toString(16).padStart(2, '0');
      }
      return (
        hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' +
        hex.slice(16, 20) + '-' + hex.slice(20)
      );
    } catch (err) {
      // fall through to the counter below
    }
  }

  // Last resort. Deliberately timestamp + in-page counter rather than Math.random: the server
  // dedupes on this value, so a collision would either drop a real bill or double-charge one.
  fallbackRefCounter += 1;
  return 'ref-' + Date.now().toString(36) + '-' + fallbackRefCounter.toString(36);
}

// Human-readable label the cashier sees on the receipt until the server assigns a real
// bill number. Persisted in the meta store so it keeps counting across reloads.
async function nextLocalBillNumber() {
  const current = Number(await getMeta(OFFLINE_COUNTER_KEY));
  const next = Number.isFinite(current) && current > 0 ? current + 1 : 1;
  await setMeta(OFFLINE_COUNTER_KEY, next);
  return 'OFFLINE-' + next;
}

export async function queueBill(payload) {
  const body = payload && typeof payload === 'object' ? payload : {};
  const clientRef = body.clientRef || generateClientRef();
  const localBillNumber = await nextLocalBillNumber();

  const entry = {
    clientRef,
    // The ref travels inside the payload too — it is what the server dedupes on when a
    // replay lands twice (flaky connection, two tabs, a retry after a lost response).
    payload: Object.assign({}, body, { clientRef }),
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
    status: 'pending',
    localBillNumber,
    syncedBillNumber: null,
  };

  // The ONE place in this codebase where a storage failure must not be swallowed. offlineDb
  // deliberately degrades to a fallback everywhere else, but here the cash is already in the
  // drawer: if the write did not land, telling the cashier "saved offline" destroys the sale
  // silently. putQueuedBill resolves to null on any failure (blocked site data, Safari
  // private mode, a full disk), so an unconfirmed write throws and pos.js keeps the cart
  // loaded and shows a real error instead of printing a receipt for a bill that does not exist.
  const stored = await putQueuedBill(entry);
  if (!stored) {
    throw new Error('This device cannot save offline bills (browser storage is unavailable).');
  }

  await refreshPendingCount();
  return entry;
}

/* ------------------------------------------------------------------ *
 * Replay
 * ------------------------------------------------------------------ */

function readToken() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem('token');
  } catch (err) {
    // localStorage throws outright when the browser blocks site data.
    return null;
  }
}

async function readJson(response) {
  try {
    return await response.json();
  } catch (err) {
    // 204s and HTML error pages from a proxy both land here.
    return null;
  }
}

function serverMessage(data, response) {
  if (data) {
    if (typeof data.error === 'string' && data.error) return data.error;
    if (Array.isArray(data.errors) && data.errors.length) {
      // express-validator replies with [{ msg, param }] instead of a single error string.
      const messages = data.errors
        .map((item) => (item && item.msg) || '')
        .filter(Boolean);
      if (messages.length) return messages.join(', ');
    }
    if (typeof data.message === 'string' && data.message) return data.message;
  }
  return 'Server responded with ' + response.status;
}

// Posts one queued bill and classifies the outcome. Never throws.
async function postQueuedBill(entry) {
  const url = API_BASE.replace(/\/+$/, '') + '/bills';
  const headers = { 'Content-Type': 'application/json' };
  const token = readToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      // offlineCreatedAt carries the moment the sale actually happened. Without it the
      // server stamps the bill with the SYNC time, so a Saturday-evening sale replayed on
      // Sunday morning lands in Sunday's daily summary and the till never reconciles.
      body: JSON.stringify(Object.assign({}, entry.payload || {}, {
        clientRef: entry.clientRef,
        offlineCreatedAt: entry.createdAt,
      })),
    });
  } catch (err) {
    // A thrown fetch means the connection is gone, not that this one bill is bad — stop the
    // run so the remaining bills are not burned through with guaranteed failures.
    return {
      kind: 'retryable',
      stop: true,
      message: (err && err.message) || 'Cannot reach the server.',
    };
  }

  const data = await readJson(response);

  if (response.status === 200 || response.status === 201) {
    // 200 + duplicate:true means the server already had this clientRef, which is still a
    // success: the bill exists exactly once and the queue entry can go.
    return {
      kind: 'success',
      billNumber: data && data.bill ? data.bill.billNumber : null,
      duplicate: !!(data && data.duplicate),
    };
  }

  if (response.status === 401 || response.status === 403) {
    // Every later bill would fail on the same expired token, so stop rather than burning
    // attempts on all of them.
    return { kind: 'auth', stop: true, message: AUTH_ERROR_MESSAGE };
  }

  if (response.status === 408 || response.status === 429 || response.status >= 500) {
    return { kind: 'retryable', stop: false, message: serverMessage(data, response) };
  }

  // Any other 4xx is the server rejecting this specific bill (insufficient stock, a deleted
  // product). Retrying cannot fix it — park it as failed for a human to look at.
  return { kind: 'permanent', message: serverMessage(data, response) };
}

export async function syncPendingBills(options) {
  const opts = options || {};
  const force = !!opts.force;

  if (typeof window === 'undefined') {
    return { synced: 0, failed: 0, remaining: 0, results: [] };
  }
  // A second concurrent run would replay the same entries twice.
  if (state.syncing) {
    return { synced: 0, failed: 0, remaining: state.pending, results: [] };
  }
  if (!isOnline() && !force) {
    return { synced: 0, failed: 0, remaining: state.pending, results: [] };
  }

  const all = await getQueuedBills();
  // 'syncing' entries are picked up too: one left in that state belongs to a tab that was
  // closed mid-replay, and the server's clientRef dedupe makes re-sending it safe.
  const replayable = all.filter(
    (entry) => entry && (entry.status === 'pending' || entry.status === 'syncing')
  );

  if (!replayable.length) {
    // Clear lastError explicitly: refreshPendingCount alone would leave a stale message on
    // screen forever once the queue drains, giving a permanent red "Sync failed / Retry" pill
    // whose Retry button lands right back here and does nothing.
    await refreshPendingCount();
    setState({ lastError: null, lastSyncAt: new Date().toISOString() });
    return { synced: 0, failed: 0, remaining: state.pending, results: [] };
  }

  setState({ syncing: true, lastError: null, online: isOnline() });

  const results = [];
  let synced = 0;
  let failed = 0;
  let runError = null;
  let remaining = state.pending;

  try {
    // Strictly sequential: the server decrements product stock per bill inside a transaction,
    // and parallel replays of the same catalogue would race each other into false
    // "insufficient stock" rejections.
    for (let i = 0; i < replayable.length; i += 1) {
      const entry = replayable[i];
      const attempts = Number(entry.attempts) || 0;

      await updateQueuedBill(entry.clientRef, { status: 'syncing' });
      const outcome = await postQueuedBill(entry);

      if (outcome.kind === 'success') {
        await removeQueuedBill(entry.clientRef);
        synced += 1;
        results.push({
          clientRef: entry.clientRef,
          localBillNumber: entry.localBillNumber,
          status: 'synced',
          billNumber: outcome.billNumber,
          duplicate: outcome.duplicate,
          error: null,
        });
        continue;
      }

      if (outcome.kind === 'permanent') {
        await updateQueuedBill(entry.clientRef, {
          status: 'failed',
          attempts: attempts + 1,
          lastError: outcome.message,
        });
        failed += 1;
        runError = outcome.message;
        results.push({
          clientRef: entry.clientRef,
          localBillNumber: entry.localBillNumber,
          status: 'failed',
          billNumber: null,
          duplicate: false,
          error: outcome.message,
        });
        continue;
      }

      if (outcome.kind === 'auth') {
        // Left pending with attempts untouched — nothing is wrong with the bill, only with
        // the session, so it should not creep towards looking like a broken entry.
        await updateQueuedBill(entry.clientRef, {
          status: 'pending',
          lastError: outcome.message,
        });
        runError = outcome.message;
        results.push({
          clientRef: entry.clientRef,
          localBillNumber: entry.localBillNumber,
          status: 'pending',
          billNumber: null,
          duplicate: false,
          error: outcome.message,
        });
        break;
      }

      // Retryable: throttling, a timeout, a 5xx, or a dead connection.
      await updateQueuedBill(entry.clientRef, {
        status: 'pending',
        attempts: attempts + 1,
        lastError: outcome.message,
      });
      runError = outcome.message;
      results.push({
        clientRef: entry.clientRef,
        localBillNumber: entry.localBillNumber,
        status: 'pending',
        billNumber: null,
        duplicate: false,
        error: outcome.message,
      });

      if (outcome.stop) break;
    }
  } catch (err) {
    // Storage itself failed mid-run; the queue is still on disk, so just report it.
    runError = (err && err.message) || 'Sync failed unexpectedly.';
    console.warn('[syncManager] sync run aborted:', err);
  } finally {
    remaining = await countQueuedBills();
    setState({
      syncing: false,
      pending: remaining,
      lastSyncAt: new Date().toISOString(),
      lastError: runError,
      online: isOnline(),
    });
  }

  return { synced, failed, remaining, results };
}

/* ------------------------------------------------------------------ *
 * Auto sync
 * ------------------------------------------------------------------ */

let autoSyncStarted = false;
let retryTimer = null;

function handleOnlineEvent() {
  setState({ online: true });
  syncPendingBills().catch(noop);
}

function handleOfflineEvent() {
  setState({ online: false });
}

function handleVisibilityChange() {
  if (typeof document === 'undefined') return;
  if (document.visibilityState !== 'visible') return;
  // Coming back to the tab is the moment the cashier expects the badge to be truthful.
  setState({ online: isOnline() });
  syncPendingBills().catch(noop);
}

function handleRetryTick() {
  // Only fires while something is actually queued, so an idle till does not ping a sleeping
  // Render instance every 30 seconds all day long.
  if (state.pending > 0 && !state.syncing && isOnline()) {
    syncPendingBills().catch(noop);
  }
}

export function startAutoSync() {
  if (typeof window === 'undefined') return;
  if (autoSyncStarted) return; // idempotent: React 18 strict mode mounts effects twice
  autoSyncStarted = true;

  window.addEventListener('online', handleOnlineEvent);
  window.addEventListener('offline', handleOfflineEvent);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }
  retryTimer = window.setInterval(handleRetryTick, RETRY_INTERVAL_MS);

  setState({ online: isOnline() });
  refreshPendingCount()
    .then(() => syncPendingBills())
    .catch(noop);
}

export function stopAutoSync() {
  if (typeof window === 'undefined') return;
  if (!autoSyncStarted) return;
  autoSyncStarted = false;

  window.removeEventListener('online', handleOnlineEvent);
  window.removeEventListener('offline', handleOfflineEvent);
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }
  if (retryTimer !== null) {
    window.clearInterval(retryTimer);
    retryTimer = null;
  }
}
