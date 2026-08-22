const Resume = require('../models/Resume');
const User = require('../models/User');
const Job = require('../models/Job');
const ApiError = require('../utils/ApiError');
const { parseResume } = require('../utils/resumeParser');
const { deleteCloudinaryFile } = require('../middlewares/upload.middleware');
const { calculateJobMatchScore, analyzeResumeFeedback } = require('../adapters/ai/gemini.adapter');
const { generateResumeEmbedding } = require('./embedding.service');
const logger = require('../config/logger');

/**
 * Auto-populate empty user profile fields from parsed resume data.
 * @param {string} userId
 * @param {object} parsedData
 */
async function autoPopulateUserProfile(userId, parsedData) {
  if (!parsedData) return;

  try {
    const user = await User.findById(userId);
    if (!user) return;

    const updates = {};

    // 1. Skills
    if (parsedData.skills && parsedData.skills.length > 0) {
      const existingSkills = new Set((user.skills || []).map((s) => s.toLowerCase()));
      const newSkills = parsedData.skills.filter((s) => !existingSkills.has(s.toLowerCase()));
      if (newSkills.length > 0) {
        updates.$addToSet = { skills: { $each: newSkills } };
      }
    }

    // 2. Headline
    if (!user.headline && parsedData.headline) {
      updates.headline = parsedData.headline.slice(0, 200);
    }

    // 3. Summary
    if (!user.summary && parsedData.summary) {
      updates.summary = parsedData.summary.slice(0, 2000);
    }

    // 4. Phone
    if (!user.phone && parsedData.personalInfo?.phone) {
      updates.phone = parsedData.personalInfo.phone.trim();
    }

    if (Object.keys(updates).length > 0) {
      await User.findByIdAndUpdate(userId, updates);
      logger.info('Auto-populated user profile from resume data', { userId });
    }
  } catch (err) {
    logger.warn('Failed to auto-populate user profile from resume', {
      userId,
      error: err.message,
    });
  }
}

/**
 * Upload and auto-parse a resume with Google Gemini AI.
 * @param {string} userId
 * @param {object} file - Multer upload file object (Cloudinary or buffer)
 * @param {string} [title]
 * @returns {Promise<object>}
 */
async function uploadResume(userId, file, title) {
  if (!file) {
    throw ApiError.badRequest('Resume file is required');
  }

  // Parse resume content with Gemini AI
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

  // Pre-fill user profile fields if empty
  await autoPopulateUserProfile(userId, parsedData);

  // Fire-and-forget: generate semantic search embedding
  generateResumeEmbedding(resume._id).catch((err) => {
    logger.error('Failed to generate resume embedding after upload', {
      resumeId: resume._id,
      error: err.message,
    });
  });

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
 * Re-parse an existing resume using Google Gemini AI.
 * @param {string} resumeId
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function reparseResume(resumeId, userId) {
  const resume = await Resume.findOne({ _id: resumeId, user: userId });
  if (!resume) {
    throw ApiError.notFound('Resume not found');
  }

  const fileDescriptor = {
    path: resume.fileUrl,
    originalname: resume.originalFileName || resume.title || 'resume.pdf',
    mimetype:
      resume.fileType === 'pdf'
        ? 'application/pdf'
        : resume.fileType === 'docx'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : resume.fileType === 'doc'
            ? 'application/msword'
            : 'text/plain',
  };

  const parsedData = await parseResume(fileDescriptor);

  resume.parsedData = parsedData;
  await resume.save();

  await autoPopulateUserProfile(userId, parsedData);

  // Fire-and-forget: regenerate semantic search embedding
  generateResumeEmbedding(resume._id).catch((err) => {
    logger.error('Failed to regenerate resume embedding after reparse', {
      resumeId: resume._id,
      error: err.message,
    });
  });

  return resume.toJSON();
}

/**
 * Generate AI quality feedback and ATS critique for a resume.
 * @param {string} resumeId
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getResumeAnalysis(resumeId, userId) {
  const resume = await Resume.findOne({ _id: resumeId, user: userId });
  console.log({ resume });
  if (!resume) {
    throw ApiError.notFound('Resume not found');
  }

  const analysis = await analyzeResumeFeedback(resume.parsedData);
  return {
    resumeId: resume._id,
    title: resume.title,
    ...analysis,
  };
}

/**
 * Calculate match score between a candidate's resume and a specific job posting.
 * @param {string} resumeId
 * @param {string} userId
 * @param {string} jobId
 * @returns {Promise<object>}
 */
async function getJobMatch(resumeId, userId, jobId) {
  const resume = await Resume.findOne({ _id: resumeId, user: userId });
  if (!resume) {
    throw ApiError.notFound('Resume not found');
  }

  const job = await Job.findById(jobId);
  if (!job) {
    throw ApiError.notFound('Job posting not found');
  }

  const matchData = await calculateJobMatchScore(resume.parsedData, job);

  return {
    resumeId: resume._id,
    jobId: job._id,
    jobTitle: job.title,
    company: job.company,
    ...matchData,
  };
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
  reparseResume,
  getResumeAnalysis,
  getJobMatch,
  updateResume,
  deleteResume,
};
