/**
 * Pagination utilities for Mongoose queries.
 * Supports offset-based pagination (page/limit) with total count.
 */

/**
 * Parse pagination parameters from query string.
 * @param {object} query - Express req.query
 * @param {object} [defaults]
 * @param {number} [defaults.page=1]
 * @param {number} [defaults.limit=20]
 * @param {number} [defaults.maxLimit=100]
 * @returns {{ page: number, limit: number, skip: number }}
 */
function parsePaginationParams(query, { page = 1, limit = 20, maxLimit = 100 } = {}) {
  let parsedPage = parseInt(query.page, 10);
  let parsedLimit = parseInt(query.limit, 10);

  if (isNaN(parsedPage) || parsedPage < 1) parsedPage = page;
  if (isNaN(parsedLimit) || parsedLimit < 1) parsedLimit = limit;
  if (parsedLimit > maxLimit) parsedLimit = maxLimit;

  const skip = (parsedPage - 1) * parsedLimit;

  return { page: parsedPage, limit: parsedLimit, skip };
}

/**
 * Build pagination metadata for API responses.
 * @param {number} totalDocs - Total number of matching documents
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} Pagination metadata
 */
function buildPaginationMeta(totalDocs, page, limit) {
  const totalPages = Math.ceil(totalDocs / limit);

  return {
    pagination: {
      currentPage: page,
      totalPages,
      totalDocs,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Execute a paginated Mongoose query.
 * @param {import('mongoose').Model} Model - Mongoose model
 * @param {object} filter - Mongoose query filter
 * @param {object} query - Express req.query (for page/limit parsing)
 * @param {object} [options]
 * @param {string} [options.sort='-createdAt'] - Sort string
 * @param {string} [options.select] - Field selection
 * @param {string|Array} [options.populate] - Population paths
 * @returns {Promise<{ docs: Array, meta: object }>}
 */
async function paginateQuery(Model, filter, query, options = {}) {
  const { page, limit, skip } = parsePaginationParams(query);
  const { sort = '-createdAt', select, populate } = options;

  const [docs, totalDocs] = await Promise.all([
    Model.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(select || '')
      .populate(populate || '')
      .lean(),
    Model.countDocuments(filter),
  ]);

  const meta = buildPaginationMeta(totalDocs, page, limit);

  return { docs, meta };
}

module.exports = {
  parsePaginationParams,
  buildPaginationMeta,
  paginateQuery,
};
