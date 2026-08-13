const express = require('express');
const pipelineController = require('../controllers/pipeline.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(authenticate, authorize('employer', 'admin'));

router.post('/', pipelineController.createPipeline);
router.get('/', pipelineController.getPipelines);
router.patch('/:id', pipelineController.updatePipeline);
router.delete('/:id', pipelineController.deletePipeline);

module.exports = router;
