import { Router } from 'express';
import {
    createScene,
    getScenes,
    addShotToScene,
    removeShotFromScene,
    updateScene,
    deleteScene,
    getSceneReferences,
    addSceneReferences,
    removeSceneReferences
} from '../controllers/sceneController';

const router = Router({ mergeParams: true });

router.post('/', createScene);
router.get('/', getScenes);
router.post('/:sceneId/shots', addShotToScene);
router.delete('/:sceneId/shots/:shotId', removeShotFromScene);
router.patch('/:sceneId', updateScene);
router.delete('/:sceneId', deleteScene);

// Scene reference management
router.get('/:sceneId/references', getSceneReferences);
router.post('/:sceneId/references', addSceneReferences);
router.delete('/:sceneId/references', removeSceneReferences);

export default router;
