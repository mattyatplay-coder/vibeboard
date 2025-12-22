import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({});

// Helper to parse JSON fields from generation records (same as in generationController)
const parseGenerationJsonFields = (generation: any) => {
  if (!generation) return generation;
  return {
    ...generation,
    outputs: generation.outputs
      ? typeof generation.outputs === 'string'
        ? JSON.parse(generation.outputs)
        : generation.outputs
      : null,
    usedLoras: generation.usedLoras
      ? typeof generation.usedLoras === 'string'
        ? JSON.parse(generation.usedLoras)
        : generation.usedLoras
      : null,
    sourceElementIds: generation.sourceElementIds
      ? typeof generation.sourceElementIds === 'string'
        ? JSON.parse(generation.sourceElementIds)
        : generation.sourceElementIds
      : null,
    tags: generation.tags
      ? typeof generation.tags === 'string'
        ? generation.tags.startsWith('[')
          ? JSON.parse(generation.tags)
          : [generation.tags]
        : generation.tags
      : [],
  };
};

// Helper to parse scene JSON fields
const parseSceneJsonFields = (scene: any) => {
  if (!scene) return scene;
  return {
    ...scene,
    referenceElementIds: scene.referenceElementIds
      ? typeof scene.referenceElementIds === 'string'
        ? JSON.parse(scene.referenceElementIds)
        : scene.referenceElementIds
      : [],
  };
};

export const createScene = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const {
      name,
      description,
      sessionId,
      referenceElementIds,
      defaultReferenceStrength,
      inheritReferences,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const scene = await prisma.scene.create({
      data: {
        projectId,
        name,
        description,
        sessionId,
        referenceElementIds: referenceElementIds ? JSON.stringify(referenceElementIds) : null,
        defaultReferenceStrength: defaultReferenceStrength ?? 0.7,
        inheritReferences: inheritReferences ?? true,
      },
    });

    res.status(201).json(parseSceneJsonFields(scene));
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

    // Parse JSON fields in nested generations and scene reference elements
    const parsedScenes = scenes.map(scene => ({
      ...parseSceneJsonFields(scene),
      shots: scene.shots.map(shot => ({
        ...shot,
        generation: parseGenerationJsonFields(shot.generation),
      })),
    }));

    res.json(parsedScenes);
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
          gte: index,
        },
      },
      data: {
        index: {
          increment: 1,
        },
      },
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
        sceneId, // Ensure it belongs to the scene
      },
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
    const {
      name,
      description,
      sessionId,
      referenceElementIds,
      defaultReferenceStrength,
      inheritReferences,
    } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (sessionId !== undefined) updateData.sessionId = sessionId;
    if (referenceElementIds !== undefined)
      updateData.referenceElementIds = JSON.stringify(referenceElementIds);
    if (defaultReferenceStrength !== undefined)
      updateData.defaultReferenceStrength = defaultReferenceStrength;
    if (inheritReferences !== undefined) updateData.inheritReferences = inheritReferences;

    const scene = await prisma.scene.update({
      where: { id: sceneId },
      data: updateData,
    });

    res.json(parseSceneJsonFields(scene));
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
      where: { sceneId },
    });

    await prisma.scene.delete({
      where: { id: sceneId },
    });

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete scene' });
  }
};

/**
 * Get inherited reference elements for a scene
 * Returns the element details (not just IDs) for easy use in generation
 * If inheritReferences is true, returns the scene's reference elements
 * Otherwise returns an empty array
 */
export const getSceneReferences = async (req: Request, res: Response) => {
  try {
    const { sceneId } = req.params;

    const scene = await prisma.scene.findUnique({
      where: { id: sceneId },
    });

    if (!scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    // Parse referenceElementIds
    const refIds = scene.referenceElementIds
      ? typeof scene.referenceElementIds === 'string'
        ? JSON.parse(scene.referenceElementIds)
        : scene.referenceElementIds
      : [];

    // If no references or inheritance disabled, return empty
    if (!scene.inheritReferences || refIds.length === 0) {
      return res.json({
        sceneId,
        inheritReferences: scene.inheritReferences,
        defaultStrength: scene.defaultReferenceStrength,
        elements: [],
      });
    }

    // Fetch the actual elements
    const elements = await prisma.element.findMany({
      where: {
        id: { in: refIds },
      },
    });

    // Build the response with element details
    const elementDetails = elements.map(el => ({
      id: el.id,
      name: el.name,
      type: el.type,
      fileUrl: el.fileUrl,
      defaultStrength: scene.defaultReferenceStrength,
    }));

    res.json({
      sceneId,
      inheritReferences: scene.inheritReferences,
      defaultStrength: scene.defaultReferenceStrength,
      elements: elementDetails,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get scene references' });
  }
};

/**
 * Add reference elements to a scene
 * Convenience endpoint to add elements without replacing existing ones
 */
export const addSceneReferences = async (req: Request, res: Response) => {
  try {
    const { sceneId } = req.params;
    const { elementIds } = req.body;

    if (!elementIds || !Array.isArray(elementIds)) {
      return res.status(400).json({ error: 'elementIds array is required' });
    }

    const scene = await prisma.scene.findUnique({
      where: { id: sceneId },
    });

    if (!scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    // Get existing reference IDs
    const existingIds = scene.referenceElementIds
      ? typeof scene.referenceElementIds === 'string'
        ? JSON.parse(scene.referenceElementIds)
        : scene.referenceElementIds
      : [];

    // Merge without duplicates
    const mergedIds = Array.from(new Set([...existingIds, ...elementIds]));

    const updatedScene = await prisma.scene.update({
      where: { id: sceneId },
      data: {
        referenceElementIds: JSON.stringify(mergedIds),
      },
    });

    res.json(parseSceneJsonFields(updatedScene));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add scene references' });
  }
};

/**
 * Remove reference elements from a scene
 */
export const removeSceneReferences = async (req: Request, res: Response) => {
  try {
    const { sceneId } = req.params;
    const { elementIds } = req.body;

    if (!elementIds || !Array.isArray(elementIds)) {
      return res.status(400).json({ error: 'elementIds array is required' });
    }

    const scene = await prisma.scene.findUnique({
      where: { id: sceneId },
    });

    if (!scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    // Get existing reference IDs
    const existingIds = scene.referenceElementIds
      ? typeof scene.referenceElementIds === 'string'
        ? JSON.parse(scene.referenceElementIds)
        : scene.referenceElementIds
      : [];

    // Remove the specified IDs
    const filteredIds = existingIds.filter((id: string) => !elementIds.includes(id));

    const updatedScene = await prisma.scene.update({
      where: { id: sceneId },
      data: {
        referenceElementIds: JSON.stringify(filteredIds),
      },
    });

    res.json(parseSceneJsonFields(updatedScene));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove scene references' });
  }
};
