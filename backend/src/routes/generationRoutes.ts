import { Router } from 'express';
import { createGeneration, getGenerations, updateGeneration, deleteGeneration, getFavoritedGenerations } from '../controllers/generationController';

const router = Router({ mergeParams: true });

router.post('/', createGeneration);
router.get('/', getGenerations);
router.get('/favorites', getFavoritedGenerations);
router.patch('/:generationId', updateGeneration);
router.delete('/:generationId', deleteGeneration);

export default router;
