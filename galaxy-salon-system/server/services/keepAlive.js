const https = require('https');
const http = require('http');

/**
 * Keep-alive pinger for Render's free tier.
 *
 * A free Render web service is spun down after ~15 minutes with no inbound requests, and
 * the next request then pays a ~50 second cold start. This pings the service's own public
 * health endpoint every 14 minutes so the idle timer never expires.
 *
 * Enable by setting KEEPALIVE_URL to the service's public health URL, e.g.
 *   KEEPALIVE_URL=https://galaxy-salon-api.onrender.com/api/health
 *
 * Caveats, stated plainly:
 *  - This only PREVENTS sleep; it cannot wake an instance that is already asleep. It
 *    self-heals, because the request that wakes the service also restarts this pinger.
 *  - It keeps the service running ~24/7, which consumes essentially all of the 750 free
 *    instance-hours per month. That is fine for one service, not for several.
 *  - It does nothing for Atlas M0 latency. The real fix for a production POS is a paid
 *    instance that never sleeps.
 */

const INTERVAL_MS = 14 * 60 * 1000; // must stay under Render's ~15 minute idle window

const start = () => {
  const url = process.env.KEEPALIVE_URL;

  if (!url) return; // opt-in only — never runs locally or in tests
  if (process.env.NODE_ENV !== 'production') {
    console.log('[keepalive] Skipped (not production).');
    return;
  }

  let target;
  try {
    target = new URL(url);
  } catch {
    console.error(`[keepalive] KEEPALIVE_URL is not a valid URL: ${url}`);
    return;
  }

  const client = target.protocol === 'https:' ? https : http;

  const ping = () => {
    const req = client.get(target, { timeout: 20000 }, (res) => {
      res.resume(); // drain so the socket is released
      if (res.statusCode !== 200) {
        console.warn(`[keepalive] ${target.href} responded ${res.statusCode}`);
      }
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', (err) => console.warn(`[keepalive] ping failed: ${err.message}`));
  };

  // unref() so this timer never holds the process open during a graceful shutdown.
  setInterval(ping, INTERVAL_MS).unref();
  console.log(`[keepalive] Pinging ${target.href} every ${INTERVAL_MS / 60000} minutes.`);
};

module.exports = { start };
