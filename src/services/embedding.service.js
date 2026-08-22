const Resume = require('../models/Resume');
const Job = require('../models/Job');
const { generateEmbedding, generateQueryEmbedding } = require('../adapters/ai/gemini.adapter');
const config = require('../config');
const logger = require('../config/logger');

// ── Text Builders ───────────────────────────────────────
// Build a rich text representation for embedding generation.

/**
 * Build embeddable text from parsed resume data.
 * Concatenates the most semantically meaningful fields.
 * @param {object} parsedData
 * @returns {string}
 */
function buildResumeText(parsedData) {
  if (!parsedData) return '';

  const parts = [];

  if (parsedData.headline) parts.push(`Title: ${parsedData.headline}`);
  if (parsedData.summary) parts.push(`Summary: ${parsedData.summary}`);

  if (Array.isArray(parsedData.skills) && parsedData.skills.length > 0) {
    parts.push(`Skills: ${parsedData.skills.join(', ')}`);
  }

  if (Array.isArray(parsedData.experience)) {
    const expText = parsedData.experience
      .map((e) => {
        const items = [];
        if (e.title) items.push(e.title);
        if (e.company) items.push(`at ${e.company}`);
        if (e.description) items.push(`- ${e.description.slice(0, 300)}`);
        return items.join(' ');
      })
      .join('. ');
    if (expText) parts.push(`Experience: ${expText}`);
  }

  if (Array.isArray(parsedData.education)) {
    const eduText = parsedData.education
      .map((e) => [e.degree, e.field, e.institution].filter(Boolean).join(' '))
      .join('. ');
    if (eduText) parts.push(`Education: ${eduText}`);
  }

  if (Array.isArray(parsedData.certifications)) {
    const certText = parsedData.certifications.map((c) => c.name).filter(Boolean).join(', ');
    if (certText) parts.push(`Certifications: ${certText}`);
  }

  if (parsedData.totalYearsOfExperience) {
    parts.push(`Total Experience: ${parsedData.totalYearsOfExperience} years`);
  }

  return parts.join('\n');
}

/**
 * Build embeddable text from a job document.
 * @param {object} job
 * @returns {string}
 */
function buildJobText(job) {
  if (!job) return '';

  const parts = [];

  if (job.title) parts.push(`Job Title: ${job.title}`);
  if (job.description) parts.push(`Description: ${job.description.slice(0, 3000)}`);

  if (Array.isArray(job.skills) && job.skills.length > 0) {
    parts.push(`Required Skills: ${job.skills.join(', ')}`);
  }

  if (job.qualifications) parts.push(`Qualifications: ${job.qualifications.slice(0, 1000)}`);
  if (job.responsibilities) parts.push(`Responsibilities: ${job.responsibilities.slice(0, 1000)}`);
  if (job.category) parts.push(`Category: ${job.category}`);
  if (job.experienceLevel) parts.push(`Experience Level: ${job.experienceLevel}`);
  if (job.employmentType) parts.push(`Employment Type: ${job.employmentType}`);
  if (job.workplaceType) parts.push(`Workplace Type: ${job.workplaceType}`);

  if (job.location) {
    const loc = [job.location.city, job.location.state, job.location.country]
      .filter(Boolean)
      .join(', ');
    if (loc) parts.push(`Location: ${loc}`);
  }

  return parts.join('\n');
}

// ── Embedding Generation & Storage ──────────────────────

/**
 * Generate and store embedding for a resume document.
 * @param {string} resumeId
 * @returns {Promise<boolean>} true if embedding was generated successfully
 */
async function generateResumeEmbedding(resumeId) {
  try {
    const resume = await Resume.findById(resumeId);
    if (!resume || !resume.parsedData) {
      logger.warn('[Embedding] Resume not found or has no parsed data', { resumeId });
      return false;
    }

    const text = buildResumeText(resume.parsedData);
    if (!text || text.length < 20) {
      logger.warn('[Embedding] Resume text too short for meaningful embedding', { resumeId });
      return false;
    }

    const vector = await generateEmbedding(text);
    if (!vector) {
      logger.warn('[Embedding] Failed to generate resume embedding', { resumeId });
      return false;
    }

    await Resume.findByIdAndUpdate(resumeId, {
      embedding: {
        vector,
        model: config.gemini.embeddingModel || 'gemini-embedding-001',
        generatedAt: new Date(),
      },
    });

    logger.info('[Embedding] Resume embedding generated successfully', {
      resumeId,
      dimensions: vector.length,
    });
    return true;
  } catch (err) {
    logger.error('[Embedding] Error generating resume embedding', {
      resumeId,
      error: err.message,
    });
    return false;
  }
}

