import { Router } from 'express';
import { trainingController } from '../controllers/trainingController';
import multer from 'multer';
import path from 'path';

const router = Router();

// Configure multer for image uploads
const upload = multer({
    dest: path.resolve(__dirname, '../../uploads/temp'),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit per file
});

router.post('/jobs', trainingController.createJob);

// 0. Pose Presets for Character Foundry
router.get('/pose-presets', trainingController.getPosePresets);
router.post('/pose-presets', trainingController.createCustomPreset);
router.get('/pose-presets/:id', trainingController.getCustomPreset);
router.put('/pose-presets/:id', trainingController.updateCustomPreset);
router.delete('/pose-presets/:id', trainingController.deleteCustomPreset);

// 1. Curation (Uploads)
router.post('/jobs/:id/curate', (req, res, next) => {
    console.log(`[${new Date().toISOString()}] Curate request for ID: ${req.params.id}`);
    next();
}, upload.fields([
    { name: 'images', maxCount: 200 },
    { name: 'reference_images', maxCount: 10 }
]), trainingController.curateJob);

// 1.5. Generate Synthetic Dataset (Foundry)
router.post('/jobs/:id/generate-dataset', upload.single('source_image'), trainingController.generateDataset);
router.get('/jobs/:id/dataset', trainingController.getJobDataset);
router.delete('/jobs/:id/dataset/:filename', trainingController.deleteDatasetImage);

// 2. Training (JSON)
router.post('/jobs/:id/start', trainingController.startJob);
router.get('/jobs', trainingController.getJobs);
router.delete('/jobs/:id', trainingController.deleteJob);

export default router;
