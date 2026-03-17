/**
 * Centralized Error Handler for Galaxy Salon System
 * Standardizes all error responses across the API
 */

class AppError extends Error {
  constructor(message, statusCode, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, fields = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.fields = fields;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Express error handler middleware
 * Must be used as app.use(errorHandler) at the very end
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', {
      message: err.message,
      code: err.errorCode,
      statusCode: err.statusCode,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  } else {
    console.error(`[${err.errorCode}] ${err.message}`);
  }

  // Determine status code
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'INTERNAL_ERROR';

  // Build error response
  const errorResponse = {
    error: err.message || 'Internal server error',
    code: errorCode,
  };

  // Add validation fields if validation error
  if (err.fields) {
    errorResponse.fields = err.fields;
  }

  // Add timestamp for debugging
  errorResponse.timestamp = new Date().toISOString();

  // Add request ID for debugging in production
  if (req.id) {
    errorResponse.requestId = req.id;
  }

  // Sanitize error message in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorResponse.error = 'Internal server error. Please contact support.';
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Async handler wrapper to catch promise rejections
 * Usage: app.get('/endpoint', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  errorHandler,
  asyncHandler,
};
