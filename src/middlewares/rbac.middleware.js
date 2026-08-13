const ApiError = require('../utils/ApiError');

/**
 * Role-based access control middleware factory.
 * Returns middleware that checks if req.user.role is in the allowed roles list.
 *
 * Usage:
 *   router.post('/jobs', authenticate, authorize('employer', 'admin'), createJob);
 *
 * @param  {...string} allowedRoles - Roles allowed to access this route
 * @returns {Function} Express middleware
 */
const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication is required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(
        `Access denied. This action requires one of the following roles: ${allowedRoles.join(', ')}`
      );
    }

    next();
  };
};

/**
 * Permission-based access control for company team members.
 * Checks if the authenticated user has a specific permission within their company.
 *
 * Usage:
 *   router.get('/applications', authenticate, requirePermission('view_applications'), listApps);
 *
 * @param {string} permission - Required permission from TeamPermission enum
 * @returns {Function} Express middleware
 */
const requirePermission = (permission) => {
  return (req, _res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication is required');
    }

    // Admins bypass permission checks
    if (req.user.role === 'admin') {
      return next();
    }

    // Company owners have all permissions
    if (req.companyMember && req.companyMember.isOwner) {
      return next();
    }

    // Check if team member has the required permission
    if (
      req.companyMember &&
      req.companyMember.permissions &&
      req.companyMember.permissions.includes(permission)
    ) {
      return next();
    }

    throw ApiError.forbidden(
      `Access denied. You need the "${permission}" permission to perform this action.`
    );
  };
};

module.exports = { authorize, requirePermission };
