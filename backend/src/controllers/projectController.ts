import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient({});

// =============================================================================
// PHASE 7: Multi-Tenant Helper - Get user's team memberships
// =============================================================================

/**
 * Get all team IDs a user is a member of
 * Used for multi-tenant query scoping
 */
async function getUserTeamIds(userId: string): Promise<string[]> {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });
  return memberships.map(m => m.teamId);
}

export const createProject = async (req: Request, res: Response) => {
  try {
    const { name, description, teamId } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // P0 SECURITY: Associate project with authenticated user
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    // Phase 7: If teamId provided, verify user is a member of that team
    if (teamId && userId) {
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId } },
      });
      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this team' });
      }
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        ...(userId ? { userId } : {}),
        ...(teamId ? { teamId } : {}),
      },
    });
    res.status(201).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

export const getProjects = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    // Phase 7: Multi-tenant query - show projects from user's teams OR owned by user
    let whereClause: any = {};

    if (userId) {
      const teamIds = await getUserTeamIds(userId);

      // Show projects that are:
      // 1. Owned directly by user (userId match)
      // 2. OR belong to any team the user is a member of
      whereClause = {
        OR: [{ userId }, ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : [])],
      };
    }
    // If no auth, show all (backward compatibility for dev mode)

    const projects = await prisma.project.findMany({
      where: whereClause.OR ? whereClause : undefined,
      orderBy: { updatedAt: 'desc' },
      include: {
        generations: {
          where: { status: 'succeeded' },
          orderBy: { createdAt: 'desc' },
          take: 4,
          select: { outputs: true },
        },
        team: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
    res.json(projects);
  } catch (error: any) {
    console.error('Failed to fetch projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects', details: error.message });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        elements: true,
        references: true,
        generations: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        scenes: true,
        team: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Phase 7: Verify access - user must own project OR be team member
    if (userId && project.teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: project.teamId, userId } },
      });
      if (!membership && project.userId !== userId) {
        return res.status(403).json({ error: 'You do not have access to this project' });
      }
    }

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    // Fetch project to check ownership
    const project = await prisma.project.findUnique({
      where: { id },
      select: { userId: true, teamId: true },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Phase 7: Only owner or team admin can delete
    if (userId) {
      const canDelete = project.userId === userId;

      if (!canDelete && project.teamId) {
        // Check if user is team owner or admin
        const membership = await prisma.teamMember.findUnique({
          where: { teamId_userId: { teamId: project.teamId, userId } },
        });
        if (!membership || !['owner', 'admin'].includes(membership.role)) {
          return res
            .status(403)
            .json({ error: 'Only project owner or team admin can delete this project' });
        }
      } else if (!canDelete) {
        return res.status(403).json({ error: 'You do not have permission to delete this project' });
      }
    }

    await prisma.project.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};
