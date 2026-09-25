// Custom AppError class for operational errors (expected errors with HTTP status codes)
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode || 500;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Global Express Error Handler Middleware (4 parameters)
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log full stack trace in development for debugging
  console.error(`❌ [Error ${statusCode}] ${req.method} ${req.originalUrl}:`, err.stack || err);

  // Send uniform JSON response to client
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { AppError, errorHandler };
