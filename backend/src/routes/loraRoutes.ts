import { Router } from 'express';
import { getLoRAs, createLoRA, deleteLoRA } from '../controllers/loraController';

const router = Router({ mergeParams: true });

router.get('/', getLoRAs);
router.post('/', createLoRA);
router.delete('/:loraId', deleteLoRA);

export default router;
