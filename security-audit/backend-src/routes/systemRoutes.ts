import { Router } from 'express';
import { systemController } from '../controllers/systemController';

const router = Router();

router.post('/open-folder', systemController.openFolder);

export default router;
