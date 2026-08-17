const Resume = require('../models/Resume');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { parseResume } = require('../utils/resumeParser');
const { deleteCloudinaryFile } = require('../middlewares/upload.middleware');
const logger = require('../config/logger');

/**
 * Upload and auto-parse a resume.
 * @param {string} userId
 * @param {object} file - Multer upload file object (Cloudinary)
 * @param {string} [title]
 * @returns {Promise<object>}
 */
async function uploadResume(userId, file, title) {
  if (!file) {
    throw ApiError.badRequest('Resume file is required');
  }

  // Parse resume content (using resume parser stub)
  const parsedData = await parseResume(file);

  // Check if user has any existing default resume
  const existingCount = await Resume.countDocuments({ user: userId });
  const isDefault = existingCount === 0;

  // Determine file extension/type
  const ext = file.originalname.split('.').pop().toLowerCase();
  const fileType = ['pdf', 'docx', 'doc', 'txt'].includes(ext) ? ext : 'pdf';

  const resume = await Resume.create({
    user: userId,
    title: title || file.originalname,
    fileUrl: file.path,
    publicId: file.filename || file.public_id || `resume_${Date.now()}.${fileType}`,
    fileType,
    fileSize: file.size || 0,
    originalFileName: file.originalname,
    isDefault,
    parsedData,
  });

  // Pre-fill user skills and summary if empty
  if (parsedData.skills && parsedData.skills.length > 0) {
    await User.findByIdAndUpdate(userId, {
      $addToSet: { skills: { $each: parsedData.skills } },
    });
  }

  return resume.toJSON();
}

/**
 * List all resumes for a user.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function getUserResumes(userId) {
  return Resume.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
}

/**
 * Get a specific resume by ID.
 * @param {string} resumeId
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getResumeById(resumeId, userId) {
  const resume = await Resume.findOne({ _id: resumeId, user: userId });
  if (!resume) {
    throw ApiError.notFound('Resume not found');
  }
  return resume.toJSON();
}

/**
 * Update resume title or default status.
 * @param {string} resumeId
 * @param {string} userId
 * @param {object} updateData
 * @returns {Promise<object>}
 */
async function updateResume(resumeId, userId, updateData) {
  const resume = await Resume.findOne({ _id: resumeId, user: userId });
  if (!resume) {
    throw ApiError.notFound('Resume not found');
  }

  if (updateData.title) resume.title = updateData.title;
  if (typeof updateData.isDefault === 'boolean') resume.isDefault = updateData.isDefault;

  await resume.save();
  return resume.toJSON();
}

/**
 * Delete a resume.
 * @param {string} resumeId
 * @param {string} userId
 */
async function deleteResume(resumeId, userId) {
  const resume = await Resume.findOne({ _id: resumeId, user: userId });
  if (!resume) {
    throw ApiError.notFound('Resume not found');
  }

  // Delete file from Cloudinary
  if (resume.publicId) {
    await deleteCloudinaryFile(resume.publicId, 'raw');
  }

  await resume.deleteOne();

  // If deleted resume was default, set another one as default if available
  if (resume.isDefault) {
    const nextResume = await Resume.findOne({ user: userId }).sort({ createdAt: -1 });
    if (nextResume) {
      nextResume.isDefault = true;
      await nextResume.save();
    }
  }
}

module.exports = {
  uploadResume,
  getUserResumes,
  getResumeById,
  updateResume,
  deleteResume,
};
