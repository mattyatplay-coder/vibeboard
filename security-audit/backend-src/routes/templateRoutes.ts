import { Router } from 'express';
import { templateController } from '../controllers/templateController';

const router = Router();

router.post('/', templateController.createTemplate);
router.get('/', templateController.getTemplates);
router.delete('/:id', templateController.deleteTemplate);

export default router;
