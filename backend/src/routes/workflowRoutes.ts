import express from 'express';
import { upload } from '../middleware/upload';
import {
    uploadWorkflow,
    getWorkflows,
    deleteWorkflow
} from '../controllers/workflowController';

const router = express.Router({ mergeParams: true });

// Routes
router.post('/', upload.single('file'), uploadWorkflow);
router.get('/', getWorkflows);
router.delete('/:workflowId', deleteWorkflow);

export default router;
