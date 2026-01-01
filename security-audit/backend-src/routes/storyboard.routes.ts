import { Router } from 'express';
import projectRoutes from './projectRoutes';
import elementRoutes from './elementRoutes';
import generationRoutes from './generationRoutes';
import sceneRoutes from './sceneRoutes';
import shotRoutes from './sceneRoutes'; // Assuming shots are handled in sceneRoutes or similar, or checking for shotRoutes options
import loraRoutes from './loraRoutes';
import sessionRoutes from './sessionRoutes';
import providerRoutes from './providerRoutes';
import promptRoutes from './promptRoutes';
import sceneChainRoutes from './sceneChainRoutes';
// import templateRoutes from './templateRoutes';
import workflowRoutes from './workflowRoutes';
import backupRoutes from './backupRoutes';
import globalLoraRoutes from './globalLoraRoutes';
import extendVideoRoutes from './extendVideoRoutes';
import llmRoutes from './llmRoutes';

const router = Router();

router.use('/projects', projectRoutes);
router.use('/elements', elementRoutes);
router.use('/generations', generationRoutes);
router.use('/scenes', sceneRoutes);
router.use('/loras', loraRoutes);
router.use('/sessions', sessionRoutes);
router.use('/providers', providerRoutes);
router.use('/prompts', promptRoutes);
router.use('/scene-chains', sceneChainRoutes);
// router.use('/templates', templateRoutes);
router.use('/workflows', workflowRoutes);
router.use('/backups', backupRoutes);
router.use('/global-loras', globalLoraRoutes);
router.use('/extend-video', extendVideoRoutes);
router.use('/llm', llmRoutes);

export default router;
