import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient({});

// Helper to parse JSON fields from element records
const parseElementJsonFields = (element: any) => {
    if (!element) return element;
    return {
        ...element,
        metadata: element.metadata ? (typeof element.metadata === 'string' ? JSON.parse(element.metadata) : element.metadata) : null,
        tags: element.tags ? (typeof element.tags === 'string' ? JSON.parse(element.tags) : element.tags) : [],
    };
};

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
                metadata: JSON.stringify(parsedMetadata),
                tags: JSON.stringify(parsedTags),
                sessionId: sessionId || null,
            },
        });

        res.status(201).json(parseElementJsonFields(element));
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
        res.json(elements.map(parseElementJsonFields));
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
        res.json(elements.map(parseElementJsonFields));
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
                const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
                data.tags = JSON.stringify(parsedTags);
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

        res.json(parseElementJsonFields(element));
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

export const createElementFromGeneration = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { name, type, url, metadata, tags, sessionId } = req.body;

        if (!url || !name || !type) {
            return res.status(400).json({ error: 'URL, Name, and Type are required' });
        }

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

        // Download the file locally to prevent expiry
        let fileUrl = url;
        try {
            if (url.startsWith('http')) {
                const response = await fetch(url);
                if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    // Determine extension from content-type or url
                    const ext = url.split('.').pop()?.split('?')[0] || (type === 'video' ? 'mp4' : 'png');
                    const filename = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;
                    const uploadPath = path.join(process.cwd(), 'uploads', filename);

                    // Utilize fs/promises to import locally if not available globally, assuming node env
                    const fs = require('fs');
                    await fs.promises.writeFile(uploadPath, Buffer.from(buffer));

                    fileUrl = `/uploads/${filename}`;
                    console.log(`Downloaded element to ${fileUrl}`);
                }
            }
        } catch (downloadErr) {
            console.error("Failed to download generation asset, using original URL", downloadErr);
            // Fallback to original URL
        }

        const element = await prisma.element.create({
            data: {
                projectId,
                name: finalName,
                type,
                fileUrl: fileUrl,
                metadata: JSON.stringify(parsedMetadata),
                tags: JSON.stringify(parsedTags),
                sessionId: sessionId || null,
            },
        });

        res.status(201).json(parseElementJsonFields(element));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create element from generation' });
    }
};
