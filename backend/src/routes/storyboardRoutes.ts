import { Router } from 'express';
import {
    getStoryboard,
    getStoryboardStats,
    duplicateStoryboard,
    exportStoryboard,
    clearStoryboard
} from '../controllers/storyboardController';

const router = Router({ mergeParams: true });

// Get complete storyboard for a project
router.get('/', getStoryboard);

// Get storyboard statistics
router.get('/stats', getStoryboardStats);

// Export storyboard
router.get('/export', exportStoryboard);

// Duplicate storyboard
router.post('/duplicate', duplicateStoryboard);

// Clear storyboard
router.delete('/clear', clearStoryboard);

export default router;
