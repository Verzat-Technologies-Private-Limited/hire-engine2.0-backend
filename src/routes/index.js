const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const resumeRoutes = require('./resume.routes');
const jobRoutes = require('./job.routes');
const applicationRoutes = require('./application.routes');
const searchRoutes = require('./search.routes');
const companyRoutes = require('./company.routes');
const subscriptionRoutes = require('./subscription.routes');
const pipelineRoutes = require('./pipeline.routes');
const notificationRoutes = require('./notification.routes');
const analyticsRoutes = require('./analytics.routes');
const adminRoutes = require('./admin.routes');
const { getAllCountryPlugins } = require('../plugins/countries');

const router = express.Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Supported Countries Plugin Info endpoint
router.get('/countries', (_req, res) => {
  res.status(200).json({
    success: true,
    data: getAllCountryPlugins(),
  });
});

// Mount modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/resumes', resumeRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/search', searchRoutes);
router.use('/companies', companyRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/pipelines', pipelineRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
