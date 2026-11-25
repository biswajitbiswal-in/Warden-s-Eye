const mongoose = require('mongoose');
const { getEnv } = require('../config/env');
const { AppError } = require('../utils/AppError');
const { sendError } = require('../utils/apiResponse');

/**
 * 404 Not Found middleware for undefined API routes.
 */
const notFoundHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
};

/**
 * Centralized error-handling middleware.
 * Never exposes internal stack traces or database credentials in responses.
 */
const errorHandler = (err, _req, res, _next) => {
  const { nodeEnv } = getEnv();

  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected server error occurred.';
  let details = err.details || null;

  // Handle Mongoose CastError (invalid ObjectId)
  if (err instanceof mongoose.Error.CastError || err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_IDENTIFIER';
    message = `Invalid identifier format for field '${err.path}'.`;
  }
  // Handle Mongoose ValidationError
  else if (err instanceof mongoose.Error.ValidationError || err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    message = details[0]?.message || 'Database validation failed.';
  }
  // Handle MongoDB Duplicate Key Error (E11000)
  else if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_RESOURCE';
    const duplicateField = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    message = `A record with that '${duplicateField}' already exists.`;
  }
  // Handle malformed JSON body
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Malformed JSON in request body.';
  }
  // Sanitize unhandled 500 errors in production
  else if (statusCode === 500 && nodeEnv === 'production') {
    message = 'Internal server error.';
    details = null;
  }

  return sendError(res, statusCode, message, code, details);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
