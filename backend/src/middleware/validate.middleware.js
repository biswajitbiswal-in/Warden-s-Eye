const { AppError } = require('../utils/AppError');

/**
 * Express middleware that validates req.body, req.query, or req.params against a Zod schema.
 */
const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const formattedDetails = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    const firstMessage = formattedDetails[0]?.message || 'Request validation failed';
    return next(new AppError(firstMessage, 400, 'VALIDATION_ERROR', formattedDetails));
  }
  req[source] = result.data;
  return next();
};

module.exports = { validate };
