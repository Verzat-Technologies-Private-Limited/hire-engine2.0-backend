const Joi = require('joi');
const {
  EmploymentType,
  WorkplaceType,
  JobStatus,
  ScreeningQuestionType,
} = require('../utils/constants');

const createJobSchema = {
  body: Joi.object({
    companyId: Joi.string().required(),
    title: Joi.string().trim().min(3).max(200).required(),
    description: Joi.string().min(50).max(10000).required(),
    responsibilities: Joi.string().max(5000).allow(''),
    qualifications: Joi.string().max(5000).allow(''),
    skills: Joi.array().items(Joi.string().trim()).min(1).max(30).required(),
    category: Joi.string().trim().allow(''),
    salaryRange: Joi.object({
      min: Joi.number().min(0),
      max: Joi.number().min(Joi.ref('min')),
      currency: Joi.string().uppercase().length(3),
      period: Joi.string().valid('hourly', 'monthly', 'annually').default('annually'),
      isVisible: Joi.boolean().default(true),
    }),
    employmentType: Joi.string()
      .valid(...Object.values(EmploymentType))
      .required(),
    workplaceType: Joi.string()
      .valid(...Object.values(WorkplaceType))
      .required(),
    location: Joi.object({
      address: Joi.string().allow(''),
      city: Joi.string().required(),
      state: Joi.string().allow(''),
      country: Joi.string().required(),
      postalCode: Joi.string().allow(''),
      coordinates: Joi.object({
        type: Joi.string().valid('Point'),
        coordinates: Joi.array().items(Joi.number()).length(2),
      }),
    }).required(),
    screeningQuestions: Joi.array()
      .items(
        Joi.object({
          question: Joi.string().max(500).required(),
          type: Joi.string()
            .valid(...Object.values(ScreeningQuestionType))
            .default(ScreeningQuestionType.YES_NO),
          required: Joi.boolean().default(false),
          options: Joi.array().items(Joi.string()).when('type', {
            is: ScreeningQuestionType.MULTIPLE_CHOICE,
            then: Joi.required(),
          }),
          idealAnswer: Joi.string().allow(''),
        })
      )
      .max(10),
    experienceLevel: Joi.string().valid('entry', 'mid', 'senior', 'lead', 'executive', ''),
    experienceYears: Joi.object({
      min: Joi.number().min(0),
      max: Joi.number().min(Joi.ref('min')),
    }),
    education: Joi.string().valid(
      'high_school',
      'associate',
      'bachelor',
      'master',
      'doctorate',
      'any',
      ''
    ),
    benefits: Joi.array().items(Joi.string().trim()).max(20),
    applicationDeadline: Joi.date().greater('now').allow(null),
    publishNow: Joi.boolean().default(false),
  }),
};

const updateJobSchema = {
  body: Joi.object({
    title: Joi.string().trim().min(3).max(200),
    description: Joi.string().min(50).max(10000),
    responsibilities: Joi.string().max(5000).allow(''),
    qualifications: Joi.string().max(5000).allow(''),
    skills: Joi.array().items(Joi.string().trim()).min(1).max(30),
    category: Joi.string().trim().allow(''),
    salaryRange: Joi.object({
      min: Joi.number().min(0),
      max: Joi.number().min(Joi.ref('min')),
      currency: Joi.string().uppercase().length(3),
      period: Joi.string().valid('hourly', 'monthly', 'annually'),
      isVisible: Joi.boolean(),
    }),
    employmentType: Joi.string().valid(...Object.values(EmploymentType)),
    workplaceType: Joi.string().valid(...Object.values(WorkplaceType)),
    location: Joi.object({
      address: Joi.string().allow(''),
      city: Joi.string(),
      state: Joi.string().allow(''),
      country: Joi.string(),
      postalCode: Joi.string().allow(''),
      coordinates: Joi.object({
        type: Joi.string().valid('Point'),
        coordinates: Joi.array().items(Joi.number()).length(2),
      }),
    }),
    screeningQuestions: Joi.array()
      .items(
        Joi.object({
          question: Joi.string().max(500).required(),
          type: Joi.string().valid(...Object.values(ScreeningQuestionType)),
          required: Joi.boolean(),
          options: Joi.array().items(Joi.string()),
          idealAnswer: Joi.string().allow(''),
        })
      )
      .max(10),
    experienceLevel: Joi.string().valid('entry', 'mid', 'senior', 'lead', 'executive', ''),
    experienceYears: Joi.object({
      min: Joi.number().min(0),
      max: Joi.number(),
    }),
    education: Joi.string().valid(
      'high_school',
      'associate',
      'bachelor',
      'master',
      'doctorate',
      'any',
      ''
    ),
    benefits: Joi.array().items(Joi.string().trim()).max(20),
    applicationDeadline: Joi.date().allow(null),
  }).min(1),
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

const updateJobStatusSchema = {
  body: Joi.object({
    status: Joi.string().valid(JobStatus.ACTIVE, JobStatus.PAUSED, JobStatus.CLOSED).required(),
  }),
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

const promoteJobSchema = {
  body: Joi.object({
    dailyBudget: Joi.number().min(1).required(),
    totalBudget: Joi.number().min(Joi.ref('dailyBudget')).required(),
    durationDays: Joi.number().integer().min(1).max(90).required(),
  }),
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

module.exports = {
  createJobSchema,
  updateJobSchema,
  updateJobStatusSchema,
  promoteJobSchema,
};
