const express = require('express');
const resumeController = require('../controllers/resume.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { uploadResume } = require('../middlewares/upload.middleware');
const { uploadLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

router.use(authenticate);

// Standard resume CRUD & upload
router.post('/upload', uploadLimiter, uploadResume, resumeController.upload);
router.get('/', resumeController.listResumes);
router.get('/:id', resumeController.getResume);
router.patch('/:id', resumeController.updateResume);
router.delete('/:id', resumeController.deleteResume);

// Google Gemini AI Features
router.post('/:id/reparse', resumeController.reparse);
router.get('/:id/analysis', resumeController.analyze);
router.get('/:id/match/:jobId', resumeController.matchJob);

module.exports = router;
