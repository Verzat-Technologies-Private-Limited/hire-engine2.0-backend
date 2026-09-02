const Job = require('../models/Job');
const Resume = require('../models/Resume');
const SavedSearch = require('../models/SavedSearch');
const ApiError = require('../utils/ApiError');
const { paginateQuery } = require('../utils/pagination');
const {
  semanticSearchJobs,
  semanticSearchResumes,
  findSimilarJobs,
  findSimilarResumes,
  rankResumesByJob,
} = require('./embedding.service');
const { generateQueryEmbedding } = require('../adapters/ai/gemini.adapter');
const logger = require('../config/logger');

/**
 * Advanced Job Search with keyword matching, filters (salary, location, radius, date, employment type), and sorting.
 * Supports three modes: keyword (legacy), semantic (AI), and hybrid (combined).
 * @param {object} searchParams
 * @returns {Promise<object>}
 */
async function searchJobs(searchParams) {
  const {
    q,
    title,
    company,
    location,
    radius,
    lat,
    lng,
    salaryMin,
    salaryMax,
    employmentType,
    workplaceType,
    experienceLevel,
    datePosted,
    skills,
    sort = 'relevance',
    mode = 'hybrid',
  } = searchParams;

  // ── Semantic-only mode ──────────────────────────
  if (mode === 'semantic' && q) {
    return semanticSearchJobs(q, {
      employmentType,
      workplaceType,
      experienceLevel,
      salaryMin,
      salaryMax,
      location,
      datePosted,
    }, searchParams);
  }

  // ── Hybrid mode: run keyword + semantic in parallel ──
  if (mode === 'hybrid' && q) {
    const [keywordResult, semanticResult] = await Promise.allSettled([
      _keywordSearchJobs(searchParams),
      semanticSearchJobs(q, {
        employmentType,
        workplaceType,
        experienceLevel,
        salaryMin,
        salaryMax,
        location,
        datePosted,
      }, searchParams),
    ]);

    const keywordDocs = keywordResult.status === 'fulfilled' ? keywordResult.value.docs : [];
    const semanticDocs = semanticResult.status === 'fulfilled' ? semanticResult.value.docs : [];

    // Merge & deduplicate: union both sets, prefer semantic score when available
    const merged = _mergeAndRankResults(keywordDocs, semanticDocs, 'jobs');

    // Apply pagination on merged
    const page = Math.max(1, parseInt(searchParams.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.limit, 10) || 20));
    const start = (page - 1) * limit;
    const paged = merged.slice(start, start + limit);
    const totalDocs = merged.length;
    const totalPages = Math.ceil(totalDocs / limit);

    return {
      docs: paged,
      meta: {
        searchMode: 'hybrid',
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

  // ── Keyword mode (default, legacy) ──────────────
  return _keywordSearchJobs(searchParams);
}

/**
 * Internal: keyword-based job search (original logic).
 */
async function _keywordSearchJobs(searchParams) {
  const {
    q,
    title,
    employmentType,
    workplaceType,
    experienceLevel,
    skills,
    salaryMin,
    salaryMax,
    datePosted,
    lat,
    lng,
    radius,
    location,
    sort = 'relevance',
  } = searchParams;

  const filter = { status: 'active' };

  // 1. Text Search / Keyword matching
  if (q) {
    filter.$text = { $search: q };
  }
  if (title) {
    filter.title = { $regex: title, $options: 'i' };
  }

  // 2. Filters
  if (employmentType) {
    const types = Array.isArray(employmentType) ? employmentType : employmentType.split(',');
    filter.employmentType = { $in: types };
  }

  if (workplaceType) {
    const types = Array.isArray(workplaceType) ? workplaceType : workplaceType.split(',');
    filter.workplaceType = { $in: types };
  }

  if (experienceLevel) {
    filter.experienceLevel = experienceLevel;
  }

  if (skills) {
    const skillList = Array.isArray(skills) ? skills : skills.split(',');
    filter.skills = { $all: skillList.map((s) => new RegExp(s.trim(), 'i')) };
  }

  // Salary range filter
  if (salaryMin || salaryMax) {
    filter['salaryRange.min'] = {};
    if (salaryMin) filter['salaryRange.min'].$gte = Number(salaryMin);
    if (salaryMax) filter['salaryRange.min'].$lte = Number(salaryMax);
  }

  // Date posted filter
  if (datePosted) {
    const now = Date.now();
    let days = 30;
    if (datePosted === 'today') days = 1;
    if (datePosted === '3days') days = 3;
    if (datePosted === '7days') days = 7;
    if (datePosted === '14days') days = 14;
    filter.createdAt = { $gte: new Date(now - days * 24 * 60 * 60 * 1000) };
  }

  // Location / GeoSpatial filter
  if (lat && lng && radius) {
    const isKm = searchParams.unit === 'km' || searchParams.unit === 'kilometers';
    const earthRadius = isKm ? 6378.1 : 3963.2; // Earth radius in km vs miles
    const radiusInRadians = Number(radius) / earthRadius;

    const geoOrRemoteCondition = [
      {
        'location.coordinates': {
          $geoWithin: {
            $centerSphere: [
              [Number(lng), Number(lat)],
              radiusInRadians,
            ],
          },
        },
      },
      { workplaceType: 'remote' },
    ];

    // If workplaceType was not explicitly restricted to non-remote, include both in-radius & remote jobs
    if (!filter.workplaceType) {
      if (!filter.$or) {
        filter.$or = geoOrRemoteCondition;
      } else {
        filter.$and = filter.$and || [];
        filter.$and.push({ $or: geoOrRemoteCondition });
      }
    } else {
      const types = Array.isArray(filter.workplaceType.$in) ? filter.workplaceType.$in : [];
      if (types.includes('remote')) {
        if (!filter.$or) {
          filter.$or = geoOrRemoteCondition;
        } else {
          filter.$and = filter.$and || [];
          filter.$and.push({ $or: geoOrRemoteCondition });
        }
      } else {
        filter['location.coordinates'] = {
          $geoWithin: {
            $centerSphere: [
              [Number(lng), Number(lat)],
              radiusInRadians,
            ],
          },
        };
      }
    }
  } else if (location) {
    const locationCondition = [
      { 'location.city': { $regex: location, $options: 'i' } },
      { 'location.state': { $regex: location, $options: 'i' } },
      { 'location.country': { $regex: location, $options: 'i' } },
    ];
    if (!filter.$or) {
      filter.$or = locationCondition;
    } else {
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: locationCondition });
    }
  }

  // 3. Sorting options
  let sortOption = '-isSponsored -createdAt'; // Sponsored jobs boost
  if (sort === 'date') sortOption = '-createdAt';
  if (sort === 'salary_desc') sortOption = '-salaryRange.max -createdAt';
  if (sort === 'salary_asc') sortOption = 'salaryRange.min -createdAt';
  if (sort === 'relevance' && q) {
    sortOption = { score: { $meta: 'textScore' }, isSponsored: -1 };
  }

  return paginateQuery(Job, filter, searchParams, {
    populate: 'company',
    sort: sortOption,
  });
}

