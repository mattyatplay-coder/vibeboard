/**
 * Team Controller - Phase 7: Team Collaboration
 *
 * API endpoints for team management, member operations, and quota tracking.
 */

import { Request, Response } from 'express';
import { teamService } from '../services/collaboration/TeamService';
import { AuthenticatedRequest } from '../middleware/auth';

// =============================================================================
// TEAM CRUD
// =============================================================================

/**
 * Create a new team
 * POST /api/teams
 */
export const createTeam = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { name, slug } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const team = await teamService.createTeam(userId, { name, slug });
    res.status(201).json(team);
  } catch (error: any) {
    console.error('Create team error:', error);
    res.status(400).json({ error: error.message || 'Failed to create team' });
  }
};

/**
 * Get current user's teams
 * GET /api/teams
 */
export const getMyTeams = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const teams = await teamService.getUserTeams(userId);
    res.json(teams);
  } catch (error: any) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
};

/**
 * Get team by ID
 * GET /api/teams/:teamId
 */
export const getTeam = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    const team = await teamService.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Verify user is a member
    if (userId) {
      const canView = await teamService.canViewTeam(teamId, userId);
      if (!canView) {
        return res.status(403).json({ error: 'You are not a member of this team' });
      }
    }

    res.json(team);
  } catch (error: any) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
};

/**
 * Get team by slug
 * GET /api/teams/slug/:slug
 */
export const getTeamBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    const team = await teamService.getTeamBySlug(slug);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Verify user is a member
    if (userId) {
      const canView = await teamService.canViewTeam(team.id, userId);
      if (!canView) {
        return res.status(403).json({ error: 'You are not a member of this team' });
      }
    }

    res.json(team);
  } catch (error: any) {
    console.error('Get team by slug error:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
};

/**
 * Update team
 * PATCH /api/teams/:teamId
 */
export const updateTeam = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { name } = req.body;
    const team = await teamService.updateTeam(teamId, userId, { name });
    res.json(team);
  } catch (error: any) {
    console.error('Update team error:', error);
    res.status(400).json({ error: error.message || 'Failed to update team' });
  }
};

/**
 * Delete team
 * DELETE /api/teams/:teamId
 */
export const deleteTeam = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await teamService.deleteTeam(teamId, userId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Delete team error:', error);
    res.status(400).json({ error: error.message || 'Failed to delete team' });
  }
};

// =============================================================================
// MEMBER MANAGEMENT
// =============================================================================

/**
 * Add member to team
 * POST /api/teams/:teamId/members
 */
export const addMember = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const authReq = req as AuthenticatedRequest;
    const adminId = authReq.user?.id;

    if (!adminId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { userId, role } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const member = await teamService.addMember(teamId, adminId, { userId, role });
    res.status(201).json(member);
  } catch (error: any) {
    console.error('Add member error:', error);
    res.status(400).json({ error: error.message || 'Failed to add member' });
  }
};

/**
 * Update member role
 * PATCH /api/teams/:teamId/members/:memberId
 */
export const updateMemberRole = async (req: Request, res: Response) => {
  try {
    const { teamId, memberId } = req.params;
    const authReq = req as AuthenticatedRequest;
    const adminId = authReq.user?.id;

    if (!adminId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ error: 'role is required' });
    }

    const member = await teamService.updateMemberRole(teamId, adminId, memberId, role);
    res.json(member);
  } catch (error: any) {
    console.error('Update member role error:', error);
    res.status(400).json({ error: error.message || 'Failed to update member role' });
  }
};

/**
 * Remove member from team
 * DELETE /api/teams/:teamId/members/:memberId
 */
export const removeMember = async (req: Request, res: Response) => {
  try {
    const { teamId, memberId } = req.params;
    const authReq = req as AuthenticatedRequest;
    const adminId = authReq.user?.id;

    if (!adminId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await teamService.removeMember(teamId, adminId, memberId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Remove member error:', error);
    res.status(400).json({ error: error.message || 'Failed to remove member' });
  }
};

/**
 * Leave team (self-removal)
 * POST /api/teams/:teamId/leave
 */
export const leaveTeam = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await teamService.leaveTeam(teamId, userId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Leave team error:', error);
    res.status(400).json({ error: error.message || 'Failed to leave team' });
  }
};

// =============================================================================
// QUOTA MANAGEMENT
// =============================================================================

/**
 * Get team quota status
 * GET /api/teams/:teamId/quota
 */
export const getTeamQuota = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (userId) {
      const canView = await teamService.canViewTeam(teamId, userId);
      if (!canView) {
        return res.status(403).json({ error: 'You are not a member of this team' });
      }
    }

    const team = await teamService.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({
      used: team.monthlyGenerations,
      limit: team.monthlyGenerationsLimit,
      remaining: Math.max(0, team.monthlyGenerationsLimit - team.monthlyGenerations),
      percentage: Math.round((team.monthlyGenerations / team.monthlyGenerationsLimit) * 100),
    });
  } catch (error: any) {
    console.error('Get team quota error:', error);
    res.status(500).json({ error: 'Failed to fetch team quota' });
  }
};
