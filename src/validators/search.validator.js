const Joi = require('joi');
const { AlertFrequency } = require('../utils/constants');

const jobSearchSchema = {
  query: Joi.object({
    q: Joi.string().max(200).allow(''),             // Keywords
    title: Joi.string().max(100).allow(''),
    company: Joi.string().max(100).allow(''),
    location: Joi.string().max(100).allow(''),
    radius: Joi.number().min(1).max(500),            // miles or kilometers
    unit: Joi.string().valid('mi', 'miles', 'km', 'kilometers').default('mi'),
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    salaryMin: Joi.number().min(0),
    salaryMax: Joi.number().min(0),
    employmentType: Joi.string().allow(''),
    workplaceType: Joi.string().allow(''),
    experienceLevel: Joi.string().allow(''),
    datePosted: Joi.string().valid('today', '3days', '7days', '14days', '30days', '').allow(''),
    skills: Joi.string().allow(''),                  // comma-separated
    sort: Joi.string().valid('relevance', 'date', 'salary_asc', 'salary_desc').default('relevance'),
    mode: Joi.string().valid('keyword', 'semantic', 'hybrid').default('hybrid'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

const resumeSearchSchema = {
  query: Joi.object({
    q: Joi.string().max(500).allow(''),                   // Boolean query string
    skills: Joi.string().allow(''),
    location: Joi.string().max(100).allow(''),
    experienceMin: Joi.number().min(0),
    experienceMax: Joi.number().min(0),
    education: Joi.string().valid('high_school', 'associate', 'bachelor', 'master', 'doctorate', 'any', ''),
    sort: Joi.string().valid('relevance', 'experience', 'date').default('relevance'),
    mode: Joi.string().valid('keyword', 'semantic', 'hybrid').default('hybrid'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

const saveSearchSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    searchType: Joi.string().valid('jobs', 'resumes').default('jobs'),
    filters: Joi.object().required(),
    emailAlert: Joi.boolean().default(true),
    smsAlert: Joi.boolean().default(false),
    frequency: Joi.string()
      .valid(...Object.values(AlertFrequency))
      .default(AlertFrequency.DAILY),
  }),
};

module.exports = {
  jobSearchSchema,
  resumeSearchSchema,
  saveSearchSchema,
};
