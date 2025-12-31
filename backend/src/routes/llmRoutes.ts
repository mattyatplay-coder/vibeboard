import { Router } from 'express';
import { generateText, streamText } from '../controllers/llmController';
import { validateBody, llmChatSchema } from '../middleware/validation';
import { withAuth } from '../middleware/auth';

const router = Router();

// =============================================================================
// P0 SECURITY: All LLM routes require authentication
// LLM API calls cost $0.01-$0.10+ per request
// =============================================================================

router.post('/generate', withAuth, validateBody(llmChatSchema), generateText);
router.post('/stream', withAuth, validateBody(llmChatSchema), streamText);

export default router;
