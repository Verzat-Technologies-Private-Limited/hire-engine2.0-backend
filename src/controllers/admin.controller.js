const adminService = require('../services/admin.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getAllUsers = asyncHandler(async (req, res) => {
  const result = await adminService.getAllUsers(req.query);
  ApiResponse.ok('All users retrieved', result.docs, result.meta).send(res);
});

const getPendingEmployers = asyncHandler(async (req, res) => {
  const result = await adminService.getPendingEmployers(req.query);
  ApiResponse.ok('Pending employer verification list', result.docs, result.meta).send(res);
});

const getEmployerById = asyncHandler(async (req, res) => {
  const result = await adminService.getEmployerById(req.params.id);
  ApiResponse.ok('Employer company details retrieved successfully', result).send(res);
});

const verifyEmployer = asyncHandler(async (req, res) => {
  const company = await adminService.verifyEmployer(req.params.id, req.user._id, req.body, req);
  ApiResponse.ok('Employer verification decision recorded', company).send(res);
});

const suspendUser = asyncHandler(async (req, res) => {
  const user = await adminService.suspendUser(req.params.id, req.user._id, req.body, req);
  ApiResponse.ok('User status updated successfully', user).send(res);
});

const getFlags = asyncHandler(async (req, res) => {
  const result = await adminService.getFlags(req.query);
  ApiResponse.ok('Flagged content list retrieved', result.docs, result.meta).send(res);
});

const resolveFlag = asyncHandler(async (req, res) => {
  const flag = await adminService.resolveFlag(req.params.id, req.user._id, req.body, req);
  ApiResponse.ok('Flag resolved successfully', flag).send(res);
});

const getTaxonomy = asyncHandler(async (req, res) => {
  const taxonomy = await adminService.getTaxonomy(req.query);
  ApiResponse.ok('Taxonomy entries retrieved', taxonomy).send(res);
});

const createTaxonomyEntry = asyncHandler(async (req, res) => {
  const entry = await adminService.createTaxonomyEntry(req.user._id, req.body, req);
  ApiResponse.created('Taxonomy entry created', entry).send(res);
});

const updateTaxonomyEntry = asyncHandler(async (req, res) => {
  const entry = await adminService.updateTaxonomyEntry(req.params.id, req.user._id, req.body, req);
  ApiResponse.ok('Taxonomy entry updated', entry).send(res);
});

const getSystemConfigs = asyncHandler(async (req, res) => {
  const configs = await adminService.getSystemConfigs();
  ApiResponse.ok('System configurations retrieved', configs).send(res);
});

const updateSystemConfig = asyncHandler(async (req, res) => {
  const config = await adminService.updateSystemConfig(req.user._id, req.body, req);
  ApiResponse.ok('System configuration updated', config).send(res);
});

const getExecutiveReport = asyncHandler(async (req, res) => {
  const report = await adminService.getExecutiveReport(req.query);
  ApiResponse.ok('Executive report metrics generated', report).send(res);
});

const processRefund = asyncHandler(async (req, res) => {
  const transaction = await adminService.processRefund(req.params.id, req.user._id, req.body, req);
  ApiResponse.ok('Refund processed successfully', transaction).send(res);
});

const getAuditLogs = asyncHandler(async (req, res) => {
  const result = await adminService.getAuditLogs(req.query);
  ApiResponse.ok('Audit logs retrieved', result.docs, result.meta).send(res);
});

const getPlans = asyncHandler(async (req, res) => {
  const plans = await adminService.getPlans(req.query);
  ApiResponse.ok('Subscription plans retrieved', plans).send(res);
});

const createPlan = asyncHandler(async (req, res) => {
  const plan = await adminService.createPlan(req.user._id, req.body, req);
  ApiResponse.created('Subscription plan created', plan).send(res);
});

const updatePlan = asyncHandler(async (req, res) => {
  const plan = await adminService.updatePlan(req.params.id, req.user._id, req.body, req);
  ApiResponse.ok('Subscription plan updated', plan).send(res);
});

const deletePlan = asyncHandler(async (req, res) => {
  const result = await adminService.deletePlan(req.params.id, req.user._id, req);
  ApiResponse.ok(result.message).send(res);
});

// ── Gap 1: Global Job Moderation & Inspection ─────────────

const getAllJobs = asyncHandler(async (req, res) => {
  const result = await adminService.getAllJobs(req.query);
  ApiResponse.ok('All platform jobs retrieved', result.docs, result.meta).send(res);
});

const getJobById = asyncHandler(async (req, res) => {
  const result = await adminService.getJobById(req.params.id);
  ApiResponse.ok('Job details for admin inspection retrieved', result).send(res);
});

// ── Gap 2: Admin Force Actions on Jobs ─────────────────────

const updateJobStatus = asyncHandler(async (req, res) => {
  const result = await adminService.updateJobStatus(req.params.id, req.user._id, req.body, req);
  ApiResponse.ok('Job status updated by administration', result).send(res);
});

// ── Gap 3: Bulk Job Operations ─────────────────────────────

const bulkJobAction = asyncHandler(async (req, res) => {
  const result = await adminService.bulkJobAction(req.user._id, req.body, req);
  ApiResponse.ok('Bulk job action executed successfully', result).send(res);
});

// ── Gap 4: Full Employer Directory ─────────────────────────

const getAllEmployers = asyncHandler(async (req, res) => {
  const result = await adminService.getAllEmployers(req.query);
  ApiResponse.ok('All platform employers retrieved', result.docs, result.meta).send(res);
});

const getEmployerJobs = asyncHandler(async (req, res) => {
  const result = await adminService.getEmployerJobs(req.params.id, req.query);
  ApiResponse.ok('Employer jobs retrieved', result.docs, result.meta).send(res);
});

// ── Gap 5: Financial Transactions List & Discovery ─────────

const getAllTransactions = asyncHandler(async (req, res) => {
  const result = await adminService.getAllTransactions(req.query);
  ApiResponse.ok('All financial transactions retrieved', result.docs, result.meta).send(res);
});

const getTransactionById = asyncHandler(async (req, res) => {
  const result = await adminService.getTransactionById(req.params.id);
  ApiResponse.ok('Transaction details retrieved', result).send(res);
});

module.exports = {
  getAllUsers,
  getPendingEmployers,
  getEmployerById,
  verifyEmployer,
  suspendUser,
  getFlags,
  resolveFlag,
  getTaxonomy,
  createTaxonomyEntry,
  updateTaxonomyEntry,
  getSystemConfigs,
  updateSystemConfig,
  getExecutiveReport,
  processRefund,
  getAuditLogs,
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getAllJobs,
  getJobById,
  updateJobStatus,
  bulkJobAction,
  getAllEmployers,
  getEmployerJobs,
  getAllTransactions,
  getTransactionById,
};
