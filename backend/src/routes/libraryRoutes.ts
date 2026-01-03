import { Router } from 'express';
import { Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

/**
 * GET /api/library/project/:projectId
 * Get all global library items with installation status for a project
 */
router.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Get all global items
    const globalItems = await prisma.globalLoRA.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Get project's installed LoRAs to check installation status
    const projectLoRAs = await prisma.loRA.findMany({
      where: { projectId },
      select: { id: true, globalLoRAId: true },
    });

    const installedGlobalIds = new Set(
      projectLoRAs.filter(l => l.globalLoRAId).map(l => l.globalLoRAId)
    );

    // Map to response format
    const items = globalItems.map(item => ({
      id: item.id,
      name: item.name,
      triggerWord: item.triggerWord,
      fileUrl: item.fileUrl,
      baseModel: item.baseModel,
      type: item.type,
      strength: item.strength,
      imageUrl: item.imageUrl,
      settings: item.recommendedSettings ? JSON.parse(item.recommendedSettings) : null,
      description: item.description,
      tags: item.tags ? JSON.parse(item.tags) : [],
      usageCount: 0, // TODO: track usage
      isInstalled: installedGlobalIds.has(item.id),
      projectLoRAId: projectLoRAs.find(l => l.globalLoRAId === item.id)?.id,
    }));

    res.json(items);
  } catch (error) {
    console.error('Failed to fetch library items:', error);
    res.status(500).json({ error: 'Failed to fetch library items' });
  }
});

/**
 * POST /api/library/:globalId/install
 * Install a global library item to a project
 */
router.post('/:globalId/install', async (req: Request, res: Response) => {
  try {
    const { globalId } = req.params;
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    // Get the global item
    const globalItem = await prisma.globalLoRA.findUnique({
      where: { id: globalId },
    });

    if (!globalItem) {
      return res.status(404).json({ error: 'Global item not found' });
    }

    // Check if already installed
    const existing = await prisma.loRA.findFirst({
      where: {
        projectId,
        globalLoRAId: globalId,
      },
    });

    if (existing) {
      return res.json({ success: true, loraId: existing.id, message: 'Already installed' });
    }

    // Create project LoRA linked to global
    const lora = await prisma.loRA.create({
      data: {
        projectId,
        name: globalItem.name,
        triggerWord: globalItem.triggerWord,
        fileUrl: globalItem.fileUrl,
        baseModel: globalItem.baseModel,
        type: globalItem.type,
        strength: globalItem.strength,
        imageUrl: globalItem.imageUrl,
        recommendedSettings: globalItem.recommendedSettings,
        globalLoRAId: globalItem.id,
      },
    });

    res.json({ success: true, loraId: lora.id });
  } catch (error) {
    console.error('Failed to install library item:', error);
    res.status(500).json({ error: 'Failed to install library item' });
  }
});

/**
 * GET /api/library
 * Get all global library items (no project context)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const globalItems = await prisma.globalLoRA.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const items = globalItems.map(item => ({
      id: item.id,
      name: item.name,
      triggerWord: item.triggerWord,
      fileUrl: item.fileUrl,
      baseModel: item.baseModel,
      type: item.type,
      strength: item.strength,
      imageUrl: item.imageUrl,
      settings: item.recommendedSettings ? JSON.parse(item.recommendedSettings) : null,
      description: item.description,
      tags: item.tags ? JSON.parse(item.tags) : [],
    }));

    res.json(items);
  } catch (error) {
    console.error('Failed to fetch library:', error);
    res.status(500).json({ error: 'Failed to fetch library' });
  }
});

export default router;
