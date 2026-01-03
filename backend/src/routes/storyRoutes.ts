/**
 * Story Routes
 *
 * CRUD routes for Story drafts from the Story Editor.
 */

import { Router } from 'express';
import {
  getStories,
  getStory,
  createStory,
  updateStory,
  deleteStory,
} from '../controllers/storyController';

const router = Router({ mergeParams: true });

// GET /api/projects/:projectId/stories - List all stories for a project
router.get('/', getStories);

// GET /api/projects/:projectId/stories/:storyId - Get a specific story
router.get('/:storyId', getStory);

// POST /api/projects/:projectId/stories - Create a new story
router.post('/', createStory);

// PATCH /api/projects/:projectId/stories/:storyId - Update a story
router.patch('/:storyId', updateStory);

// DELETE /api/projects/:projectId/stories/:storyId - Delete a story
router.delete('/:storyId', deleteStory);

export default router;
