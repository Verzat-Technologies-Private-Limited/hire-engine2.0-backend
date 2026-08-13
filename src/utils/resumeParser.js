const logger = require('../config/logger');

/**
 * Resume parser STUB.
 *
 * In production, this would integrate with a third-party resume parsing API
 * (e.g., Sovren, Affinda, or a custom ML model). For now, it returns
 * mock structured data based on the file metadata.
 *
 * The interface is stable — swap this implementation when a real parser is ready.
 */

/**
 * Parse a resume file and extract structured data.
 *
 * @param {object} file - Uploaded file metadata
 * @param {string} file.originalname - Original filename
 * @param {string} file.mimetype - File MIME type
 * @param {string} file.path - File path or URL
 * @returns {Promise<object>} Parsed resume data
 */
async function parseResume(file) {
  logger.info('[ResumeParser STUB] Parsing resume (stub mode)', {
    filename: file.originalname,
    mimetype: file.mimetype,
  });

  // Simulate async parsing delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return mock parsed data
  return {
    // Personal info (would be extracted from resume text)
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      location: '',
    },

    // Work experience entries
    experience: [
      {
        company: 'Sample Company',
        title: 'Software Engineer',
        startDate: '2020-01-01',
        endDate: '2023-12-31',
        description: 'Parsed from resume (stub data)',
        current: false,
      },
    ],

    // Education entries
    education: [
      {
        institution: 'Sample University',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        graduationYear: 2019,
      },
    ],

    // Extracted skills
    skills: ['JavaScript', 'Node.js', 'MongoDB', 'Express.js'],

    // Total years of experience (calculated)
    totalYearsOfExperience: 4,

    // Raw text content (for full-text search)
    rawText: `Resume content extracted from ${file.originalname} (stub)`,

    // Parsing metadata
    _parserMeta: {
      engine: 'stub',
      version: '1.0.0',
      parsedAt: new Date().toISOString(),
      confidence: 0, // 0 = stub, 1.0 = high confidence
    },
  };
}

module.exports = { parseResume };
