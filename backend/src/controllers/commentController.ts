/**
 * Comment Controller - Collaborative Dailies
 *
 * Handles CRUD operations for comments/annotations on generations.
 * Supports temporal (video timecodes) and spatial (x,y coordinates) positioning.
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get all comments for a generation
 */
export async function getComments(req: Request, res: Response) {
  try {
    const { generationId } = req.params;
    const { resolved } = req.query;

    const whereClause: any = {
      generationId,
      parentId: null, // Only top-level comments (not replies)
    };

    if (resolved !== undefined) {
      whereClause.resolved = resolved === 'true';
    }

    const comments = await prisma.comment.findMany({
      where: whereClause,
      include: {
        replies: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [
        { timestamp: 'asc' }, // Sort by video timecode first
        { createdAt: 'asc' },
      ],
    });

    return res.json({ success: true, comments });
  } catch (error: any) {
    console.error('[CommentController] getComments error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Create a new comment
 */
export async function createComment(req: Request, res: Response) {
  try {
    const { generationId } = req.params;
    const {
      text,
      timestamp,
      coordinates,
      type = 'note',
      parentId,
      userId = 'user_1',
      userName = 'Director',
    } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Comment text is required' });
    }

    // Verify the generation exists
    const generation = await prisma.generation.findUnique({
      where: { id: generationId },
    });

    if (!generation) {
      return res.status(404).json({ success: false, error: 'Generation not found' });
    }

    // If parentId is provided, verify it exists
    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        return res.status(404).json({ success: false, error: 'Parent comment not found' });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        generationId,
        text: text.trim(),
        timestamp: timestamp ?? null,
        coordinates: coordinates ? JSON.stringify(coordinates) : null,
        type,
        parentId: parentId ?? null,
        userId,
        userName,
      },
      include: {
        replies: true,
      },
    });

    return res.status(201).json({ success: true, comment });
  } catch (error: any) {
    console.error('[CommentController] createComment error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update a comment
 */
export async function updateComment(req: Request, res: Response) {
  try {
    const { commentId } = req.params;
    const { text, type, resolved, resolvedBy } = req.body;

    const existing = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    const updateData: any = {};

    if (text !== undefined) {
      updateData.text = text.trim();
    }

    if (type !== undefined) {
      updateData.type = type;
    }

    if (resolved !== undefined) {
      updateData.resolved = resolved;
      if (resolved) {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = resolvedBy || 'user_1';
      } else {
        updateData.resolvedAt = null;
        updateData.resolvedBy = null;
      }
    }

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: updateData,
      include: {
        replies: true,
      },
    });

    return res.json({ success: true, comment });
  } catch (error: any) {
    console.error('[CommentController] updateComment error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(req: Request, res: Response) {
  try {
    const { commentId } = req.params;

    const existing = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    // Delete the comment (will cascade to replies due to Prisma relation)
    await prisma.comment.delete({
      where: { id: commentId },
    });

    return res.json({ success: true, message: 'Comment deleted' });
  } catch (error: any) {
    console.error('[CommentController] deleteComment error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Resolve/unresolve a comment
 */
export async function toggleResolved(req: Request, res: Response) {
  try {
    const { commentId } = req.params;
    const { resolvedBy = 'user_1' } = req.body;

    const existing = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    const newResolved = !existing.resolved;

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        resolved: newResolved,
        resolvedAt: newResolved ? new Date() : null,
        resolvedBy: newResolved ? resolvedBy : null,
      },
      include: {
        replies: true,
      },
    });

    return res.json({ success: true, comment });
  } catch (error: any) {
    console.error('[CommentController] toggleResolved error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get comment statistics for a generation
 */
export async function getCommentStats(req: Request, res: Response) {
  try {
    const { generationId } = req.params;

    const [total, resolved, unresolved, byType] = await Promise.all([
      prisma.comment.count({ where: { generationId } }),
      prisma.comment.count({ where: { generationId, resolved: true } }),
      prisma.comment.count({ where: { generationId, resolved: false } }),
      prisma.comment.groupBy({
        by: ['type'],
        where: { generationId },
        _count: { type: true },
      }),
    ]);

    const typeStats = byType.reduce((acc: any, item) => {
      acc[item.type] = item._count.type;
      return acc;
    }, {});

    return res.json({
      success: true,
      stats: {
        total,
        resolved,
        unresolved,
        byType: typeStats,
      },
    });
  } catch (error: any) {
    console.error('[CommentController] getCommentStats error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get all comments for a project (for Dailies overview page)
 */
export async function getProjectComments(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { resolved, limit = '50' } = req.query;

    const whereClause: any = {
      generation: {
        projectId,
      },
      parentId: null, // Only top-level comments
    };

    if (resolved !== undefined) {
      whereClause.resolved = resolved === 'true';
    }

    const comments = await prisma.comment.findMany({
      where: whereClause,
      include: {
        generation: {
          select: {
            id: true,
            inputPrompt: true,
            outputs: true,
            status: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10),
    });

    return res.json({ success: true, comments });
  } catch (error: any) {
    console.error('[CommentController] getProjectComments error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get version history for a scene (generations grouped by scene)
 * This powers the "Version Stacking" feature
 */
export async function getVersionStack(req: Request, res: Response) {
  try {
    const { generationId } = req.params;

    // Get the generation to find its scene association
    const generation = await prisma.generation.findUnique({
      where: { id: generationId },
      include: {
        sceneShots: {
          include: {
            scene: true,
          },
        },
      },
    });

    if (!generation) {
      return res.status(404).json({ success: false, error: 'Generation not found' });
    }

    // If it's part of a scene, get all generations for that scene
    if (generation.sceneShots.length > 0) {
      const sceneId = generation.sceneShots[0].sceneId;

      const sceneShots = await prisma.sceneShot.findMany({
        where: { sceneId },
        include: {
          generation: {
            select: {
              id: true,
              inputPrompt: true,
              outputs: true,
              status: true,
              createdAt: true,
              rating: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const versions = sceneShots.map((shot, index) => ({
        version: sceneShots.length - index,
        generationId: shot.generationId,
        generation: shot.generation,
        isCurrent: shot.generationId === generationId,
      }));

      return res.json({ success: true, versions, sceneId });
    }

    // If not part of a scene, try to find by similar prompt (fuzzy matching)
    // Get generations with similar prompts from the same project
    const similarGenerations = await prisma.generation.findMany({
      where: {
        projectId: generation.projectId,
        inputPrompt: {
          contains: generation.inputPrompt.substring(0, 50), // First 50 chars
        },
      },
      select: {
        id: true,
        inputPrompt: true,
        outputs: true,
        status: true,
        createdAt: true,
        rating: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const versions = similarGenerations.map((gen, index) => ({
      version: similarGenerations.length - index,
      generationId: gen.id,
      generation: gen,
      isCurrent: gen.id === generationId,
    }));

    return res.json({ success: true, versions, sceneId: null });
  } catch (error: any) {
    console.error('[CommentController] getVersionStack error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
