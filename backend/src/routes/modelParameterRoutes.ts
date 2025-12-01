import { Router } from 'express';
import { getParameters, createParameter, deleteParameter } from '../controllers/modelParameterController';

const router = Router({ mergeParams: true });

router.get('/', getParameters);
router.post('/', createParameter);
router.delete('/:parameterId', deleteParameter);

export default router;
