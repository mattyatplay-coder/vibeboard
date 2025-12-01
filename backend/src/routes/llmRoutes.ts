import { Router } from 'express';
import { generateText, streamText } from '../controllers/llmController';

const router = Router();

router.post('/generate', generateText);
router.post('/stream', streamText);

export default router;
