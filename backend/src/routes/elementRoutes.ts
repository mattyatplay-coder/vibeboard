import { Router } from 'express';
import {
  uploadElement,
  getElements,
  updateElement,
  deleteElement,
  createElementFromGeneration,
} from '../controllers/elementController';
import { upload } from '../middleware/upload';

const router = Router({ mergeParams: true }); // Enable access to projectId from parent router

router.post('/', upload.single('file'), uploadElement);
router.post('/from-generation', createElementFromGeneration);
router.get('/', getElements);
router.patch('/:elementId', upload.single('file'), updateElement);
router.delete('/:elementId', deleteElement);

export default router;