/**
 * Generate and store embedding for a job document.
 * @param {string} jobId
 * @returns {Promise<boolean>} true if embedding was generated successfully
 */
async function generateJobEmbedding(jobId) {
  try {
    const job = await Job.findById(jobId);
    if (!job) {
      logger.warn('[Embedding] Job not found', { jobId });
      return false;
    }

    const text = buildJobText(job);
    if (!text || text.length < 20) {
      logger.warn('[Embedding] Job text too short for meaningful embedding', { jobId });
      return false;
    }

    const vector = await generateEmbedding(text);
    if (!vector) {
      logger.warn('[Embedding] Failed to generate job embedding', { jobId });
      return false;
    }

    await Job.findByIdAndUpdate(jobId, {
      embedding: {
        vector,
        model: config.gemini.embeddingModel || 'gemini-embedding-001',
        generatedAt: new Date(),
      },
    });

    logger.info('[Embedding] Job embedding generated successfully', {
      jobId,
      dimensions: vector.length,
    });
    return true;
  } catch (err) {
    logger.error('[Embedding] Error generating job embedding', {
      jobId,
      error: err.message,
    });
    return false;
  }
}

// ── Atlas $vectorSearch Helpers ──────────────────────────

/**
 * Semantic search on resumes using MongoDB Atlas $vectorSearch.
 * @param {string} queryText - Natural language search query
 * @param {object} [filters={}] - Pre-filters (skills, experienceMin, experienceMax, education)
 * @param {object} [pagination={}] - { page, limit }
 * @returns {Promise<{ docs: Array, meta: object }>}
 */
