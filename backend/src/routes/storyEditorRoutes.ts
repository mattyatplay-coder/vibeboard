/**
 * Story Editor Routes
 *
 * Endpoints for the script-to-storyboard pipeline.
 */

import { Router } from 'express';
import {
  generateOutline,
  generateScript,
  parseScript,
  breakdownScene,
  generatePrompts,
  enhancePrompt,
  fullPipeline,
  fullPipelineStream,
} from '../controllers/storyEditorController';

const router = Router();

// Individual pipeline steps
router.post('/outline', generateOutline);
router.post('/script', generateScript);
router.post('/parse', parseScript);
router.post('/breakdown', breakdownScene);
router.post('/prompts', generatePrompts);
router.post('/enhance-prompt', enhancePrompt);

// Full pipeline (batch and streaming)
router.post('/full-pipeline', fullPipeline);
router.post('/full-pipeline/stream', fullPipelineStream);

export default router;
