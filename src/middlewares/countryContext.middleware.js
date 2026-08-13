const { getCountryPlugin } = require('../plugins/countries');
const logger = require('../config/logger');

/**
 * Country context middleware.
 * Resolves the appropriate country plugin based on the request context.
 *
 * Plugin is resolved from (in order of priority):
 * 1. req.body.countryCode — for creation endpoints (e.g., POST /companies)
 * 2. Company's countryCode — when operating on an existing company
 * 3. User's countryCode — fallback
 *
 * Attaches: req.countryPlugin
 *
 * This middleware should be applied AFTER auth middleware (needs req.user)
 * and AFTER company resolution (if applicable).
 */
const resolveCountryContext = (options = {}) => {
  const { required = false } = options;

  return (req, _res, next) => {
    let countryCode = null;

    // Priority 1: Explicit in request body or query
    if (req.body?.countryCode) {
      countryCode = req.body.countryCode.toUpperCase();
    } else if (req.query?.countryCode) {
      countryCode = req.query.countryCode.toUpperCase();
    }

    // Priority 2: From company context (set by a previous middleware)
    if (!countryCode && req.company?.countryCode) {
      countryCode = req.company.countryCode;
    }

    // Priority 3: From authenticated user
    if (!countryCode && req.user?.countryCode) {
      countryCode = req.user.countryCode;
    }

    if (countryCode) {
      try {
        req.countryPlugin = getCountryPlugin(countryCode);
        logger.debug(`Country context resolved: ${countryCode}`, {
          plugin: req.countryPlugin.name,
        });
      } catch (error) {
        if (required) {
          return next(error);
        }
        // Non-required: continue without plugin
        logger.debug(`Country plugin not found for ${countryCode}, continuing without it`);
        req.countryPlugin = null;
      }
    } else {
      if (required) {
        const ApiError = require('../utils/ApiError');
        return next(ApiError.badRequest('Country code is required for this operation'));
      }
      req.countryPlugin = null;
    }

    next();
  };
};

module.exports = { resolveCountryContext };
