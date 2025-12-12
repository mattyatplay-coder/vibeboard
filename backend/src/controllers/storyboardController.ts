import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({});

// Helper to parse JSON fields from generation records
const parseGenerationJsonFields = (generation: any) => {
    if (!generation) return generation;
    return {
        ...generation,
        outputs: generation.outputs ? (typeof generation.outputs === 'string' ? JSON.parse(generation.outputs) : generation.outputs) : null,
        usedLoras: generation.usedLoras ? (typeof generation.usedLoras === 'string' ? JSON.parse(generation.usedLoras) : generation.usedLoras) : null,
        sourceElementIds: generation.sourceElementIds ? (typeof generation.sourceElementIds === 'string' ? JSON.parse(generation.sourceElementIds) : generation.sourceElementIds) : null,
    };
};

/**
 * Get the complete storyboard for a project
 * Returns all scenes with their shots and generations
 */
export const getStoryboard = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { sessionId } = req.query;

        const where: any = { projectId };
        if (sessionId) {
            where.sessionId = sessionId;
        }

        const scenes = await prisma.scene.findMany({
            where,
            include: {
                shots: {
                    orderBy: { index: 'asc' },
                    include: {
                        generation: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        // Parse JSON fields in nested generations
        const parsedScenes = scenes.map(scene => ({
            ...scene,
            shots: scene.shots.map(shot => ({
                ...shot,
                generation: parseGenerationJsonFields(shot.generation),
            })),
        }));

        // Return storyboard metadata along with scenes
        const storyboard = {
            projectId,
            sessionId: sessionId || null,
            totalScenes: scenes.length,
            totalShots: scenes.reduce((sum, scene) => sum + scene.shots.length, 0),
            scenes: parsedScenes,
        };

        res.json(storyboard);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch storyboard' });
    }
};

/**
 * Get storyboard statistics
 */
export const getStoryboardStats = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { sessionId } = req.query;

        const where: any = { projectId };
        if (sessionId) {
            where.sessionId = sessionId;
        }

        const scenes = await prisma.scene.findMany({
            where,
            include: {
                shots: true,
            },
        });

        const stats = {
            totalScenes: scenes.length,
            totalShots: scenes.reduce((sum, scene) => sum + scene.shots.length, 0),
            scenesWithShots: scenes.filter(scene => scene.shots.length > 0).length,
            emptyScenes: scenes.filter(scene => scene.shots.length === 0).length,
            averageShotsPerScene: scenes.length > 0
                ? (scenes.reduce((sum, scene) => sum + scene.shots.length, 0) / scenes.length).toFixed(2)
                : 0,
        };

        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch storyboard statistics' });
    }
};

/**
 * Duplicate an entire storyboard (all scenes and shots)
 */
export const duplicateStoryboard = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { sourceSessionId, targetSessionId, prefix } = req.body;

        const where: any = { projectId };
        if (sourceSessionId) {
            where.sessionId = sourceSessionId;
        }

        // Fetch all scenes with shots
        const scenes = await prisma.scene.findMany({
            where,
            include: {
                shots: {
                    orderBy: { index: 'asc' },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        const duplicatedScenes = [];

        // Duplicate each scene
        for (const scene of scenes) {
            const newScene = await prisma.scene.create({
                data: {
                    projectId,
                    name: prefix ? `${prefix} ${scene.name}` : `Copy of ${scene.name}`,
                    description: scene.description,
                    sessionId: targetSessionId || null,
                },
            });

            // Duplicate shots
            for (const shot of scene.shots) {
                await prisma.sceneShot.create({
                    data: {
                        sceneId: newScene.id,
                        generationId: shot.generationId,
                        index: shot.index,
                        notes: shot.notes,
                    },
                });
            }

            duplicatedScenes.push(newScene);
        }

        res.status(201).json({
            message: 'Storyboard duplicated successfully',
            sceneCount: duplicatedScenes.length,
            scenes: duplicatedScenes,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to duplicate storyboard' });
    }
};

/**
 * Export storyboard data
 */
export const exportStoryboard = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { sessionId, format = 'json' } = req.query;

        const where: any = { projectId };
        if (sessionId) {
            where.sessionId = sessionId;
        }

        const scenes = await prisma.scene.findMany({
            where,
            include: {
                shots: {
                    orderBy: { index: 'asc' },
                    include: {
                        generation: {
                            select: {
                                id: true,
                                name: true,
                                inputPrompt: true,
                                resolvedPrompt: true,
                                shotType: true,
                                cameraAngle: true,
                                location: true,
                                lighting: true,
                                outputs: true,
                                createdAt: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        // Parse JSON fields
        const parsedScenes = scenes.map(scene => ({
            ...scene,
            shots: scene.shots.map(shot => ({
                ...shot,
                generation: parseGenerationJsonFields(shot.generation),
            })),
        }));

        const exportData = {
            projectId,
            sessionId: sessionId || null,
            exportedAt: new Date().toISOString(),
            totalScenes: scenes.length,
            totalShots: scenes.reduce((sum, scene) => sum + scene.shots.length, 0),
            scenes: parsedScenes,
        };

        if (format === 'json') {
            res.json(exportData);
        } else {
            // Could add other formats like CSV, PDF etc.
            res.status(400).json({ error: 'Unsupported export format' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to export storyboard' });
    }
};

/**
 * Clear all scenes and shots from a storyboard
 */
export const clearStoryboard = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { sessionId } = req.body;

        const where: any = { projectId };
        if (sessionId) {
            where.sessionId = sessionId;
        }

        // Get all scenes to delete
        const scenes = await prisma.scene.findMany({
            where,
            select: { id: true },
        });

        const sceneIds = scenes.map(s => s.id);

        // Delete all shots first
        await prisma.sceneShot.deleteMany({
            where: {
                sceneId: {
                    in: sceneIds,
                },
            },
        });

        // Delete all scenes
        const result = await prisma.scene.deleteMany({
            where,
        });

        res.json({
            message: 'Storyboard cleared successfully',
            deletedScenes: result.count,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to clear storyboard' });
    }
};
