import { Router } from 'express';
import { generateText, streamText } from '../controllers/llmController';
import { validateBody, llmChatSchema } from '../middleware/validation';

const router = Router();

router.post('/generate', validateBody(llmChatSchema), generateText);
router.post('/stream', validateBody(llmChatSchema), streamText);

export default router;
