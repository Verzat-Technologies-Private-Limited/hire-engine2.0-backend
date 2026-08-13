/**
 * Standardized API response wrapper.
 * Ensures every successful response follows the same shape:
 *
 * {
 *   success: true,
 *   statusCode: 200,
 *   message: "...",
 *   data: { ... },
 *   meta: { pagination: { ... } }   // optional
 * }
 */
class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Response message
   * @param {*} [data=null] - Response payload
   * @param {object} [meta={}] - Metadata (pagination, counts, etc.)
   */
  constructor(statusCode, message, data = null, meta = {}) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;

    // Only include meta if it has properties
    if (Object.keys(meta).length > 0) {
      this.meta = meta;
    }
  }

  /**
   * Send this response via Express res object.
   * @param {import('express').Response} res
   */
  send(res) {
    return res.status(this.statusCode).json(this);
  }

  // ── Factory methods ─────────────────────────────

  static ok(message, data, meta) {
    return new ApiResponse(200, message, data, meta);
  }

  static created(message, data) {
    return new ApiResponse(201, message, data);
  }

  static noContent(res) {
    return res.status(204).send();
  }
}

module.exports = ApiResponse;
