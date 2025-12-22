import { Router } from 'express';
import {
  getLoRAs,
  createLoRA,
  updateLoRA,
  deleteLoRA,
  fetchLoRAMetadata,
  fetchCivitaiLoRAMetadata,
  syncModelMetadata,
} from '../controllers/loraController';

const router = Router({ mergeParams: true });

router.get('/', getLoRAs);
router.post('/', createLoRA);
router.post('/metadata', fetchLoRAMetadata);
router.post('/civitai-metadata', fetchCivitaiLoRAMetadata);
router.post('/sync-model', syncModelMetadata);
router.put('/:loraId', updateLoRA);
router.delete('/:loraId', deleteLoRA);

export default router;
