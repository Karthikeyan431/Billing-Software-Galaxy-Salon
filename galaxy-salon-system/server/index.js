require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const cronJobs = require('./services/cronJobs');
const keepAlive = require('./services/keepAlive');
const { errorHandler } = require('./utils/errorHandler');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Render (and any PaaS) terminates TLS at a proxy. Without this, req.ip is the proxy's
// address for EVERY client, so all users collapse into a single rate-limit bucket and
// express-rate-limit v7 logs an ERR_ERL_UNEXPECTED_X_FORWARDED_FOR error on every request.
app.set('trust proxy', 1);

// Connect Database (non-blocking, self-retrying — see config/db.js)
connectDB();

// Security Middleware
app.use(helmet());

// CORS — accepts a comma-separated allowlist so Vercel preview deployments and a custom
// domain can coexist. A single hardcoded origin silently blocked every browser request.
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Non-browser callers (curl, health checks, server-to-server) send no Origin header.
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalized)) return callback(null, true);
    // Allow Vercel preview URLs for this project without listing each one.
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalized)) return callback(null, true);
    console.warn(`[CORS] Blocked origin: ${origin} (allowed: ${allowedOrigins.join(', ')})`);
    return callback(null, false);
  },
  credentials: true,
  maxAge: 86400, // cache preflight for 24h instead of re-preflighting every 5s
}));

// Logging — must run in production too, otherwise the Render log stream is empty and
// there is no way to diagnose a failing request.
app.use(morgan(isProd ? 'combined' : 'dev'));

// Health checks are mounted BEFORE the rate limiter so Render's probes and any keep-alive
// pinger never consume the shared request budget.
app.get('/api/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbState = states[mongoose.connection.readyState] || 'unknown';
  // Report unhealthy when the database is down so a bad deploy does not stay green.
  res.status(connectDB.isConnected() ? 200 : 503).json({
    status: connectDB.isConnected() ? 'ok' : 'degraded',
    db: dbState,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Root probe — without this, Render's / request falls through to the 404 handler.
app.get('/', (req, res) => {
  res.json({ service: 'Galaxy Salon API', status: 'running', docs: '/api-docs/' });
});

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.', code: 'RATE_LIMIT_EXCEEDED' },
});
app.use('/api/', limiter);

// Body Parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Swagger API Documentation — swagger-jsdoc parses source files synchronously at require
// time, so it is loaded lazily and only when explicitly enabled. Keeping it out of the
// production boot path removes that cost from every cold start.
if (process.env.ENABLE_API_DOCS === 'true') {
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpecs = require('./config/swagger');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
  app.get('/api-docs/swagger.json', (req, res) => res.json(swaggerSpecs));
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/services', require('./routes/services'));
app.use('/api/products', require('./routes/products'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/students', require('./routes/students'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/payment', require('./routes/payment'));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler (must be last)
app.use(errorHandler);

// Start Cron Jobs
cronJobs.start();

// Keep the free-tier instance from spinning down (opt-in via KEEPALIVE_URL)
keepAlive.start();

const PORT = process.env.PORT || 5000;
// Bind 0.0.0.0 explicitly so Render's port scan always detects the open port.
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Galaxy Salon API listening on 0.0.0.0:${PORT} (${process.env.NODE_ENV || 'development'})`);
  console.log(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
});

// Render's proxy holds connections open; without this the server can 502 on redeploy.
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;

const shutdown = async (signal) => {
  console.log(`[${signal}] Shutting down gracefully...`);
  server.close(async () => {
    await mongoose.connection.close(false);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 15000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Log crashes instead of dying silently — previously a Render restart left no trace.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason instanceof Error ? reason.stack : reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err.stack || err);
  shutdown('uncaughtException');
});

module.exports = app;
