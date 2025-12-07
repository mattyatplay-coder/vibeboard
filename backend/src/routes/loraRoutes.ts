import { Router } from 'express';
import { getLoRAs, createLoRA, updateLoRA, deleteLoRA } from '../controllers/loraController';

const router = Router({ mergeParams: true });

router.get('/', getLoRAs);
router.post('/', createLoRA);
router.put('/:loraId', updateLoRA);
router.delete('/:loraId', deleteLoRA);

export default router;
