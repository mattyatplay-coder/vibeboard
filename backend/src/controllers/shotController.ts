/**
 * Shot Controller - Phase 4B: Shot Studio (Production)
 *
 * Routes generation requests to either:
 * - SPATIA: 3D-aware engine for locked virtual sets with consistent geometry
 * - RECO: Precise 2D compositional control via bounding box regions
 * - Standard: Fallback to Wan/Flux 2D generation
 */

import { Request, Response } from 'express';
import { gpuWorkerClient } from '../services/gpu/GPUWorkerClient';
import { prisma } from '../prisma';
import { GenerationService } from '../services/GenerationService';

export const shotController = {
  /**
   * Main Generation Endpoint - Dispatches to 3D (Spatia) or 2D engine
   * POST /api/projects/:projectId/shot-studio/generate
   */
  generateShot: async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const {
        prompt,
        negativePrompt,
        selectedLocationId,
        blockingRegions, // ReCo bounding box data
        cameraPath, // InfCam/Spatia trajectory data
        mode = 'text_to_image',
        aspectRatio = '16:9',
        duration,
        engine = 'fal',
        falModel,
        loras,
        elementReferences,
        seed,
        guidanceScale,
        inferenceSteps,
      } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      // --- 1. SPATIA Dispatch (3D-Aware Generation) ---
      if (selectedLocationId) {
        const location = await prisma.element.findUnique({
          where: { id: selectedLocationId },
        });

        if (!location) {
          return res.status(404).json({ error: 'Location asset not found' });
        }

        console.log(`[ShotStudio] Dispatching to SPATIA for location: ${location.name}`);

        // Build metadata JSON with all extra fields
        const spatiaMetadata = {
          engine: 'spatia',
          locationId: selectedLocationId,
          locationName: location.name,
          blockingRegions,
          cameraPath,
          negativePrompt,
          duration: duration ? parseFloat(duration) : undefined,
        };

        // Create generation record first
        const generation = await prisma.generation.create({
          data: {
            projectId,
            inputPrompt: prompt,
            status: 'queued',
            mode: 'spatia',
            aspectRatio,
            // Store extra data in tags as JSON (using available field)
            tags: JSON.stringify(spatiaMetadata),
          },
        });

        // Execute Spatia generation
        const result = await gpuWorkerClient.generateShotSpatia({
          prompt,
          negativePrompt,
          locationId: selectedLocationId,
          locationUrl: location.fileUrl,
          cameraPath,
          blockingRegions,
          aspectRatio,
          duration,
        });

        if (result.success) {
          // Update generation with result
          await prisma.generation.update({
            where: { id: generation.id },
            data: {
              status: 'succeeded',
              outputs: result.outputUrl ? JSON.stringify([result.outputUrl]) : undefined,
              tags: JSON.stringify({
                ...spatiaMetadata,
                processingTimeMs: result.processingTimeMs,
                spatiaMetadata: result.metadata,
              }),
            },
          });

          return res.status(201).json({
            success: true,
            message: 'Spatia generation complete',
            generationId: generation.id,
            outputUrl: result.outputUrl,
          });
        } else {
          await prisma.generation.update({
            where: { id: generation.id },
            data: {
              status: 'failed',
              failureReason: result.error || 'Spatia generation failed',
            },
          });

          return res.status(500).json({
            success: false,
            error: result.error || 'Spatia generation failed',
            generationId: generation.id,
          });
        }
      }

      // --- 2. ReCo Dispatch (2D with Compositional Control) ---
      if (blockingRegions && blockingRegions.length > 0) {
        console.log(`[ShotStudio] Dispatching to ReCo with ${blockingRegions.length} regions`);

        const recoMetadata = {
          engine: 'reco',
          blockingRegions,
          negativePrompt,
        };

        const generation = await prisma.generation.create({
          data: {
            projectId,
            inputPrompt: prompt,
            status: 'queued',
            mode: 'reco',
            aspectRatio,
            tags: JSON.stringify(recoMetadata),
          },
        });

        const result = await gpuWorkerClient.generateWithReCo({
          prompt,
          negativePrompt,
          blockingRegions,
          aspectRatio,
        });

        if (result.success) {
          await prisma.generation.update({
            where: { id: generation.id },
            data: {
              status: 'succeeded',
              outputs: result.outputUrl ? JSON.stringify([result.outputUrl]) : undefined,
              tags: JSON.stringify({
                ...recoMetadata,
                processingTimeMs: result.processingTimeMs,
              }),
            },
          });

          return res.status(201).json({
            success: true,
            message: 'ReCo generation complete',
            generationId: generation.id,
            outputUrl: result.outputUrl,
          });
        } else {
          await prisma.generation.update({
            where: { id: generation.id },
            data: {
              status: 'failed',
              failureReason: result.error || 'ReCo generation failed',
            },
          });

          return res.status(500).json({
            success: false,
            error: result.error || 'ReCo generation failed',
            generationId: generation.id,
          });
        }
      }

      // --- 3. Standard 2D Generation (Fallback) ---
      console.log('[ShotStudio] Dispatching to standard 2D engine (Wan/Flux)');

      const service = new GenerationService(engine);
      const result = await service.generateImage({
        prompt,
        negativePrompt,
        aspectRatio,
        duration,
        model: falModel,
        loras,
        seed,
        guidanceScale,
        steps: inferenceSteps,
      });

      // Store extra metadata in tags field
      const standardMetadata = {
        engine,
        model: falModel,
        negativePrompt,
        duration: duration ? parseFloat(duration) : undefined,
      };

      // Create generation record
      const generation = await prisma.generation.create({
        data: {
          projectId,
          inputPrompt: prompt,
          status: result.status,
          mode,
          aspectRatio,
          outputs: result.outputs ? JSON.stringify(result.outputs) : undefined,
          provider: result.provider,
          tags: JSON.stringify(standardMetadata),
        },
      });

      return res.status(201).json({
        success: result.status === 'succeeded',
        message: '2D generation complete',
        generationId: generation.id,
        outputUrl: result.outputs?.[0],
        outputUrls: result.outputs,
      });
    } catch (error) {
      console.error('[ShotStudio] Generation failed:', error);
      return res.status(500).json({
        error: 'Shot generation failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },

  /**
   * List available Spatia locations (Asset Bin elements tagged as 'location')
   * GET /api/projects/:projectId/shot-studio/locations
   */
  listSpatiaLocations: async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;

      // Find elements that are locations (type = 'location' or tagged as location)
      const locations = await prisma.element.findMany({
        where: {
          projectId,
          OR: [
            { type: 'location' },
            { type: '3d_model' },
            {
              metadata: {
                contains: '"isLocation":true',
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          type: true,
          fileUrl: true,
          metadata: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Transform for frontend
      const transformedLocations = locations.map(loc => {
        let parsedMetadata: Record<string, unknown> = {};
        if (loc.metadata) {
          try {
            parsedMetadata = JSON.parse(loc.metadata);
          } catch {
            // Ignore parse errors
          }
        }

        return {
          id: loc.id,
          name: loc.name,
          type: loc.type,
          thumbnail: loc.fileUrl, // Use fileUrl as thumbnail
          isLocked: Boolean(parsedMetadata.isLocked),
          metadata: loc.metadata,
        };
      });

      return res.json({
        locations: transformedLocations,
        count: transformedLocations.length,
      });
    } catch (error) {
      console.error('[ShotStudio] listSpatiaLocations error:', error);
      return res.status(500).json({
        error: 'Failed to list locations',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },

  /**
   * Lock a location for consistent generation
   * POST /api/projects/:projectId/shot-studio/locations/:locationId/lock
   */
  lockLocation: async (req: Request, res: Response) => {
    try {
      const { locationId } = req.params;

      const element = await prisma.element.findUnique({
        where: { id: locationId },
      });

      if (!element) {
        return res.status(404).json({ error: 'Location not found' });
      }

      let existingMetadata: Record<string, unknown> = {};
      if (element.metadata) {
        try {
          existingMetadata = JSON.parse(element.metadata);
        } catch {
          // Ignore parse errors
        }
      }

      await prisma.element.update({
        where: { id: locationId },
        data: {
          metadata: JSON.stringify({
            ...existingMetadata,
            isLocation: true,
            isLocked: true,
            lockedAt: new Date().toISOString(),
          }),
        },
      });

      return res.json({
        success: true,
        message: 'Location locked for consistent generation',
      });
    } catch (error) {
      console.error('[ShotStudio] lockLocation error:', error);
      return res.status(500).json({
        error: 'Failed to lock location',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },

  /**
   * Unlock a location
   * POST /api/projects/:projectId/shot-studio/locations/:locationId/unlock
   */
  unlockLocation: async (req: Request, res: Response) => {
    try {
      const { locationId } = req.params;

      const element = await prisma.element.findUnique({
        where: { id: locationId },
      });

      if (!element) {
        return res.status(404).json({ error: 'Location not found' });
      }

      let existingMetadata: Record<string, unknown> = {};
      if (element.metadata) {
        try {
          existingMetadata = JSON.parse(element.metadata);
        } catch {
          // Ignore parse errors
        }
      }

      await prisma.element.update({
        where: { id: locationId },
        data: {
          metadata: JSON.stringify({
            ...existingMetadata,
            isLocked: false,
            unlockedAt: new Date().toISOString(),
          }),
        },
      });

      return res.json({
        success: true,
        message: 'Location unlocked',
      });
    } catch (error) {
      console.error('[ShotStudio] unlockLocation error:', error);
      return res.status(500).json({
        error: 'Failed to unlock location',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
