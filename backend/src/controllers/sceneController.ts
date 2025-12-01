import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({});

export const createScene = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { name, description, sessionId } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const scene = await prisma.scene.create({
            data: {
                projectId,
                name,
                description,
                sessionId
            },
        });

        res.status(201).json(scene);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create scene' });
    }
};

export const getScenes = async (req: Request, res: Response) => {
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
        res.json(scenes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch scenes' });
    }
};

export const addShotToScene = async (req: Request, res: Response) => {
    try {
        const { sceneId } = req.params;
        const { generationId, index, notes } = req.body;

        if (!generationId || index === undefined) {
            return res.status(400).json({ error: 'Generation ID and Index are required' });
        }

        // Shift existing shots if necessary
        await prisma.sceneShot.updateMany({
            where: {
                sceneId,
                index: {
                    gte: index
                }
            },
            data: {
                index: {
                    increment: 1
                }
            }
        });

        const shot = await prisma.sceneShot.create({
            data: {
                sceneId,
                generationId,
                index,
                notes,
            },
        });

        res.status(201).json(shot);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add shot to scene' });
    }
};

export const removeShotFromScene = async (req: Request, res: Response) => {
    try {
        const { sceneId, shotId } = req.params;

        await prisma.sceneShot.delete({
            where: {
                id: shotId,
                sceneId // Ensure it belongs to the scene
            }
        });

        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to remove shot from scene' });
    }
};

export const updateScene = async (req: Request, res: Response) => {
    try {
        const { sceneId } = req.params;
        const { name, description, sessionId } = req.body;

        const scene = await prisma.scene.update({
            where: { id: sceneId },
            data: {
                name,
                description,
                sessionId
            }
        });

        res.json(scene);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update scene' });
    }
};

export const deleteScene = async (req: Request, res: Response) => {
    try {
        const { sceneId } = req.params;

        // Delete shots first (if cascade not set in DB, but good practice to be explicit or rely on relation)
        await prisma.sceneShot.deleteMany({
            where: { sceneId }
        });

        await prisma.scene.delete({
            where: { id: sceneId }
        });

        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete scene' });
    }
};