async function semanticSearchResumes(queryText, filters = {}, pagination = {}) {
  const queryVector = await generateQueryEmbedding(queryText);
  if (!queryVector) {
    return { docs: [], meta: { pagination: { currentPage: 1, totalPages: 0, totalDocs: 0, limit: 20 } } };
  }

  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 20));
  const numCandidates = Math.max(limit * 10, 100); // Atlas recommends 10-20x limit

  // Build $vectorSearch filter for Atlas (only indexed fields can be filtered)
  const vectorFilter = {};
  if (filters.skills) {
    const skillList = Array.isArray(filters.skills) ? filters.skills : filters.skills.split(',');
    vectorFilter['parsedData.skills'] = {
      $in: skillList.map((s) => new RegExp(s.trim(), 'i')),
    };
  }

  const pipeline = [
    {
      $vectorSearch: {
        index: 'resume_vector_index',
        path: 'embedding.vector',
        queryVector,
        numCandidates,
        limit: limit * page, // Fetch enough for pagination
      },
    },
    {
      $addFields: {
        semanticScore: { $meta: 'vectorSearchScore' },
      },
    },
  ];

  // Apply post-filters that can't be in $vectorSearch filter
  const matchStage = {};
  if (filters.experienceMin || filters.experienceMax) {
    matchStage['parsedData.totalYearsOfExperience'] = {};
    if (filters.experienceMin) matchStage['parsedData.totalYearsOfExperience'].$gte = Number(filters.experienceMin);
    if (filters.experienceMax) matchStage['parsedData.totalYearsOfExperience'].$lte = Number(filters.experienceMax);
  }
  if (filters.education) {
    matchStage['parsedData.education.degree'] = { $regex: filters.education, $options: 'i' };
  }
  if (filters.skills) {
    const skillList = Array.isArray(filters.skills) ? filters.skills : filters.skills.split(',');
    matchStage['parsedData.skills'] = { $all: skillList.map((s) => new RegExp(s.trim(), 'i')) };
  }
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  // Populate user info
  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
  );

  // Exclude embedding vector from results (large payload)
  pipeline.push({
    $project: {
      'embedding.vector': 0,
      'user.passwordHash': 0,
      'user.refreshToken': 0,
      'user.__v': 0,
    },
  });

  // Pagination via $skip/$limit on the already-sorted results
  const skip = (page - 1) * limit;
  pipeline.push({ $skip: skip }, { $limit: limit });

  const docs = await Resume.aggregate(pipeline);

  // For total count, run a simpler count pipeline
  const countPipeline = [
    {
      $vectorSearch: {
        index: 'resume_vector_index',
        path: 'embedding.vector',
        queryVector,
        numCandidates,
        limit: numCandidates,
      },
    },
  ];
  if (Object.keys(matchStage).length > 0) {
    countPipeline.push({ $match: matchStage });
  }
  countPipeline.push({ $count: 'total' });

  const countResult = await Resume.aggregate(countPipeline);
  const totalDocs = countResult.length > 0 ? countResult[0].total : 0;
  const totalPages = Math.ceil(totalDocs / limit);

  return {
    docs,
    meta: {
      pagination: {
        currentPage: page,
        totalPages,
        totalDocs,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
  };
}

/**
 * Semantic search on jobs using MongoDB Atlas $vectorSearch.
 * @param {string} queryText - Natural language search query
 * @param {object} [filters={}] - Pre-filters
 * @param {object} [pagination={}] - { page, limit }
 * @returns {Promise<{ docs: Array, meta: object }>}
 */
async function semanticSearchJobs(queryText, filters = {}, pagination = {}) {
  const queryVector = await generateQueryEmbedding(queryText);
  if (!queryVector) {
    return { docs: [], meta: { pagination: { currentPage: 1, totalPages: 0, totalDocs: 0, limit: 20 } } };
  }

  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 20));
  const numCandidates = Math.max(limit * 10, 100);

  const pipeline = [
    {
      $vectorSearch: {
        index: 'job_vector_index',
        path: 'embedding.vector',
        queryVector,
        numCandidates,
        limit: limit * page,
      },
    },
    {
      $addFields: {
        semanticScore: { $meta: 'vectorSearchScore' },
      },
    },
  ];

  // Post-filters
  const matchStage = { status: 'active' };
  if (filters.employmentType) {
    const types = Array.isArray(filters.employmentType) ? filters.employmentType : filters.employmentType.split(',');
    matchStage.employmentType = { $in: types };
  }
  if (filters.workplaceType) {
    const types = Array.isArray(filters.workplaceType) ? filters.workplaceType : filters.workplaceType.split(',');
    matchStage.workplaceType = { $in: types };
  }
  if (filters.experienceLevel) {
    matchStage.experienceLevel = filters.experienceLevel;
  }
  if (filters.salaryMin || filters.salaryMax) {
    matchStage['salaryRange.min'] = {};
    if (filters.salaryMin) matchStage['salaryRange.min'].$gte = Number(filters.salaryMin);
    if (filters.salaryMax) matchStage['salaryRange.min'].$lte = Number(filters.salaryMax);
  }
  if (filters.location) {
    matchStage.$or = [
      { 'location.city': { $regex: filters.location, $options: 'i' } },
      { 'location.state': { $regex: filters.location, $options: 'i' } },
      { 'location.country': { $regex: filters.location, $options: 'i' } },
    ];
  }
  if (filters.datePosted) {
    const now = Date.now();
    let days = 30;
    if (filters.datePosted === 'today') days = 1;
    if (filters.datePosted === '3days') days = 3;
    if (filters.datePosted === '7days') days = 7;
    if (filters.datePosted === '14days') days = 14;
    matchStage.createdAt = { $gte: new Date(now - days * 24 * 60 * 60 * 1000) };
  }

  pipeline.push({ $match: matchStage });

  // Populate company
  pipeline.push(
    {
      $lookup: {
        from: 'companies',
        localField: 'company',
        foreignField: '_id',
        as: 'company',
      },
    },
    { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } }
  );

  // Exclude embedding vector from results
  pipeline.push({
    $project: {
      'embedding.vector': 0,
      'company.__v': 0,
    },
  });

  const skip = (page - 1) * limit;
  pipeline.push({ $skip: skip }, { $limit: limit });

  const docs = await Job.aggregate(pipeline);

  // Count
  const countPipeline = [
    {
      $vectorSearch: {
        index: 'job_vector_index',
        path: 'embedding.vector',
        queryVector,
        numCandidates,
        limit: numCandidates,
      },
    },
    { $match: matchStage },
    { $count: 'total' },
  ];
  const countResult = await Job.aggregate(countPipeline);
  const totalDocs = countResult.length > 0 ? countResult[0].total : 0;
  const totalPages = Math.ceil(totalDocs / limit);

  return {
    docs,
    meta: {
      pagination: {
        currentPage: page,
        totalPages,
        totalDocs,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
  };
}

/**
 * Find resumes similar to a given resume using vector similarity.
 * @param {string} resumeId
 * @param {number} [limit=10]
 * @returns {Promise<Array>}
 */
async function findSimilarResumes(resumeId, limit = 10) {
  const resume = await Resume.findById(resumeId);
  if (!resume || !resume.embedding?.vector?.length) {
    return [];
  }

  const pipeline = [
    {
      $vectorSearch: {
        index: 'resume_vector_index',
        path: 'embedding.vector',
        queryVector: resume.embedding.vector,
        numCandidates: limit * 10,
        limit: limit + 1, // +1 because the source resume will match itself
      },
    },
    { $addFields: { semanticScore: { $meta: 'vectorSearchScore' } } },
    { $match: { _id: { $ne: resume._id } } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        'embedding.vector': 0,
        'user.passwordHash': 0,
        'user.refreshToken': 0,
      },
    },
  ];

  return Resume.aggregate(pipeline);
}

