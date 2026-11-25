/**
 * Send a standardized canonical success response.
 */
const sendSuccess = (res, statusCode = 200, message = 'Operation completed successfully', data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send a standardized canonical error response.
 */
const sendError = (res, statusCode = 500, message = 'An error occurred', code = 'ERROR', details = null) => {
  const errorPayload = { code };
  if (details !== null && details !== undefined) {
    errorPayload.details = details;
  }
  return res.status(statusCode).json({
    success: false,
    message,
    error: errorPayload,
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
