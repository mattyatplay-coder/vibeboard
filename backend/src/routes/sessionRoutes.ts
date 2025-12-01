import { Router } from 'express';
import { getSessions, createSession, updateSession, deleteSession } from '../controllers/sessionController';

const router = Router({ mergeParams: true });

router.get('/', getSessions);
router.post('/', createSession);
router.patch('/:id', updateSession);
router.delete('/:id', deleteSession);

export default router;
