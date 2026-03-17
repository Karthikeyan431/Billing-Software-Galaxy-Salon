/**
 * Rate Limiting Middleware Configuration
 * Provides endpoint-specific rate limiting for Galaxy Salon System
 */

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force password attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 attempts
  message: {
    error: 'Too many login attempts, please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  skipSuccessfulRequests: true, // don't count successful requests
  standardHeaders: true,
});

/**
 * Rate limiter for payment verification endpoints
 * Prevents abuse of payment verification
 */
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    error: 'Too many payment verification requests, please try again later.',
    code: 'PAYMENT_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
});

/**
 * Rate limiter for WhatsApp/notification endpoints
 * Prevents spam abuse
 */
const notificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: {
    error: 'Too many notification requests, please try again later.',
    code: 'NOTIFICATION_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
});

/**
 * Rate limiter for file uploads
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: {
    error: 'Too many uploads from this IP, please try again after an hour.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
});

module.exports = {
  generalLimiter,
  authLimiter,
  paymentLimiter,
  notificationLimiter,
  uploadLimiter,
};