/**
 * Find jobs similar to a given job using vector similarity.
 * @param {string} jobId
 * @param {number} [limit=10]
 * @returns {Promise<Array>}
 */
async function findSimilarJobs(jobId, limit = 10) {
  const job = await Job.findById(jobId);
  if (!job || !job.embedding?.vector?.length) {
    return [];
  }

  const pipeline = [
    {
      $vectorSearch: {
        index: 'job_vector_index',
        path: 'embedding.vector',
        queryVector: job.embedding.vector,
        numCandidates: limit * 10,
        limit: limit + 1,
      },
    },
    { $addFields: { semanticScore: { $meta: 'vectorSearchScore' } } },
    { $match: { _id: { $ne: job._id }, status: 'active' } },
    { $limit: limit },
    {
      $lookup: {
        from: 'companies',
        localField: 'company',
        foreignField: '_id',
        as: 'company',
      },
    },
    { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        'embedding.vector': 0,
      },
    },
  ];

  return Job.aggregate(pipeline);
}

/**
 * AI-rank all resumes with embeddings against a specific job posting.
 * Useful for recruiters to find best candidates for a job.
 * @param {string} jobId
 * @param {object} [pagination={}]
 * @returns {Promise<{ docs: Array, meta: object }>}
 */
async function rankResumesByJob(jobId, pagination = {}) {
  const job = await Job.findById(jobId);
  if (!job) {
    return { docs: [], meta: { pagination: { currentPage: 1, totalPages: 0, totalDocs: 0, limit: 20 } } };
  }

  // Use the job's embedding vector or generate one from job text
  let queryVector = job.embedding?.vector;
  if (!queryVector || queryVector.length === 0) {
    const text = buildJobText(job);
    queryVector = await generateQueryEmbedding(text);
    if (!queryVector) {
      return { docs: [], meta: { pagination: { currentPage: 1, totalPages: 0, totalDocs: 0, limit: 20 } } };
    }
  }

  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 20));
  const numCandidates = Math.max(limit * 10, 200);

  const pipeline = [
    {
      $vectorSearch: {
        index: 'resume_vector_index',
        path: 'embedding.vector',
        queryVector,
        numCandidates,
        limit: limit * page,
      },
    },
    { $addFields: { semanticScore: { $meta: 'vectorSearchScore' } } },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        'embedding.vector': 0,
        'user.passwordHash': 0,
        'user.refreshToken': 0,
      },
    },
  ];

  const skip = (page - 1) * limit;
  pipeline.push({ $skip: skip }, { $limit: limit });

  const docs = await Resume.aggregate(pipeline);

  // Count
  const countPipeline = [
    {
      $vectorSearch: {
        index: 'resume_vector_index',
        path: 'embedding.vector',
        queryVector,
        numCandidates,
        limit: numCandidates,
      },
    },
    { $count: 'total' },
  ];
  const countResult = await Resume.aggregate(countPipeline);
  const totalDocs = countResult.length > 0 ? countResult[0].total : 0;
  const totalPages = Math.ceil(totalDocs / limit);

  return {
    docs,
    meta: {
      pagination: {
        currentPage: page,
        totalPages,
        totalDocs,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      jobTitle: job.title,
      jobId: job._id,
    },
  };
}

module.exports = {
  buildResumeText,
  buildJobText,
  generateResumeEmbedding,
  generateJobEmbedding,
  semanticSearchResumes,
  semanticSearchJobs,
  findSimilarResumes,
  findSimilarJobs,
  rankResumesByJob,
};
