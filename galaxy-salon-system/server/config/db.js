const mongoose = require('mongoose');

/**
 * Optional DNS override.
 *
 * This used to be a hardcoded dns.setServers(['8.8.8.8','8.8.4.4']) to work around a local
 * ISP that could not resolve Atlas SRV records. That is actively harmful inside a container
 * platform such as Render: it forces every mongodb+srv:// SRV/TXT lookup (and the driver's
 * 60s SRV re-poll) out over external UDP:53, where it can hang long before any MongoDB
 * timeout option applies. It also breaks DNS for Razorpay / WhatsApp / SMTP.
 *
 * It is now opt-in via MONGODB_DNS and is never applied in production.
 */
if (process.env.MONGODB_DNS && process.env.NODE_ENV !== 'production') {
  const servers = process.env.MONGODB_DNS.split(',').map((s) => s.trim()).filter(Boolean);
  require('dns').setServers(servers);
  console.log(`[DB] DNS servers overridden for local dev: ${servers.join(', ')}`);
}

const options = {
  serverSelectionTimeoutMS: 10000, // fail fast instead of hanging past Render's 100s timeout
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,          // driver default is 0 (wait forever) — a dropped NAT
                                   // connection would otherwise hang a request indefinitely
  maxPoolSize: 10,                 // driver default is 100; far too many for an Atlas M0
  minPoolSize: 0,
  // Buffering is kept ON so a request arriving during a cold start waits ~1s for the
  // connection rather than failing outright — but the window is bounded, so a genuinely
  // dead database fails in 8s instead of stalling on Mongoose's 10s default.
  bufferCommands: true,
  bufferTimeoutMS: 8000,
  // Index sync at boot. Leave on so schema index changes are applied on deploy; set
  // MONGO_AUTO_INDEX=false once indexes are stable to shave round trips off cold starts.
  autoIndex: process.env.MONGO_AUTO_INDEX !== 'false',
};

let attempts = 0;

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('[DB] MONGODB_URI is not set. Add it in the Render dashboard → Environment.');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    attempts = 0;
    console.log(`[DB] Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    attempts += 1;
    const delay = Math.min(30000, 1000 * 2 ** attempts);
    // Never process.exit() here. On Render that turns one transient Atlas hiccup into a
    // crash-restart loop, and every restart is another 50s cold start.
    console.error(
      `[DB] Connection attempt ${attempts} failed: ${error.message}. Retrying in ${delay}ms.`
    );
    setTimeout(connectDB, delay).unref();
  }
};

mongoose.connection.on('disconnected', () => console.warn('[DB] Disconnected.'));
mongoose.connection.on('reconnected', () => console.log('[DB] Reconnected.'));
mongoose.connection.on('error', (err) => console.error(`[DB] Error: ${err.message}`));

connectDB.isConnected = () => mongoose.connection.readyState === 1;

module.exports = connectDB;
