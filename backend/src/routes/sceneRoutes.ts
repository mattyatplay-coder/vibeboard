import { Router } from 'express';
import { createScene, getScenes, addShotToScene, removeShotFromScene, updateScene, deleteScene } from '../controllers/sceneController';

const router = Router({ mergeParams: true });

router.post('/', createScene);
router.get('/', getScenes);
router.post('/:sceneId/shots', addShotToScene);
router.delete('/:sceneId/shots/:shotId', removeShotFromScene);
router.patch('/:sceneId', updateScene);
router.delete('/:sceneId', deleteScene);

export default router;
