/**
 * Team Routes - Phase 7: Team Collaboration
 *
 * API endpoints for multi-tenant team management.
 * Team is the core tenant unit - Projects, Elements, LoRAs belong to Teams.
 */

import { Router } from 'express';
import { withAuth } from '../middleware/auth';
import {
  createTeam,
  getMyTeams,
  getTeam,
  getTeamBySlug,
  updateTeam,
  deleteTeam,
  addMember,
  updateMemberRole,
  removeMember,
  leaveTeam,
  getTeamQuota,
} from '../controllers/teamController';

const router = Router();

// =============================================================================
// TEAM CRUD (All routes require authentication)
// =============================================================================

/**
 * Create a new team
 * POST /api/teams
 * Body: { name: string, slug?: string }
 */
router.post('/', withAuth, createTeam);

/**
 * Get current user's teams
 * GET /api/teams
 */
router.get('/', withAuth, getMyTeams);

/**
 * Get team by ID
 * GET /api/teams/:teamId
 */
router.get('/:teamId', withAuth, getTeam);

/**
 * Get team by slug
 * GET /api/teams/slug/:slug
 */
router.get('/slug/:slug', withAuth, getTeamBySlug);

/**
 * Update team
 * PATCH /api/teams/:teamId
 * Body: { name?: string }
 */
router.patch('/:teamId', withAuth, updateTeam);

/**
 * Delete team (owner only)
 * DELETE /api/teams/:teamId
 */
router.delete('/:teamId', withAuth, deleteTeam);

// =============================================================================
// MEMBER MANAGEMENT
// =============================================================================

/**
 * Add member to team
 * POST /api/teams/:teamId/members
 * Body: { userId: string, role?: 'owner' | 'admin' | 'member' | 'viewer' }
 */
router.post('/:teamId/members', withAuth, addMember);

/**
 * Update member role
 * PATCH /api/teams/:teamId/members/:memberId
 * Body: { role: 'owner' | 'admin' | 'member' | 'viewer' }
 */
router.patch('/:teamId/members/:memberId', withAuth, updateMemberRole);

/**
 * Remove member from team
 * DELETE /api/teams/:teamId/members/:memberId
 */
router.delete('/:teamId/members/:memberId', withAuth, removeMember);

/**
 * Leave team (self-removal)
 * POST /api/teams/:teamId/leave
 */
router.post('/:teamId/leave', withAuth, leaveTeam);

// =============================================================================
// QUOTA MANAGEMENT
// =============================================================================

/**
 * Get team quota status
 * GET /api/teams/:teamId/quota
 */
router.get('/:teamId/quota', withAuth, getTeamQuota);

export default router;
