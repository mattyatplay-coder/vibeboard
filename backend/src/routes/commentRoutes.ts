/**
 * Comment Routes - Collaborative Dailies
 *
 * REST endpoints for comment/annotation management.
 */

import { Router } from 'express';
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  toggleResolved,
  getCommentStats,
  getProjectComments,
  getVersionStack,
} from '../controllers/commentController';

const router = Router();

// ============================================================================
// Generation-level comment endpoints
// ============================================================================

// Get all comments for a generation
router.get('/generations/:generationId/comments', getComments);

// Create a new comment on a generation
router.post('/generations/:generationId/comments', createComment);

// Get comment statistics for a generation
router.get('/generations/:generationId/comments/stats', getCommentStats);

// Get version stack (all versions of a shot)
router.get('/generations/:generationId/versions', getVersionStack);

// ============================================================================
// Individual comment endpoints
// ============================================================================

// Update a comment
router.patch('/comments/:commentId', updateComment);

// Delete a comment
router.delete('/comments/:commentId', deleteComment);

// Toggle resolved status
router.post('/comments/:commentId/toggle-resolved', toggleResolved);

// ============================================================================
// Project-level endpoints (for Dailies overview page)
// ============================================================================

// Get all comments across a project
router.get('/projects/:projectId/comments', getProjectComments);

export default router;
