import { useState } from 'react';
import { cn, formatCurrency } from '../../utils/helpers';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

function errorText(lastError) {
  if (!lastError) return '';
  if (typeof lastError === 'string') return lastError;
  return lastError.message || 'Sync failed';
}

// A bill the server refused outright. The cash was collected and the customer walked away
// with a receipt, so this cannot be allowed to vanish quietly the way a transient error can —
// it stays on screen until a human retries it or explicitly throws it away.
function FailedBillsReview({ bills, onRetry, onDiscard, onClose }) {
  const [busyRef, setBusyRef] = useState(null);
  const [confirmRef, setConfirmRef] = useState(null);

  const act = async (clientRef, fn) => {
    setBusyRef(clientRef);
    try {
      await fn(clientRef);
    } finally {
      setBusyRef(null);
      setConfirmRef(null);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Bills the server rejected" size="lg">
      <p className="text-sm text-gray-600 mb-4">
        These sales were taken on this device while it was offline, but the server refused them
        on upload — usually because stock ran out or an item was deleted in the meantime. The
        money was collected, so each one needs a decision.
      </p>

      <div className="space-y-3">
        {bills.map((bill) => {
          const payload = bill.payload || {};
          const busy = busyRef === bill.clientRef;
          return (
            <div key={bill.clientRef} className="border border-red-200 bg-red-50/60 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {bill.localBillNumber} · {formatCurrency(payload.totalAmount || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {payload.customerName || 'Walk-in'}
                    {payload.customerPhone ? ` · ${payload.customerPhone}` : ''}
                    {' · '}
                    {new Date(bill.createdAt).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                  <p className="text-xs text-red-700 mt-1.5 font-medium">{bill.lastError || 'Rejected by the server'}</p>
                </div>
                <div className="flex flex-col gap-1.5 flex-none">
                  <Button size="sm" variant="primary" disabled={busy} onClick={() => act(bill.clientRef, onRetry)}>
                    {busy ? 'Working…' : 'Retry'}
                  </Button>
                  {confirmRef === bill.clientRef ? (
                    <Button size="sm" variant="danger" disabled={busy} onClick={() => act(bill.clientRef, onDiscard)}>
                      Confirm
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmRef(bill.clientRef)}>
                      Discard
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Fix the underlying cause first (restock the product, re-add the service), then Retry.
        Discard permanently deletes the only record of this sale.
      </p>
    </Modal>
  );
}

/**
 * Compact connectivity / queue pill for the dashboard header.
 * Renders nothing when the app is online with an empty queue - a permanent "All good"
 * badge is just noise in a header that is already busy.
 */
export default function OfflineIndicator() {
  const { online } = useOnlineStatus();
  const { pending, syncing, lastError, syncNow, failed, failedBills, retryFailed, discardFailed } = useSyncStatus();
  const [showFailed, setShowFailed] = useState(false);

  const count = Number(pending) || 0;
  const message = errorText(lastError);
  const plural = count === 1 ? 'bill' : 'bills';
  const failedCount = Number(failed) || 0;

  // Rejected bills outrank every other state. They do not resolve on their own and they
  // represent money already taken, so this pill is shown even while offline and even when
  // the rest of the queue is healthy — it is the one thing that must not be missed.
  const failedPill = failedCount > 0 ? (
    <>
      <button
        type="button"
        onClick={() => setShowFailed(true)}
        title="These offline bills were rejected by the server and need attention"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300 hover:bg-red-200 transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-red-600 flex-none animate-pulse" aria-hidden="true" />
        {failedCount} rejected
        <span className="underline underline-offset-2">Review</span>
      </button>
      {showFailed && (
        <FailedBillsReview
          bills={failedBills || []}
          onRetry={retryFailed}
          onDiscard={discardFailed}
          onClose={() => setShowFailed(false)}
        />
      )}
    </>
  ) : null;

  // The rejected-bill pill sits ALONGSIDE the connectivity pill rather than replacing it:
  // being offline with three bills queued and one rejected is two separate facts, and
  // collapsing them would hide the queue the cashier is still adding to.
  const statusPill = (() => {
    if (!online) {
      return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
        Offline
        {count > 0 && <span className="text-amber-600/80">- {count} queued</span>}
      </span>
      );
    }

    // Back online but the last attempt failed: surface the reason and let the user retry.
    if (message) {
      return (
      <button
        type="button"
        onClick={syncNow}
        title={message}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors max-w-[16rem]"
      >
        <span className="w-2 h-2 rounded-full bg-red-500 flex-none" aria-hidden="true" />
        <span className="truncate">{count > 0 ? `${count} ${plural} not synced` : 'Sync failed'}</span>
        <span className="flex-none underline underline-offset-2">Retry</span>
      </button>
      );
    }

    if (count > 0) {
      return (
      <button
        type="button"
        onClick={syncNow}
        disabled={syncing}
        title={syncing ? 'Uploading queued bills' : 'Upload queued bills now'}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
          'bg-primary-50 text-primary-700 border-primary-200',
          syncing ? 'cursor-default' : 'hover:bg-primary-100'
        )}
      >
        {syncing ? (
          <span className="w-3 h-3 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin flex-none" aria-hidden="true" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-primary-500 flex-none" aria-hidden="true" />
        )}
        <span>{syncing ? `Syncing ${count} ${plural}` : `${count} ${plural} to sync`}</span>
        {!syncing && <span className="underline underline-offset-2">Sync now</span>}
      </button>
      );
    }

    return null;
  })();

  if (!failedPill && !statusPill) return null;

  return (
    <span className="inline-flex items-center gap-2">
      {failedPill}
      {statusPill}
    </span>
  );
}