/**
 * Talent Sourcing / Resume Database Search with Boolean operators (AND/OR/NOT),
 * filters, and optional AI-powered Semantic Search.
 *
 * Modes:
 *   - keyword: Classic $text Boolean search (AND/OR/NOT operators, phrase matching)
 *   - semantic: Pure AI vector similarity search via Atlas $vectorSearch
 *   - hybrid: Runs both keyword + semantic, merges and re-ranks by combined score
 *
 * @param {object} searchParams
 * @returns {Promise<object>}
 */
async function searchResumes(searchParams) {
  const {
    q,
    skills,
    location,
    experienceMin,
    experienceMax,
    education,
    sort,
    mode = 'hybrid',
  } = searchParams;

  const filters = { skills, experienceMin, experienceMax, education };

  // ── Semantic-only mode ──────────────────────────
  if (mode === 'semantic' && q) {
    const result = await semanticSearchResumes(q, filters, searchParams);
    result.meta.searchMode = 'semantic';
    return result;
  }

  // ── Hybrid mode: Boolean keyword + Semantic AI search combined ──
  if (mode === 'hybrid' && q) {
    const [keywordResult, semanticResult] = await Promise.allSettled([
      _keywordSearchResumes(searchParams),
      semanticSearchResumes(q, filters, searchParams),
    ]);

    const keywordDocs = keywordResult.status === 'fulfilled' ? keywordResult.value.docs : [];
    const semanticDocs = semanticResult.status === 'fulfilled' ? semanticResult.value.docs : [];

    if (keywordResult.status === 'rejected') {
      logger.warn('[Search] Keyword resume search failed in hybrid mode', {
        error: keywordResult.reason?.message,
      });
    }
    if (semanticResult.status === 'rejected') {
      logger.warn('[Search] Semantic resume search failed in hybrid mode', {
        error: semanticResult.reason?.message,
      });
    }

    // Merge & deduplicate, combine scores
    const merged = _mergeAndRankResults(keywordDocs, semanticDocs, 'resumes');

    // Apply pagination on merged results
    const page = Math.max(1, parseInt(searchParams.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.limit, 10) || 20));
    const start = (page - 1) * limit;
    const paged = merged.slice(start, start + limit);
    const totalDocs = merged.length;
    const totalPages = Math.ceil(totalDocs / limit);

    return {
      docs: paged,
      meta: {
        searchMode: 'hybrid',
        keywordResults: keywordDocs.length,
        semanticResults: semanticDocs.length,
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

  // ── Keyword mode (default Boolean search) ──────
  const result = await _keywordSearchResumes(searchParams);
  result.meta.searchMode = 'keyword';
  return result;
}

/**
 * Internal: Boolean keyword-based resume search (original logic).
 */
async function _keywordSearchResumes(searchParams) {
  const { q, skills, location, experienceMin, experienceMax, education, sort } = searchParams;

  const filter = {};

  // Boolean search support on resume text/skills
  if (q) {
    filter.$text = { $search: q };
  }

  if (skills) {
    const skillList = Array.isArray(skills) ? skills : skills.split(',');
    filter['parsedData.skills'] = { $all: skillList.map((s) => new RegExp(s.trim(), 'i')) };
  }

  if (experienceMin || experienceMax) {
    filter['parsedData.totalYearsOfExperience'] = {};
    if (experienceMin) filter['parsedData.totalYearsOfExperience'].$gte = Number(experienceMin);
    if (experienceMax) filter['parsedData.totalYearsOfExperience'].$lte = Number(experienceMax);
  }

  if (education) {
    filter['parsedData.education.degree'] = { $regex: education, $options: 'i' };
  }

  // Location filter — match against parsed resume location and experience locations
  if (location) {
    filter.$or = [
      { 'parsedData.personalInfo.location': { $regex: location, $options: 'i' } },
      { 'parsedData.experience.location': { $regex: location, $options: 'i' } },
    ];
  }

  let sortOption = '-createdAt';
  if (sort === 'experience') sortOption = '-parsedData.totalYearsOfExperience';
  if (sort === 'relevance' && q) sortOption = { score: { $meta: 'textScore' } };

  return paginateQuery(Resume, filter, searchParams, {
    populate: 'user',
    sort: sortOption,
  });
}

// ── Merge & Rank Helpers ────────────────────────────────

/**
 * Merge keyword and semantic results, deduplicate by _id, and rank by combined score.
 * Keyword score is normalized from textScore; semantic score comes from $vectorSearch.
 * @param {Array} keywordDocs
 * @param {Array} semanticDocs
 * @param {string} type - 'jobs' or 'resumes'
 * @returns {Array} Merged and sorted documents
 */
function _mergeAndRankResults(keywordDocs, semanticDocs, type) {
  const docMap = new Map();

  // Weight: keyword match = 0.4, semantic match = 0.6
  const KEYWORD_WEIGHT = 0.4;
  const SEMANTIC_WEIGHT = 0.6;

  // Add keyword docs with normalized score
  for (const doc of keywordDocs) {
    const id = (doc._id || doc.id).toString();
    docMap.set(id, {
      ...doc,
      _keywordScore: 1.0, // Present in keyword results
      _semanticScore: 0,
      _combinedScore: KEYWORD_WEIGHT,
    });
  }

  // Add/merge semantic docs
  for (const doc of semanticDocs) {
    const id = (doc._id || doc.id).toString();
    const semanticScore = doc.semanticScore || 0;

    if (docMap.has(id)) {
      // Doc found in BOTH sets — boost it
      const existing = docMap.get(id);
      existing._semanticScore = semanticScore;
      existing._combinedScore = (KEYWORD_WEIGHT * existing._keywordScore) + (SEMANTIC_WEIGHT * semanticScore);
      existing.semanticScore = semanticScore;
    } else {
      docMap.set(id, {
        ...doc,
        _keywordScore: 0,
        _semanticScore: semanticScore,
        _combinedScore: SEMANTIC_WEIGHT * semanticScore,
      });
    }
  }

  // Sort by combined score descending
  const merged = Array.from(docMap.values()).sort((a, b) => b._combinedScore - a._combinedScore);

  // Clean up internal scoring fields, keep semanticScore for the API response
  return merged.map((doc) => {
    const { _keywordScore, _semanticScore, _combinedScore, ...rest } = doc;
    return { ...rest, relevanceScore: parseFloat(_combinedScore.toFixed(4)) };
  });
}

// ── Saved Search CRUD ───────────────────────────────────

/**
 * Save user search criteria and set up email/SMS alerts.
 * @param {string} userId
 * @param {object} saveData
 * @returns {Promise<object>}
 */
async function saveSearch(userId, saveData) {
  const savedSearch = await SavedSearch.create({
    user: userId,
    name: saveData.name,
    searchType: saveData.searchType || 'jobs',
    filters: saveData.filters,
    emailAlert: saveData.emailAlert !== undefined ? saveData.emailAlert : true,
    smsAlert: !!saveData.smsAlert,
    frequency: saveData.frequency || 'daily',
  });

  return savedSearch.toJSON();
}

/**
 * List saved searches for user.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function getSavedSearches(userId) {
  return SavedSearch.find({ user: userId }).sort({ createdAt: -1 });
}

/**
 * Delete a saved search.
 * @param {string} searchId
 * @param {string} userId
 */
async function deleteSavedSearch(searchId, userId) {
  const item = await SavedSearch.findOneAndDelete({ _id: searchId, user: userId });
  if (!item) {
    throw ApiError.notFound('Saved search not found');
  }
}

module.exports = {
  searchJobs,
  searchResumes,
  saveSearch,
  getSavedSearches,
  deleteSavedSearch,
};
