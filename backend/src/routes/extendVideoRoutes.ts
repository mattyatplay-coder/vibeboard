/**
 * Video Extension Routes
 *
 * Endpoints for AI-powered video extension and analysis.
 *
 * P0 SECURITY: All video extension routes require authentication
 * Video generation and LLM analysis are EXPENSIVE ($$$)
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  analyzeVideo,
  recommendModel,
  enhancePrompt,
  generateExtension,
} from '../controllers/extendVideoController';
import { withAuth, requireGenerationQuota } from '../middleware/auth';

const router = Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// =============================================================================
// P0 SECURITY: All video extension routes require authentication
// =============================================================================

// Analyze video for extension - uses LLM ($)
router.post('/analyze', withAuth, requireGenerationQuota, upload.single('video'), analyzeVideo);

// Recommend model - uses LLM for analysis ($)
router.post('/recommend-model', withAuth, requireGenerationQuota, recommendModel);

// Enhance prompt - uses LLM ($)
router.post('/enhance-prompt', withAuth, requireGenerationQuota, enhancePrompt);

// Generate video extension - VERY EXPENSIVE (GPU + AI $$$)
router.post('/generate', withAuth, requireGenerationQuota, generateExtension);

export default router;
