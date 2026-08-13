const ApiError = require('../utils/ApiError');

/**
 * Request validation middleware factory using Joi.
 * Validates req.body, req.query, and/or req.params against a Joi schema.
 *
 * Usage:
 *   const { registerSchema } = require('../validators/auth.validator');
 *   router.post('/register', validate(registerSchema), register);
 *
 * Where registerSchema is:
 *   { body: Joi.object({...}), query: Joi.object({...}), params: Joi.object({...}) }
 *
 * @param {object} schema - Object with optional body, query, params Joi schemas
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
  return (req, _res, next) => {
    const validationErrors = [];

    // Validate each source (body, query, params) if a schema is provided
    for (const source of ['body', 'query', 'params']) {
      if (schema[source]) {
        const { error, value } = schema[source].validate(req[source], {
          abortEarly: false, // Collect all errors, not just the first
          stripUnknown: true, // Remove unknown fields
          allowUnknown: false,
        });

        if (error) {
          const details = error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message.replace(/"/g, ''),
            type: detail.type,
          }));
          validationErrors.push(...details);
        } else {
          // Replace with validated (and sanitized) values
          req[source] = value;
        }
      }
    }

    if (validationErrors.length > 0) {
      return next(ApiError.badRequest('Validation failed', validationErrors));
    }

    return next();
  };
};

module.exports = validate;
