const Job = require('../models/Job');
const Resume = require('../models/Resume');
const SavedSearch = require('../models/SavedSearch');
const ApiError = require('../utils/ApiError');
const { paginateQuery } = require('../utils/pagination');

/**
 * Advanced Job Search with keyword matching, filters (salary, location, radius, date, employment type), and sorting.
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
    const radiusInMeters = Number(radius) * 1609.34; // miles to meters
    filter['location.coordinates'] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [Number(lng), Number(lat)],
        },
        $maxDistance: radiusInMeters,
      },
    };
  } else if (location) {
    filter.$or = [
      { 'location.city': { $regex: location, $options: 'i' } },
      { 'location.state': { $regex: location, $options: 'i' } },
      { 'location.country': { $regex: location, $options: 'i' } },
    ];
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
 * Talent Sourcing / Resume Database Search with Boolean operators (AND/OR/NOT) and filters.
 * @param {object} searchParams
 * @returns {Promise<object>}
 */
async function searchResumes(searchParams) {
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

  let sortOption = '-createdAt';
  if (sort === 'experience') sortOption = '-parsedData.totalYearsOfExperience';
  if (sort === 'relevance' && q) sortOption = { score: { $meta: 'textScore' } };

  return paginateQuery(Resume, filter, searchParams, {
    populate: 'user',
    sort: sortOption,
  });
}

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
