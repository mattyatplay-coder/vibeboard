import { Router } from 'express';
import { trainingController } from '../controllers/trainingController';
import multer from 'multer';
import path from 'path';
import { withAuth, requireGenerationQuota } from '../middleware/auth';

const router = Router();

// Configure multer for image uploads
const upload = multer({
  dest: path.resolve(__dirname, '../../uploads/temp'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit per file
});

// =============================================================================
// P0 SECURITY: All training routes require authentication
// Training is VERY EXPENSIVE ($5-20 per training job)
// =============================================================================

// Create training job
router.post('/jobs', withAuth, trainingController.createJob);

// 0. Pose Presets for Character Foundry (read-only can be unauthenticated)
router.get('/pose-presets', trainingController.getPosePresets);
router.post('/pose-presets', withAuth, trainingController.createCustomPreset);
router.get('/pose-presets/:id', trainingController.getCustomPreset);
router.put('/pose-presets/:id', withAuth, trainingController.updateCustomPreset);
router.delete('/pose-presets/:id', withAuth, trainingController.deleteCustomPreset);

// 1. Curation (Uploads) - Requires auth
router.post(
  '/jobs/:id/curate',
  withAuth,
  (req, res, next) => {
    console.log(`[${new Date().toISOString()}] Curate request for ID: ${req.params.id}`);
    next();
  },
  upload.fields([
    { name: 'images', maxCount: 200 },
    { name: 'reference_images', maxCount: 10 },
  ]),
  trainingController.curateJob
);

// 1.5. Generate Synthetic Dataset (Foundry) - EXPENSIVE (uses Flux 2 Max)
router.post(
  '/jobs/:id/generate-dataset',
  withAuth,
  requireGenerationQuota,
  upload.single('source_image'),
  trainingController.generateDataset
);
router.get('/jobs/:id/dataset', withAuth, trainingController.getJobDataset);
router.delete('/jobs/:id/dataset/:filename', withAuth, trainingController.deleteDatasetImage);

// 2. Training (JSON) - MOST EXPENSIVE ($5-20 per run)
router.post('/jobs/:id/start', withAuth, requireGenerationQuota, trainingController.startJob);
router.get('/jobs', withAuth, trainingController.getJobs);
router.delete('/jobs/:id', withAuth, trainingController.deleteJob);

export default router;
