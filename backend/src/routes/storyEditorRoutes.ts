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
  autoBreakdownAssets,
  getStoryStatus,
  getStoryJob,
} from '../controllers/storyEditorController';

const router = Router({ mergeParams: true }); // Enable access to parent route params

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

// Script Lab: Auto-breakdown assets from script
router.post('/auto-breakdown', autoBreakdownAssets);

// P-02: Story job status for progress persistence
// These routes are also mounted at /api/projects/:projectId/story in index.ts
router.get('/status', getStoryStatus);
router.get('/jobs/:jobId', getStoryJob);

export default router;
