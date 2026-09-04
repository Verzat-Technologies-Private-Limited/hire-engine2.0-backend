const path = require('path');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const config = require('../config');
const ApiError = require('../utils/ApiError');
const { ALLOWED_RESUME_MIMES, MAX_RESUME_SIZE_BYTES } = require('../utils/constants');

// Helper to sanitize filename and extract extension
const getCleanFileInfo = (originalname, defaultExt = 'pdf') => {
  const extWithDot = path.extname(originalname || '');
  const ext = extWithDot ? extWithDot.replace(/^\./, '').toLowerCase() : defaultExt;
  const baseName = path.basename(originalname || 'file', extWithDot).replace(/[^a-zA-Z0-9-_]/g, '_');
  return { baseName, ext };
};

// ── Configure Cloudinary ──────────────────────────
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

// ── Cloudinary storage for resumes ────────────────
const resumeStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'hire-engine/resumes',
    resource_type: 'raw', // PDFs and documents are 'raw' in Cloudinary
    // Preserve extension in public_id so Cloudinary URL contains file extension
    public_id: (_req, file) => {
      const timestamp = Date.now();
      const { baseName, ext } = getCleanFileInfo(file.originalname, 'pdf');
      return `resume_${baseName}_${timestamp}.${ext}`;
    },
  },
});

// ── Cloudinary storage for images (logos, avatars) ─
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'hire-engine/images',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit', quality: 'auto' }],
    public_id: (_req, file) => {
      const timestamp = Date.now();
      const cleanName = file.originalname.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_');
      return `img_${cleanName}_${timestamp}`;
    },
  },
});

// ── File filter for resumes ───────────────────────
const resumeFileFilter = (_req, file, cb) => {
  if (ALLOWED_RESUME_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      ApiError.badRequest(
        `Invalid file type: ${file.mimetype}. Allowed types: PDF, Word (doc/docx), Text.`
      ),
      false
    );
  }
};

// ── File filter for images ────────────────────────
const imageFileFilter = (_req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      ApiError.badRequest(
        `Invalid image type: ${file.mimetype}. Allowed: JPEG, PNG, WebP.`
      ),
      false
    );
  }
};

// ── Multer upload instances ───────────────────────

/**
 * Resume upload middleware.
 * Accepts a single file in the 'resume' field.
 * Max size: 5 MB.
 */
const uploadResume = multer({
  storage: resumeStorage,
  fileFilter: resumeFileFilter,
  limits: { fileSize: MAX_RESUME_SIZE_BYTES },
}).single('resume');

/**
 * Image upload middleware (logos, avatars).
 * Accepts a single file in the 'image' field.
 * Max size: 2 MB.
 */
const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('image');

/**
 * Document upload middleware (company verification docs).
 * Accepts multiple files in the 'documents' field (max 5).
 * Max size per file: 10 MB.
 */
const uploadDocuments = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'hire-engine/documents',
      resource_type: 'raw',
      // Preserve extension in public_id so Cloudinary URL contains file extension
      public_id: (_req, file) => {
        const timestamp = Date.now();
        const { baseName, ext } = getCleanFileInfo(file.originalname, 'pdf');
        return `doc_${baseName}_${timestamp}.${ext}`;
      },
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
}).array('documents', 5);

/**
 * Single document upload middleware (company verification doc).
 * Accepts a single file in the 'document' field.
 * Max size: 10 MB.
 */
const uploadDocument = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'hire-engine/documents',
      resource_type: 'raw',
      public_id: (_req, file) => {
        const timestamp = Date.now();
        const { baseName, ext } = getCleanFileInfo(file.originalname, 'pdf');
        return `doc_${baseName}_${timestamp}.${ext}`;
      },
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('document');

/**
 * Delete a file from Cloudinary.
 * @param {string} publicId - Cloudinary public ID
 * @param {string} [resourceType='raw'] - 'raw' | 'image'
 */
const deleteCloudinaryFile = async (publicId, resourceType = 'raw') => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    // Log but don't throw — file deletion failure shouldn't block the request
    const logger = require('../config/logger');
    logger.error('Failed to delete Cloudinary file', {
      publicId,
      resourceType,
      error: error.message,
    });
  }
};

module.exports = {
  cloudinary,
  uploadResume,
  uploadImage,
  uploadDocuments,
  uploadDocument,
  deleteCloudinaryFile,
};
