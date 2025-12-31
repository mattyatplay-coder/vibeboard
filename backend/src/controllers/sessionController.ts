import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth';

export const getSessions = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const sessions = await prisma.session.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { generations: true },
        },
      },
    });
    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

export const createSession = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { name, description } = req.body;

    // P0 SECURITY: Associate session with authenticated user
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    const session = await prisma.session.create({
      data: {
        projectId,
        name,
        description,
        ...(userId ? { userId } : {}),
      },
    });
    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create session' });
  }
};

export const updateSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const session = await prisma.session.update({
      where: { id },
      data: { name, description },
    });
    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update session' });
  }
};

export const deleteSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Use a transaction to ensure all related data is deleted
    await prisma.$transaction(async tx => {
      // 1. Delete SceneShots for scenes in this session
      // First find all scenes in this session
      const scenes = await tx.scene.findMany({
        where: { sessionId: id },
        select: { id: true },
      });
      const sceneIds = scenes.map(s => s.id);

      if (sceneIds.length > 0) {
        await tx.sceneShot.deleteMany({
          where: { sceneId: { in: sceneIds } },
        });
      }

      // 2. Delete Scenes
      await tx.scene.deleteMany({
        where: { sessionId: id },
      });

      // 3. Delete Generations (and their outputs if we were tracking them separately, but they are JSON)
      // Note: If generations are used in other scenes (not in this session), we might have an issue.
      // But usually generations belong to a session.
      // However, the schema says Generation has optional sessionId.
      // We should only delete generations that belong to this session.
      await tx.generation.deleteMany({
        where: { sessionId: id },
      });

      // 4. Delete Elements
      await tx.element.deleteMany({
        where: { sessionId: id },
      });

      // 5. Finally delete the Session
      await tx.session.delete({
        where: { id },
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
};
