const express = require('express');
const resumeController = require('../controllers/resume.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { uploadResume } = require('../middlewares/upload.middleware');
const { uploadLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

router.use(authenticate);

router.post('/upload', uploadLimiter, uploadResume, resumeController.upload);
router.get('/', resumeController.listResumes);
router.get('/:id', resumeController.getResume);
router.patch('/:id', resumeController.updateResume);
router.delete('/:id', resumeController.deleteResume);

module.exports = router;
