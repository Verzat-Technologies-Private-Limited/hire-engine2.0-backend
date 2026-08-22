const logger = require('../config/logger');
const { extractTextFromFile } = require('./fileExtractor');
const { parseResumeWithGemini } = require('../adapters/ai/gemini.adapter');

/**
 * Parse a resume file and extract structured data using Google Gemini AI.
 * Supports PDF, DOCX/DOC, and TXT documents.
 *
 * @param {object} file - Uploaded file object (path, mimetype, originalname, buffer)
 * @returns {Promise<object>} Parsed resume data
 */
async function parseResume(file) {
  if (!file) {
    throw new Error('No file provided for parsing');
  }

  logger.info('[ResumeParser] Parsing resume document', {
    filename: file.originalname,
    mimetype: file.mimetype,
    path: file.path ? file.path.slice(0, 80) : 'in-memory',
  });

  try {
    // 1. Extract plain text & binary buffer from file
    const { text, mimetype, originalname } = await extractTextFromFile(file);

    // 2. Parse structured data using Google Gemini AI
    const parsedData = await parseResumeWithGemini(text, { mimetype, originalname });

    logger.info('[ResumeParser] Successfully parsed resume', {
      filename: file.originalname,
      skillsCount: parsedData.skills ? parsedData.skills.length : 0,
      experienceCount: parsedData.experience ? parsedData.experience.length : 0,
      engine: parsedData._parserMeta ? parsedData._parserMeta.engine : 'unknown',
    });

    return parsedData;
  } catch (err) {
    logger.error('[ResumeParser] Failed to parse resume', {
      filename: file.originalname,
      error: err.message,
    });

    // Fallback stub structure to ensure request continuity
    return {
      personalInfo: {
        name: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        github: '',
        portfolio: '',
      },
      headline: '',
      summary: '',
      experience: [],
      education: [],
      skills: ['JavaScript', 'Node.js'],
      certifications: [],
      languages: [],
      totalYearsOfExperience: 0,
      rawText: `Error parsing content from ${file.originalname}`,
      _parserMeta: {
        engine: 'error-fallback',
        version: '1.0.0',
        parsedAt: new Date(),
        confidence: 0,
      },
    };
  }
}

module.exports = { parseResume };
