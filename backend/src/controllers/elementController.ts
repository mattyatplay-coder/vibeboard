import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient({});

export const uploadElement = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { name, type, metadata, tags, sessionId } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'File is required' });
        }
        if (!name || !type) {
            return res.status(400).json({ error: 'Name and Type are required' });
        }

        // Construct a relative URL for the file
        // In production, this would be an S3 URL. For now, it's a static path.
        const fileUrl = `/uploads/${file.filename}`;

        // Handle duplicate names
        let finalName = name;
        let counter = 1;
        while (await prisma.element.findFirst({ where: { projectId, name: finalName } })) {
            finalName = `${name} (${counter})`;
            counter++;
        }

        let parsedMetadata = {};
        if (metadata) {
            try {
                parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
            } catch (e) {
                console.error("Failed to parse metadata", e);
            }
        }

        let parsedTags: string[] = [];
        if (tags) {
            try {
                parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
            } catch (e) {
                console.error("Failed to parse tags", e);
            }
        }

        const element = await prisma.element.create({
            data: {
                projectId,
                name: finalName,
                type,
                fileUrl,
                metadata: parsedMetadata,
                tags: parsedTags,
                sessionId: sessionId || null,
            },
        });

        res.status(201).json(element);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to upload element' });
    }
};

export const getElements = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const elements = await prisma.element.findMany({
            where: { projectId },
            include: { session: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(elements);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch elements' });
    }
};

export const getAllElements = async (req: Request, res: Response) => {
    try {
        const elements = await prisma.element.findMany({
            include: { session: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(elements);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch all elements' });
    }
};

export const updateElement = async (req: Request, res: Response) => {
    try {
        const { projectId, elementId } = req.params;
        const { name, type, isFavorite, tags, sessionId } = req.body;
        const file = req.file;

        const data: any = { name, type };
        if (sessionId !== undefined) data.sessionId = sessionId === 'null' ? null : sessionId;
        if (isFavorite !== undefined) data.isFavorite = isFavorite === 'true'; // Multipart sends strings
        if (file) {
            data.fileUrl = `/uploads/${file.filename}`;
        }
        if (tags) {
            try {
                data.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
            } catch (e) {
                console.error("Failed to parse tags", e);
            }
        }

        // Check for duplicate name if name is being updated
        if (name) {
            const existing = await prisma.element.findFirst({
                where: {
                    projectId,
                    name,
                    NOT: { id: elementId }
                }
            });

            if (existing) {
                return res.status(409).json({ error: 'Element name already exists' });
            }
        }

        const element = await prisma.element.update({
            where: { id: elementId, projectId },
            data,
        });

        res.json(element);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update element' });
    }
};

export const deleteElement = async (req: Request, res: Response) => {
    try {
        const { projectId, elementId } = req.params;

        await prisma.element.delete({
            where: { id: elementId, projectId },
        });

        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete element' });
    }
};
