import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { uploadFile, deleteFile, validateMediaFile } from '../utils/storage';

const prisma = new PrismaClient({});

// =============================================================================
// PHASE 7: Multi-Tenant Helper - Get project's teamId for asset inheritance
// =============================================================================
async function getProjectTeamId(projectId: string): Promise<string | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { teamId: true },
  });
  return project?.teamId ?? null;
}

// Helper to safely parse tags - handles PostgreSQL array notation {value} and JSON ["value"]
const safeParseTagsField = (tags: any): string[] => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags !== 'string') return [];

  const trimmed = tags.trim();

  // Handle empty cases
  if (trimmed === '' || trimmed === '{}' || trimmed === '[]') return [];

  // Handle PostgreSQL array notation: {tag1,tag2,tag3}
  if (trimmed.startsWith('{') && trimmed.endsWith('}') && !trimmed.startsWith('{"')) {
    const inner = trimmed.slice(1, -1);
    if (inner === '') return [];
    return inner.split(',').map(t => t.trim().replace(/^"|"$/g, ''));
  }

  // Try JSON parse for ["tag1", "tag2"]
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // If all else fails, treat as single tag
    return [trimmed];
  }
};

// Helper to parse JSON fields from element records
const parseElementJsonFields = (element: any) => {
  if (!element) return element;

  let parsedMetadata = null;
  if (element.metadata) {
    try {
      parsedMetadata = typeof element.metadata === 'string'
        ? JSON.parse(element.metadata)
        : element.metadata;
    } catch {
      console.warn(`Failed to parse metadata for element ${element.id}`);
      parsedMetadata = {};
    }
  }

  return {
    ...element,
    metadata: parsedMetadata,
    tags: safeParseTagsField(element.tags),
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

    // Validate file type and size using storage.ts
    try {
      // Create a mock Multer file with buffer for validation
      const fileWithBuffer = {
        ...file,
        buffer: fs.readFileSync(file.path),
      } as Express.Multer.File;
      validateMediaFile(fileWithBuffer);
    } catch (validationError: any) {
      // Clean up the uploaded file
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(400).json({ error: validationError.message || 'Invalid file type or size' });
    }

    // Upload to storage (R2/S3/local based on STORAGE_PROVIDER)
    let fileUrl: string;
    let storageKey: string;

    try {
      const fileBuffer = fs.readFileSync(file.path);
      const fileWithBuffer = {
        ...file,
        buffer: fileBuffer,
      } as Express.Multer.File;

      const uploadResult = await uploadFile(fileWithBuffer, `elements/${projectId}`);
      fileUrl = uploadResult.url;
      storageKey = uploadResult.key;

      // Clean up temp file after successful upload
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (uploadError: any) {
      console.error('Upload to storage failed:', uploadError);
      // Fallback to local path if storage upload fails
      fileUrl = `/uploads/${file.filename}`;
      storageKey = file.filename;
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
        console.error('Failed to parse metadata', e);
      }
    }

    const parsedTags = safeParseTagsField(tags);

    // Phase 7: Inherit teamId from project for shared asset access
    const teamId = await getProjectTeamId(projectId);

    const element = await prisma.element.create({
      data: {
        projectId,
        teamId,
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
      // Validate and upload new file
      try {
        const fileBuffer = fs.readFileSync(file.path);
        const fileWithBuffer = {
          ...file,
          buffer: fileBuffer,
        } as Express.Multer.File;

        validateMediaFile(fileWithBuffer);
        const uploadResult = await uploadFile(fileWithBuffer, `elements/${projectId}`);
        data.fileUrl = uploadResult.url;

        // Clean up temp file
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (uploadError: any) {
        console.error('Upload failed, using local path:', uploadError);
        data.fileUrl = `/uploads/${file.filename}`;
      }
    }

    if (tags !== undefined) {
      const parsedTags = safeParseTagsField(tags);
      data.tags = JSON.stringify(parsedTags);
    }

    // Check for duplicate name if name is being updated
    if (name) {
      const existing = await prisma.element.findFirst({
        where: {
          projectId,
          name,
          NOT: { id: elementId },
        },
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
        console.error('Failed to parse metadata', e);
      }
    }

    const parsedTags = safeParseTagsField(tags);

    // Download the file and upload to storage (R2/S3/local)
    let fileUrl = url;
    try {
      if (url.startsWith('http')) {
        const response = await fetch(url);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const contentType = response.headers.get('content-type') || 'image/png';
          // Determine extension from content-type or url
          const ext = url.split('.').pop()?.split('?')[0] || (type === 'video' ? 'mp4' : 'png');
          const filename = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;

          // Create a mock Multer file for uploadFile
          const mockFile = {
            fieldname: 'file',
            originalname: filename,
            encoding: '7bit',
            mimetype: contentType,
            buffer: Buffer.from(buffer),
            size: buffer.byteLength,
          } as Express.Multer.File;

          try {
            const uploadResult = await uploadFile(mockFile, `elements/${projectId}`);
            fileUrl = uploadResult.url;
            console.log(`Uploaded element to storage: ${fileUrl}`);
          } catch (uploadError) {
            // Fallback to local storage
            const uploadPath = path.join(process.cwd(), 'uploads', filename);
            await fs.promises.writeFile(uploadPath, Buffer.from(buffer));
            fileUrl = `/uploads/${filename}`;
            console.log(`Saved element locally: ${fileUrl}`);
          }
        }
      }
    } catch (downloadErr) {
      console.error('Failed to download generation asset, using original URL', downloadErr);
      // Fallback to original URL
    }

    // Phase 7: Inherit teamId from project for shared asset access
    const teamId = await getProjectTeamId(projectId);

    const element = await prisma.element.create({
      data: {
        projectId,
        teamId,
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
