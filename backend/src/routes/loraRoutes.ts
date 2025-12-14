import { Router } from 'express';
import { getLoRAs, createLoRA, updateLoRA, deleteLoRA, fetchLoRAMetadata } from '../controllers/loraController';

const router = Router({ mergeParams: true });

router.get('/', getLoRAs);
router.post('/', createLoRA);
router.post('/metadata', fetchLoRAMetadata);
router.put('/:loraId', updateLoRA);
router.delete('/:loraId', deleteLoRA);

export default router;
