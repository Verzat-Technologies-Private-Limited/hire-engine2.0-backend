const cloudinary = require('cloudinary').v2;
const config = require('../../config');
const logger = require('../../config/logger');

/**
 * Cloudinary storage adapter.
 * Provides upload, delete, and URL generation for files stored on Cloudinary.
 *
 * Note: File upload via Multer is handled by the upload middleware.
 * This adapter provides direct programmatic access for operations
 * outside the HTTP request lifecycle (e.g., background jobs, cleanup).
 */

// Configure Cloudinary (idempotent — safe to call multiple times)
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

/**
 * Upload a file to Cloudinary.
 * @param {string} filePath - Local file path or URL
 * @param {object} [options]
 * @param {string} [options.folder='hire-engine'] - Cloudinary folder
 * @param {string} [options.resourceType='raw'] - 'raw' | 'image' | 'video'
 * @param {string} [options.publicId] - Custom public ID
 * @returns {Promise<{ url: string, publicId: string, format: string, bytes: number }>}
 */
async function uploadFile(filePath, options = {}) {
  const { folder = 'hire-engine', resourceType = 'raw', publicId } = options;

  const uploadOptions = {
    folder,
    resource_type: resourceType,
    use_filename: true,
    unique_filename: true,
  };

  if (publicId) {
    uploadOptions.public_id = publicId;
  }

  const result = await cloudinary.uploader.upload(filePath, uploadOptions);

  logger.debug('File uploaded to Cloudinary', {
    publicId: result.public_id,
    url: result.secure_url,
    bytes: result.bytes,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    bytes: result.bytes,
  };
}

/**
 * Delete a file from Cloudinary.
 * @param {string} publicId - Cloudinary public ID
 * @param {string} [resourceType='raw'] - 'raw' | 'image' | 'video'
 * @returns {Promise<boolean>} true if deleted
 */
async function deleteFile(publicId, resourceType = 'raw') {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    const success = result.result === 'ok';
    if (success) {
      logger.debug('File deleted from Cloudinary', { publicId });
    } else {
      logger.warn('Cloudinary delete returned non-ok result', { publicId, result: result.result });
    }
    return success;
  } catch (error) {
    logger.error('Failed to delete file from Cloudinary', {
      publicId,
      error: error.message,
    });
    return false;
  }
}

/**
 * Generate a signed URL for private file access.
 * @param {string} publicId
 * @param {object} [options]
 * @param {number} [options.expiresInSeconds=3600]
 * @param {string} [options.resourceType='raw']
 * @returns {string} Signed URL
 */
function getSignedUrl(publicId, options = {}) {
  const { expiresInSeconds = 3600, resourceType = 'raw' } = options;

  return cloudinary.utils.private_download_url(publicId, '', {
    resource_type: resourceType,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
}

module.exports = {
  cloudinary,
  uploadFile,
  deleteFile,
  getSignedUrl,
};
