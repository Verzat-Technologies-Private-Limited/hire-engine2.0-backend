const Joi = require('joi');

const applyJobSchema = {
  body: Joi.object({
    resumeId: Joi.string().hex().length(24).required(),
    coverLetter: Joi.string().max(5000).allow(''),
    screeningAnswers: Joi.array().items(
      Joi.object({
        questionIndex: Joi.number().integer().min(0).required(),
        question: Joi.string().required(),
        answer: Joi.string().required(),
      })
    ),
    isEasyApply: Joi.boolean().default(false),
  }),
  params: Joi.object({
    jobId: Joi.string().hex().length(24).required(),
  }),
};

const updateApplicationStatusSchema = {
  body: Joi.object({
    status: Joi.string()
      .valid('viewed', 'screening', 'interview', 'offer', 'hired', 'rejected')
      .required(),
    pipelineStage: Joi.string().max(50).allow(''),
    note: Joi.string().max(500).allow(''),
  }),
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

const addNoteSchema = {
  body: Joi.object({
    content: Joi.string().min(1).max(2000).required(),
    rating: Joi.number().integer().min(1).max(5).allow(null),
    isPrivate: Joi.boolean().default(false),
  }),
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

const rateApplicationSchema = {
  body: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
  }),
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

const bulkEmailSchema = {
  body: Joi.object({
    applicationIds: Joi.array().items(Joi.string().hex().length(24)).min(1).max(500).required(),
    templateId: Joi.string().hex().length(24),
    subject: Joi.string().max(200).when('templateId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    body: Joi.string().max(10000).when('templateId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
  }),
};

const noteParamsSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
    noteId: Joi.string().hex().length(24).required(),
  }),
};

const updateNoteSchema = {
  body: Joi.object({
    content: Joi.string().min(1).max(2000),
    rating: Joi.number().integer().min(1).max(5).allow(null),
    isPrivate: Joi.boolean(),
  }).min(1), // at least one field required
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
    noteId: Joi.string().hex().length(24).required(),
  }),
};

module.exports = {
  applyJobSchema,
  updateApplicationStatusSchema,
  addNoteSchema,
  updateNoteSchema,
  noteParamsSchema,
  rateApplicationSchema,
  bulkEmailSchema,
};
