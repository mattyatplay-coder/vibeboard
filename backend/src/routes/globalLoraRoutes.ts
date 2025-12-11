import { Router } from 'express';
import {
    getGlobalLibrary,
    addToGlobalLibrary,
    installToProject,
    deleteFromGlobalLibrary,
    getProjectInstallations
} from '../controllers/globalLoraController';

const router = Router();

// Global library endpoints (not project-specific)
router.get('/', getGlobalLibrary);
router.post('/', addToGlobalLibrary);
router.delete('/:globalLoRAId', deleteFromGlobalLibrary);
router.post('/:globalLoRAId/install', installToProject);

// Project-specific: get installation status
router.get('/project/:projectId', getProjectInstallations);

export default router;
