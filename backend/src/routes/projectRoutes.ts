import { Router } from 'express';
import { createProject, getProjects, getProjectById, deleteProject } from '../controllers/projectController';
import sceneChainRoutes from './sceneChainRoutes';
import { validateBody, createProjectSchema } from '../middleware/validation';

const router = Router();

router.post('/', validateBody(createProjectSchema), createProject);
router.get('/', getProjects);
router.get('/:id', getProjectById);
router.delete('/:id', deleteProject);

// Nested routes for project-scoped resources
router.use('/:projectId/scene-chains', sceneChainRoutes);

export default router;
