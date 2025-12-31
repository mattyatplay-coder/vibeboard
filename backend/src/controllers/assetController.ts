/**
 * Asset Controller - Phase 3: Asset Bin
 *
 * Handles 3D scene deconstruction and PBR material extraction
 * via the GPU Worker (RunPod).
 */

import { Request, Response } from 'express';
import { prisma } from '../prisma';
import {
  gpuWorkerClient,
  SceneDeconstructResult,
  MaterialExtractResult,
} from '../services/gpu/GPUWorkerClient';

export const assetController = {
  /**
   * Deconstruct a 2D image into 3D assets
   * POST /api/projects/:projectId/assets/deconstruct
   *
   * Uses 3D-RE-GEN to convert 2D images into 3D Gaussian splats or meshes
   */
  deconstructScene: async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { elementId, outputFormat, qualityLevel } = req.body;

      if (!elementId) {
        return res.status(400).json({ error: 'elementId is required' });
      }

      // Fetch the source element
      const element = await prisma.element.findUnique({
        where: { id: elementId },
      });

      if (!element) {
        return res.status(404).json({ error: 'Element not found' });
      }

      if (!element.fileUrl) {
        return res.status(400).json({ error: 'Element has no file URL' });
      }

      // Mark element as processing
      const existingMetadata = element.metadata
        ? typeof element.metadata === 'string'
          ? JSON.parse(element.metadata)
          : element.metadata
        : {};

      await prisma.element.update({
        where: { id: elementId },
        data: {
          metadata: JSON.stringify({
            ...existingMetadata,
            deconstructStatus: 'processing',
            deconstructStartedAt: new Date().toISOString(),
          }),
        },
      });

      // Submit to GPU Worker (async - fire and forget with polling)
      console.log(`[AssetController] Starting scene deconstruction for element ${elementId}`);

      const result: SceneDeconstructResult = await gpuWorkerClient.deconstructScene({
        imageUrl: element.fileUrl,
        outputFormat: outputFormat || '3d_gaussian',
        qualityLevel: qualityLevel || 'standard',
      });

      if (result.success) {
        // Create new Elements for each 3D output
        const createdElements: string[] = [];

        // Create 3D Gaussian splat element
        if (result.gaussianUrl) {
          const gaussianElement = await prisma.element.create({
            data: {
              projectId,
              name: `${element.name}_3d_gaussian`,
              type: '3d_model',
              fileUrl: result.gaussianUrl,
              metadata: JSON.stringify({
                source: 'deconstruct',
                parentElementId: elementId,
                format: '3d_gaussian',
                objectCount: result.objectCount,
              }),
            },
          });
          createdElements.push(gaussianElement.id);
        }

        // Create mesh element
        if (result.meshUrl) {
          const meshElement = await prisma.element.create({
            data: {
              projectId,
              name: `${element.name}_mesh`,
              type: '3d_model',
              fileUrl: result.meshUrl,
              metadata: JSON.stringify({
                source: 'deconstruct',
                parentElementId: elementId,
                format: 'mesh',
              }),
            },
          });
          createdElements.push(meshElement.id);
        }

        // Create point cloud element
        if (result.pointCloudUrl) {
          const pointCloudElement = await prisma.element.create({
            data: {
              projectId,
              name: `${element.name}_point_cloud`,
              type: '3d_model',
              fileUrl: result.pointCloudUrl,
              metadata: JSON.stringify({
                source: 'deconstruct',
                parentElementId: elementId,
                format: 'point_cloud',
              }),
            },
          });
          createdElements.push(pointCloudElement.id);
        }

        // Update original element with completion status
        await prisma.element.update({
          where: { id: elementId },
          data: {
            metadata: JSON.stringify({
              ...existingMetadata,
              deconstructStatus: 'completed',
              deconstructCompletedAt: new Date().toISOString(),
              deconstructedElementIds: createdElements,
              objectCount: result.objectCount,
            }),
          },
        });

        return res.json({
          success: true,
          message: 'Scene deconstruction completed',
          createdElements,
          objectCount: result.objectCount,
        });
      } else {
        // Update element with failure status
        await prisma.element.update({
          where: { id: elementId },
          data: {
            metadata: JSON.stringify({
              ...existingMetadata,
              deconstructStatus: 'failed',
              deconstructError: result.error,
            }),
          },
        });

        return res.status(500).json({
          success: false,
          error: result.error || 'Scene deconstruction failed',
        });
      }
    } catch (error) {
      console.error('[AssetController] deconstructScene error:', error);
      return res.status(500).json({
        error: 'Internal server error during scene deconstruction',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },

  /**
   * Extract PBR material maps from a texture image
   * POST /api/projects/:projectId/assets/extract-materials
   *
   * Uses MVInverse to generate Albedo, Normal, Roughness, Metallic, AO, Height maps
   */
  extractMaterials: async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { elementId, materialType, resolution } = req.body;

      if (!elementId) {
        return res.status(400).json({ error: 'elementId is required' });
      }

      // Fetch the source element
      const element = await prisma.element.findUnique({
        where: { id: elementId },
      });

      if (!element) {
        return res.status(404).json({ error: 'Element not found' });
      }

      if (!element.fileUrl) {
        return res.status(400).json({ error: 'Element has no file URL' });
      }

      // Mark element as processing
      const existingMetadata = element.metadata
        ? typeof element.metadata === 'string'
          ? JSON.parse(element.metadata)
          : element.metadata
        : {};

      await prisma.element.update({
        where: { id: elementId },
        data: {
          metadata: JSON.stringify({
            ...existingMetadata,
            pbrExtractStatus: 'processing',
            pbrExtractStartedAt: new Date().toISOString(),
          }),
        },
      });

      console.log(`[AssetController] Starting PBR extraction for element ${elementId}`);

      const result: MaterialExtractResult = await gpuWorkerClient.extractMaterials({
        imageUrl: element.fileUrl,
        materialType: materialType || 'auto',
        resolution: resolution || 1024,
      });

      if (result.success) {
        // Build PBR maps object
        const pbrMaps: Record<string, string> = {};
        if (result.albedoUrl) pbrMaps.albedo = result.albedoUrl;
        if (result.normalUrl) pbrMaps.normal = result.normalUrl;
        if (result.roughnessUrl) pbrMaps.roughness = result.roughnessUrl;
        if (result.metallicUrl) pbrMaps.metallic = result.metallicUrl;
        if (result.aoUrl) pbrMaps.ao = result.aoUrl;
        if (result.heightUrl) pbrMaps.height = result.heightUrl;

        // Update element with PBR maps
        await prisma.element.update({
          where: { id: elementId },
          data: {
            metadata: JSON.stringify({
              ...existingMetadata,
              pbrExtractStatus: 'completed',
              pbrExtractCompletedAt: new Date().toISOString(),
              pbrMaps,
              materialType: materialType || 'auto',
              resolution: resolution || 1024,
            }),
          },
        });

        return res.json({
          success: true,
          message: 'Material extraction completed',
          pbrMaps,
        });
      } else {
        // Update element with failure status
        await prisma.element.update({
          where: { id: elementId },
          data: {
            metadata: JSON.stringify({
              ...existingMetadata,
              pbrExtractStatus: 'failed',
              pbrExtractError: result.error,
            }),
          },
        });

        return res.status(500).json({
          success: false,
          error: result.error || 'Material extraction failed',
        });
      }
    } catch (error) {
      console.error('[AssetController] extractMaterials error:', error);
      return res.status(500).json({
        error: 'Internal server error during material extraction',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },

  /**
   * Get deconstruction/extraction status for an element
   * GET /api/projects/:projectId/assets/:elementId/status
   */
  getAssetStatus: async (req: Request, res: Response) => {
    try {
      const { elementId } = req.params;

      const element = await prisma.element.findUnique({
        where: { id: elementId },
      });

      if (!element) {
        return res.status(404).json({ error: 'Element not found' });
      }

      const metadata = element.metadata
        ? typeof element.metadata === 'string'
          ? JSON.parse(element.metadata)
          : element.metadata
        : {};

      return res.json({
        elementId,
        deconstructStatus: metadata.deconstructStatus || null,
        deconstructedElementIds: metadata.deconstructedElementIds || [],
        objectCount: metadata.objectCount || null,
        pbrExtractStatus: metadata.pbrExtractStatus || null,
        pbrMaps: metadata.pbrMaps || null,
      });
    } catch (error) {
      console.error('[AssetController] getAssetStatus error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },

  /**
   * Get child elements created from deconstruction
   * GET /api/projects/:projectId/assets/:elementId/children
   */
  getDeconstructedChildren: async (req: Request, res: Response) => {
    try {
      const { projectId, elementId } = req.params;

      // Find elements whose metadata indicates they were created from this parent
      const children = await prisma.element.findMany({
        where: {
          projectId,
          metadata: {
            contains: `"parentElementId":"${elementId}"`,
          },
        },
      });

      return res.json({
        parentElementId: elementId,
        children: children.map(child => ({
          id: child.id,
          name: child.name,
          type: child.type,
          fileUrl: child.fileUrl,
          metadata:
            typeof child.metadata === 'string' ? JSON.parse(child.metadata) : child.metadata,
        })),
      });
    } catch (error) {
      console.error('[AssetController] getDeconstructedChildren error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
