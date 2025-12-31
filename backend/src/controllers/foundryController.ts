/**
 * Character Foundry Controller
 *
 * Handles AI-driven character performance generation:
 * - Audio-driven talking head (FlashPortrait)
 * - Expression transfer from driver videos
 * - Lip sync generation
 */

import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { gpuWorkerClient } from '../services/gpu/GPUWorkerClient';

export const foundryController = {
  /**
   * Generate an AI Performance (Talking Head)
   * Input: Character Image + Audio
   * Output: Video URL (stored in Generation record)
   *
   * POST /api/projects/:projectId/foundry/performance
   */
  generatePerformance: async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { characterId, audioId, driverVideoId, lipSyncStrength, enhanceFace } = req.body;

      if (!characterId || !audioId) {
        return res.status(400).json({ error: 'characterId and audioId are required' });
      }

      // 1. Fetch Assets
      const character = await prisma.element.findUnique({ where: { id: characterId } });
      const audio = await prisma.element.findUnique({ where: { id: audioId } });
      const driverVideo = driverVideoId
        ? await prisma.element.findUnique({ where: { id: driverVideoId } })
        : null;

      if (!character) {
        return res.status(404).json({ error: 'Character asset not found' });
      }
      if (!audio) {
        return res.status(404).json({ error: 'Audio asset not found' });
      }

      // Validate character has an image (Element only has fileUrl field)
      const characterUrl = character.fileUrl;
      if (!characterUrl) {
        return res.status(400).json({ error: 'Character asset has no image URL' });
      }

      // Validate audio has a file URL
      const audioUrl = audio.fileUrl;
      if (!audioUrl) {
        return res.status(400).json({ error: 'Audio asset has no file URL' });
      }

      console.log(`[Foundry] Starting Performance: ${character.name} + ${audio.name}`);

      // Store performance metadata in feedbackNotes as JSON
      const performanceMetadata = JSON.stringify({
        characterId,
        audioId,
        driverVideoId: driverVideoId || null,
        characterName: character.name,
        audioName: audio.name,
        model: 'flash-portrait',
      });

      // 2. Create Placeholder Generation (so the UI updates immediately)
      const generation = await prisma.generation.create({
        data: {
          projectId,
          mode: 'audio_to_video',
          inputPrompt: `Performance: ${character.name} speaking "${audio.name}"`,
          status: 'queued',
          engine: 'runpod',
          name: 'flash-portrait', // Store model name here
          aspectRatio: '1:1',
          feedbackNotes: performanceMetadata, // Store metadata in feedbackNotes
        },
      });

      console.log(`[Foundry] Created generation record: ${generation.id}`);

      // 3. Send to GPU Worker (Async - don't await full completion)
      gpuWorkerClient
        .generatePerformance({
          imageUrl: characterUrl,
          audioUrl: audioUrl,
          driverVideoUrl: driverVideo?.fileUrl,
          enhanceFace: enhanceFace ?? true,
          lipSyncStrength: lipSyncStrength ?? 0.8,
        })
        .then(async result => {
          if (result.success && result.outputUrl) {
            // Parse existing metadata and add processing time
            const existingMetadata = generation.feedbackNotes
              ? JSON.parse(generation.feedbackNotes)
              : {};
            const updatedMetadata = JSON.stringify({
              ...existingMetadata,
              processingTimeMs: result.processingTimeMs,
            });

            await prisma.generation.update({
              where: { id: generation.id },
              data: {
                status: 'succeeded',
                outputs: JSON.stringify([{ type: 'video', url: result.outputUrl }]),
                feedbackNotes: updatedMetadata,
              },
            });
            console.log(`[Foundry] Performance ${generation.id} succeeded: ${result.outputUrl}`);
          } else {
            await prisma.generation.update({
              where: { id: generation.id },
              data: {
                status: 'failed',
                failureReason: result.error || 'Unknown error from GPU worker',
              },
            });
            console.error(`[Foundry] Performance ${generation.id} failed:`, result.error);
          }
        })
        .catch(async err => {
          await prisma.generation.update({
            where: { id: generation.id },
            data: {
              status: 'failed',
              failureReason: err.message || 'GPU worker request failed',
            },
          });
          console.error(`[Foundry] Performance ${generation.id} error:`, err);
        });

      // 4. Return immediately with the generation record (client will poll for status)
      res.status(201).json({
        success: true,
        generation,
        message: 'Performance generation queued. Poll for status updates.',
      });
    } catch (error: unknown) {
      console.error('[Foundry] Performance generation failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'Failed to start performance generation', details: message });
    }
  },

  /**
   * List available characters for performance generation
   * GET /api/projects/:projectId/foundry/characters
   */
  listCharacters: async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;

      const characters = await prisma.element.findMany({
        where: {
          projectId,
          type: 'character',
          // Only include characters with images
          fileUrl: { not: '' },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ characters });
    } catch (error) {
      console.error('[Foundry] List characters failed:', error);
      res.status(500).json({ error: 'Failed to list characters' });
    }
  },

  /**
   * List available audio files for performance generation
   * GET /api/projects/:projectId/foundry/audio
   */
  listAudio: async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;

      const audioFiles = await prisma.element.findMany({
        where: {
          projectId,
          type: 'audio',
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ audioFiles });
    } catch (error) {
      console.error('[Foundry] List audio failed:', error);
      res.status(500).json({ error: 'Failed to list audio files' });
    }
  },

  /**
   * Get performance generation status
   * GET /api/projects/:projectId/foundry/performance/:generationId
   */
  getPerformanceStatus: async (req: Request, res: Response) => {
    try {
      const { generationId } = req.params;

      const generation = await prisma.generation.findUnique({
        where: { id: generationId },
      });

      if (!generation) {
        return res.status(404).json({ error: 'Generation not found' });
      }

      res.json({
        id: generation.id,
        status: generation.status,
        outputs: generation.outputs ? JSON.parse(generation.outputs as string) : null,
        failureReason: generation.failureReason,
        metadata: generation.feedbackNotes ? JSON.parse(generation.feedbackNotes as string) : null,
      });
    } catch (error) {
      console.error('[Foundry] Get performance status failed:', error);
      res.status(500).json({ error: 'Failed to get performance status' });
    }
  },
};

export default foundryController;
