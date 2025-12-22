import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get all items from the global LoRA library
 */
export const getGlobalLibrary = async (req: Request, res: Response) => {
  try {
    const { type, baseModel, search } = req.query;

    const where: any = {};

    if (type && typeof type === 'string') {
      where.type = type;
    }

    if (baseModel && typeof baseModel === 'string') {
      where.baseModel = baseModel;
    }

    if (search && typeof search === 'string') {
      where.OR = [{ name: { contains: search } }, { description: { contains: search } }];
    }

    const items = await prisma.globalLoRA.findMany({
      where,
      orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { projectInstalls: true },
        },
      },
    });

    // Parse recommendedSettings, tags, and aliasPatterns JSON strings
    const parsedItems = items.map(item => ({
      ...item,
      settings: item.recommendedSettings ? JSON.parse(item.recommendedSettings) : null,
      tags: item.tags ? JSON.parse(item.tags) : [],
      aliasPatterns: item.aliasPatterns ? JSON.parse(item.aliasPatterns) : [],
      installCount: item._count.projectInstalls,
    }));

    res.json(parsedItems);
  } catch (error) {
    console.error('Failed to fetch global library:', error);
    res.status(500).json({ error: 'Failed to fetch global library' });
  }
};

/**
 * Add a new item to the global library
 */
export const addToGlobalLibrary = async (req: Request, res: Response) => {
  try {
    const {
      name,
      triggerWord,
      fileUrl,
      baseModel,
      strength,
      imageUrl,
      type,
      settings,
      civitaiModelId,
      civitaiVersionId,
      description,
      tags,
    } = req.body;

    console.log('[addToGlobalLibrary] Adding:', name, type);

    // Check if already exists by fileUrl or civitai IDs
    const existing = await prisma.globalLoRA.findFirst({
      where: {
        OR: [{ fileUrl }, ...(civitaiVersionId ? [{ civitaiVersionId }] : [])],
      },
    });

    if (existing) {
      // Update existing entry
      const updated = await prisma.globalLoRA.update({
        where: { id: existing.id },
        data: {
          name,
          triggerWord,
          baseModel,
          strength: strength || 1.0,
          imageUrl,
          type: type || 'lora',
          recommendedSettings: settings ? JSON.stringify(settings) : null,
          description,
          tags: JSON.stringify(tags || []),
          updatedAt: new Date(),
        },
      });

      console.log('[addToGlobalLibrary] Updated existing:', updated.id);
      res.json({ ...updated, isNew: false });
      return;
    }

    // Create new entry
    const globalLoRA = await prisma.globalLoRA.create({
      data: {
        name,
        triggerWord,
        fileUrl,
        baseModel,
        strength: strength || 1.0,
        imageUrl,
        type: type || 'lora',
        recommendedSettings: settings ? JSON.stringify(settings) : null,
        civitaiModelId,
        civitaiVersionId,
        description,
        tags: JSON.stringify(tags || []),
      },
    });

    console.log('[addToGlobalLibrary] Created new:', globalLoRA.id);
    res.status(201).json({ ...globalLoRA, isNew: true });
  } catch (error) {
    console.error('Failed to add to global library:', error);
    res.status(500).json({ error: 'Failed to add to global library' });
  }
};

/**
 * Install a global library item into a project
 */
export const installToProject = async (req: Request, res: Response) => {
  try {
    const { globalLoRAId } = req.params;
    const { projectId } = req.body;

    console.log(`[installToProject] Installing ${globalLoRAId} to project ${projectId}`);

    // Get the global item
    const globalItem = await prisma.globalLoRA.findUnique({
      where: { id: globalLoRAId },
    });

    if (!globalItem) {
      res.status(404).json({ error: 'Global library item not found' });
      return;
    }

    // Check if already installed in this project
    const existing = await prisma.loRA.findFirst({
      where: {
        projectId,
        globalLoRAId,
      },
    });

    if (existing) {
      res.json({ ...existing, alreadyInstalled: true });
      return;
    }

    // Create project-specific LoRA linked to global
    const projectLoRA = await prisma.loRA.create({
      data: {
        projectId,
        name: globalItem.name,
        triggerWord: globalItem.triggerWord,
        fileUrl: globalItem.fileUrl,
        baseModel: globalItem.baseModel,
        strength: globalItem.strength,
        imageUrl: globalItem.imageUrl,
        type: globalItem.type,
        recommendedSettings: globalItem.recommendedSettings,
        globalLoRAId: globalItem.id,
      },
    });

    // Increment usage count
    await prisma.globalLoRA.update({
      where: { id: globalLoRAId },
      data: { usageCount: { increment: 1 } },
    });

    console.log(`[installToProject] Installed as ${projectLoRA.id}`);
    res.status(201).json({ ...projectLoRA, alreadyInstalled: false });
  } catch (error) {
    console.error('Failed to install to project:', error);
    res.status(500).json({ error: 'Failed to install to project' });
  }
};

/**
 * Delete an item from the global library
 */
export const deleteFromGlobalLibrary = async (req: Request, res: Response) => {
  try {
    const { globalLoRAId } = req.params;

    // First, unlink any project installs
    await prisma.loRA.updateMany({
      where: { globalLoRAId },
      data: { globalLoRAId: null },
    });

    // Then delete the global item
    await prisma.globalLoRA.delete({
      where: { id: globalLoRAId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete from global library:', error);
    res.status(500).json({ error: 'Failed to delete from global library' });
  }
};

/**
 * Get installation status for a project
 */
export const getProjectInstallations = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Get all global items with their installation status for this project
    const globalItems = await prisma.globalLoRA.findMany({
      orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
      include: {
        projectInstalls: {
          where: { projectId },
          select: { id: true },
        },
      },
    });

    const result = globalItems.map(item => ({
      ...item,
      settings: item.recommendedSettings ? JSON.parse(item.recommendedSettings) : null,
      tags: item.tags ? JSON.parse(item.tags) : [],
      isInstalled: item.projectInstalls.length > 0,
      projectLoRAId: item.projectInstalls[0]?.id || null,
    }));

    res.json(result);
  } catch (error) {
    console.error('Failed to get project installations:', error);
    res.status(500).json({ error: 'Failed to get project installations' });
  }
};
