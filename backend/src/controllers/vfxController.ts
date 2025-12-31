/**
 * VFX Controller - Phase 5: Post-Production & VFX Suite
 *
 * Implements the "Finishing and Repair" tools for fixing problems and perfecting shots:
 * - Virtual Reshoot (InfCam): Re-renders video with new camera path
 * - Focus Rescue (DiffCamera): AI-powered deblurring and sharpening
 * - Motion Fix: Stabilization and speed adjustments
 * - Artifact Cleanup: AI-powered glitch and artifact removal
 */

import { Request, Response } from 'express';
import { gpuWorkerClient } from '../services/gpu/GPUWorkerClient';
import { prisma } from '../prisma';

// Types for VFX operations
export interface CameraPathKeyframe {
  time: number; // Time in seconds
  position: [number, number, number]; // [x, y, z]
  rotation: [number, number, number]; // [pitch, yaw, roll]
  fov?: number; // Field of view override
}

export interface VirtualReshootParams {
  videoUrl: string;
  cameraPath: {
    keyframes: CameraPathKeyframe[];
    interpolation?: 'linear' | 'bezier' | 'catmull-rom';
  };
  aspectRatio?: string;
  outputFps?: number;
  preserveSubject?: boolean; // Lock subject while moving camera
  motionBlur?: number; // 0-1 for motion blur amount
}

export interface FocusRescueParams {
  videoUrl?: string;
  imageUrl?: string;
  targetRegion?: [number, number, number, number]; // [x, y, width, height] as percentages
  sharpnessLevel?: 'subtle' | 'moderate' | 'aggressive';
  preserveBokeh?: boolean; // Keep intentional blur intact
  denoiseStrength?: number; // 0-1 for noise reduction
}

export interface MotionFixParams {
  videoUrl: string;
  stabilization?: 'none' | 'light' | 'standard' | 'cinematic';
  speedMultiplier?: number; // 0.25x to 4x
  interpolationMode?: 'blend' | 'optical_flow' | 'rife';
  targetFps?: number; // For frame interpolation
}

export interface ArtifactCleanupParams {
  videoUrl?: string;
  imageUrl?: string;
  artifactType?: 'auto' | 'flicker' | 'banding' | 'compression' | 'morph_glitch';
  strength?: number; // 0-1
  temporalConsistency?: boolean; // For video: maintain consistency across frames
}

export const vfxController = {
  /**
   * Virtual Reshoot - Re-render video with new camera trajectory
   * Uses InfCam for camera path-guided video regeneration
   * POST /api/projects/:projectId/vfx/reshoot
   */
  virtualReshoot: async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const {
        videoUrl,
        generationId,
        cameraPath,
        aspectRatio = '16:9',
        outputFps = 24,
        preserveSubject = true,
        motionBlur = 0.5,
      } = req.body;

      if (!videoUrl && !generationId) {
        return res.status(400).json({
          error: 'Either videoUrl or generationId is required',
        });
      }

      if (!cameraPath?.keyframes?.length) {
        return res.status(400).json({
          error: 'Camera path with at least one keyframe is required',
        });
      }

      // Resolve video URL from generation if needed
      let sourceVideoUrl = videoUrl;
      if (generationId && !videoUrl) {
        const generation = await prisma.generation.findUnique({
          where: { id: generationId },
        });
        if (!generation?.outputs) {
          return res.status(404).json({ error: 'Generation not found or has no outputs' });
        }
        const outputs = JSON.parse(generation.outputs);
        sourceVideoUrl = Array.isArray(outputs) ? outputs[0] : outputs;
      }

      console.log(
        `[VFX] Virtual Reshoot: ${cameraPath.keyframes.length} keyframes, preserve subject: ${preserveSubject}`
      );

      // Create VFX job record
      const vfxJob = await prisma.generation.create({
        data: {
          projectId,
          inputPrompt: `Virtual Reshoot: ${cameraPath.keyframes.length} keyframe camera path`,
          status: 'queued',
          mode: 'vfx_reshoot',
          aspectRatio,
          tags: JSON.stringify({
            type: 'virtual_reshoot',
            sourceVideoUrl,
            cameraPath,
            outputFps,
            preserveSubject,
            motionBlur,
          }),
        },
      });

      // Execute InfCam reshoot via GPU worker
      const result = await gpuWorkerClient.executeVFX('infcam_reshoot', {
        video_url: sourceVideoUrl,
        camera_path: cameraPath,
        aspect_ratio: aspectRatio,
        output_fps: outputFps,
        preserve_subject: preserveSubject,
        motion_blur: motionBlur,
      });

      if (result.success) {
        await prisma.generation.update({
          where: { id: vfxJob.id },
          data: {
            status: 'succeeded',
            outputs: result.outputUrl ? JSON.stringify([result.outputUrl]) : undefined,
            inferenceTime: result.processingTimeMs,
          },
        });

        return res.status(201).json({
          success: true,
          message: 'Virtual reshoot complete',
          jobId: vfxJob.id,
          outputUrl: result.outputUrl,
          processingTimeMs: result.processingTimeMs,
        });
      } else {
        await prisma.generation.update({
          where: { id: vfxJob.id },
          data: {
            status: 'failed',
            failureReason: result.error || 'InfCam reshoot failed',
          },
        });

        return res.status(500).json({
          success: false,
          error: result.error || 'Virtual reshoot failed',
          jobId: vfxJob.id,
        });
      }
    } catch (error) {
      console.error('[VFX] Virtual Reshoot failed:', error);
      return res.status(500).json({
        error: 'Virtual reshoot failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },

  /**
   * Focus Rescue - AI-powered deblurring and sharpening
   * Uses DiffCamera for intelligent focus enhancement
   * POST /api/projects/:projectId/vfx/rescue-focus
   */
  rescueFocus: async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const {
        videoUrl,
        imageUrl,
        generationId,
        targetRegion,
        sharpnessLevel = 'moderate',
        preserveBokeh = true,
        denoiseStrength = 0.3,
      } = req.body;

      // Determine source
      let sourceUrl = videoUrl || imageUrl;
      let isVideo = !!videoUrl;

      if (generationId && !sourceUrl) {
        const generation = await prisma.generation.findUnique({
          where: { id: generationId },
        });
        if (!generation?.outputs) {
          return res.status(404).json({ error: 'Generation not found or has no outputs' });
        }
        const outputs = JSON.parse(generation.outputs);
        sourceUrl = Array.isArray(outputs) ? outputs[0] : outputs;
        isVideo = generation.mode?.includes('video') || sourceUrl?.includes('.mp4');
      }

      if (!sourceUrl) {
        return res.status(400).json({
          error: 'Either videoUrl, imageUrl, or generationId is required',
        });
      }

      // Map sharpness level to strength value
      const strengthMap: Record<string, number> = { subtle: 0.3, moderate: 0.6, aggressive: 0.9 };
      const sharpnessStrength = strengthMap[sharpnessLevel] || 0.6;

      console.log(
        `[VFX] Focus Rescue: ${sharpnessLevel} sharpening, preserve bokeh: ${preserveBokeh}`
      );

      // Create VFX job record
      const vfxJob = await prisma.generation.create({
        data: {
          projectId,
          inputPrompt: `Focus Rescue: ${sharpnessLevel} sharpening`,
          status: 'queued',
          mode: isVideo ? 'vfx_focus_video' : 'vfx_focus_image',
          tags: JSON.stringify({
            type: 'focus_rescue',
            sourceUrl,
            isVideo,
            sharpnessLevel,
            preserveBokeh,
            denoiseStrength,
            targetRegion,
          }),
        },
      });

      // Execute DiffCamera focus rescue via GPU worker
      const result = await gpuWorkerClient.executeVFX('diffcamera_focus', {
        source_url: sourceUrl,
        is_video: isVideo,
        target_region: targetRegion,
        sharpness_strength: sharpnessStrength,
        preserve_bokeh: preserveBokeh,
        denoise_strength: denoiseStrength,
      });

      if (result.success) {
        await prisma.generation.update({
          where: { id: vfxJob.id },
          data: {
            status: 'succeeded',
            outputs: result.outputUrl ? JSON.stringify([result.outputUrl]) : undefined,
            inferenceTime: result.processingTimeMs,
          },
        });

        return res.status(201).json({
          success: true,
          message: 'Focus rescue complete',
          jobId: vfxJob.id,
          outputUrl: result.outputUrl,
          processingTimeMs: result.processingTimeMs,
        });
      } else {
        await prisma.generation.update({
          where: { id: vfxJob.id },
          data: {
            status: 'failed',
            failureReason: result.error || 'DiffCamera focus rescue failed',
          },
        });

        return res.status(500).json({
          success: false,
          error: result.error || 'Focus rescue failed',
          jobId: vfxJob.id,
        });
      }
    } catch (error) {
      console.error('[VFX] Focus Rescue failed:', error);
      return res.status(500).json({
        error: 'Focus rescue failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },

  /**
   * Motion Fix - Stabilization and speed adjustments
   * POST /api/projects/:projectId/vfx/motion-fix
   */
  motionFix: async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const {
        videoUrl,
        generationId,
        stabilization = 'standard',
        speedMultiplier = 1.0,
        interpolationMode = 'optical_flow',
        targetFps,
      } = req.body;

      let sourceVideoUrl = videoUrl;
      if (generationId && !videoUrl) {
        const generation = await prisma.generation.findUnique({
          where: { id: generationId },
        });
        if (!generation?.outputs) {
          return res.status(404).json({ error: 'Generation not found or has no outputs' });
        }
        const outputs = JSON.parse(generation.outputs);
        sourceVideoUrl = Array.isArray(outputs) ? outputs[0] : outputs;
      }

      if (!sourceVideoUrl) {
        return res.status(400).json({
          error: 'Either videoUrl or generationId is required',
        });
      }

      console.log(`[VFX] Motion Fix: ${stabilization} stabilization, ${speedMultiplier}x speed`);

      const vfxJob = await prisma.generation.create({
        data: {
          projectId,
          inputPrompt: `Motion Fix: ${stabilization} stabilization, ${speedMultiplier}x speed`,
          status: 'queued',
          mode: 'vfx_motion',
          tags: JSON.stringify({
            type: 'motion_fix',
            sourceVideoUrl,
            stabilization,
            speedMultiplier,
            interpolationMode,
            targetFps,
          }),
        },
      });

      // Execute motion fix via GPU worker (uses RIFE for interpolation)
      const result = await gpuWorkerClient.executeVFX('motion_fix', {
        video_url: sourceVideoUrl,
        stabilization,
        speed_multiplier: speedMultiplier,
        interpolation_mode: interpolationMode,
        target_fps: targetFps,
      });

      if (result.success) {
        await prisma.generation.update({
          where: { id: vfxJob.id },
          data: {
            status: 'succeeded',
            outputs: result.outputUrl ? JSON.stringify([result.outputUrl]) : undefined,
            inferenceTime: result.processingTimeMs,
          },
        });

        return res.status(201).json({
          success: true,
          message: 'Motion fix complete',
          jobId: vfxJob.id,
          outputUrl: result.outputUrl,
          processingTimeMs: result.processingTimeMs,
        });
      } else {
        await prisma.generation.update({
          where: { id: vfxJob.id },
          data: {
            status: 'failed',
            failureReason: result.error || 'Motion fix failed',
          },
        });

        return res.status(500).json({
          success: false,
          error: result.error || 'Motion fix failed',
          jobId: vfxJob.id,
        });
      }
    } catch (error) {
      console.error('[VFX] Motion Fix failed:', error);
      return res.status(500).json({
        error: 'Motion fix failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },

  /**
   * Artifact Cleanup - AI-powered glitch and artifact removal
   * POST /api/projects/:projectId/vfx/cleanup
   */
  artifactCleanup: async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const {
        videoUrl,
        imageUrl,
        generationId,
        artifactType = 'auto',
        strength = 0.7,
        temporalConsistency = true,
      } = req.body;

      let sourceUrl = videoUrl || imageUrl;
      let isVideo = !!videoUrl;

      if (generationId && !sourceUrl) {
        const generation = await prisma.generation.findUnique({
          where: { id: generationId },
        });
        if (!generation?.outputs) {
          return res.status(404).json({ error: 'Generation not found or has no outputs' });
        }
        const outputs = JSON.parse(generation.outputs);
        sourceUrl = Array.isArray(outputs) ? outputs[0] : outputs;
        isVideo = generation.mode?.includes('video') || sourceUrl?.includes('.mp4');
      }

      if (!sourceUrl) {
        return res.status(400).json({
          error: 'Either videoUrl, imageUrl, or generationId is required',
        });
      }

      console.log(`[VFX] Artifact Cleanup: ${artifactType} detection, strength ${strength}`);

      const vfxJob = await prisma.generation.create({
        data: {
          projectId,
          inputPrompt: `Artifact Cleanup: ${artifactType} removal`,
          status: 'queued',
          mode: isVideo ? 'vfx_cleanup_video' : 'vfx_cleanup_image',
          tags: JSON.stringify({
            type: 'artifact_cleanup',
            sourceUrl,
            isVideo,
            artifactType,
            strength,
            temporalConsistency,
          }),
        },
      });

      // Execute artifact cleanup via GPU worker
      const result = await gpuWorkerClient.executeVFX('artifact_cleanup', {
        source_url: sourceUrl,
        is_video: isVideo,
        artifact_type: artifactType,
        strength,
        temporal_consistency: temporalConsistency,
      });

      if (result.success) {
        await prisma.generation.update({
          where: { id: vfxJob.id },
          data: {
            status: 'succeeded',
            outputs: result.outputUrl ? JSON.stringify([result.outputUrl]) : undefined,
            inferenceTime: result.processingTimeMs,
          },
        });

        return res.status(201).json({
          success: true,
          message: 'Artifact cleanup complete',
          jobId: vfxJob.id,
          outputUrl: result.outputUrl,
          processingTimeMs: result.processingTimeMs,
        });
      } else {
        await prisma.generation.update({
          where: { id: vfxJob.id },
          data: {
            status: 'failed',
            failureReason: result.error || 'Artifact cleanup failed',
          },
        });

        return res.status(500).json({
          success: false,
          error: result.error || 'Artifact cleanup failed',
          jobId: vfxJob.id,
        });
      }
    } catch (error) {
      console.error('[VFX] Artifact Cleanup failed:', error);
      return res.status(500).json({
        error: 'Artifact cleanup failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },

  /**
   * Get VFX job status
   * GET /api/projects/:projectId/vfx/jobs/:jobId
   */
  getJobStatus: async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;

      const job = await prisma.generation.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        return res.status(404).json({ error: 'VFX job not found' });
      }

      let parsedTags: Record<string, unknown> = {};
      if (job.tags) {
        try {
          parsedTags = JSON.parse(job.tags);
        } catch {
          // Ignore parse errors
        }
      }

      let outputs: string[] = [];
      if (job.outputs) {
        try {
          outputs = JSON.parse(job.outputs);
        } catch {
          outputs = [job.outputs];
        }
      }

      return res.json({
        id: job.id,
        status: job.status,
        type: parsedTags.type,
        mode: job.mode,
        outputs,
        failureReason: job.failureReason,
        processingTimeMs: job.inferenceTime,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      });
    } catch (error) {
      console.error('[VFX] Get job status failed:', error);
      return res.status(500).json({
        error: 'Failed to get job status',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },

  /**
   * List VFX jobs for a project
   * GET /api/projects/:projectId/vfx/jobs
   */
  listJobs: async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { type, status, limit = '50' } = req.query;

      const whereClause: Record<string, unknown> = {
        projectId,
        mode: { startsWith: 'vfx_' },
      };

      if (status) {
        whereClause.status = status;
      }

      const jobs = await prisma.generation.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        select: {
          id: true,
          status: true,
          mode: true,
          inputPrompt: true,
          outputs: true,
          failureReason: true,
          inferenceTime: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Filter by type if specified (from tags)
      let filteredJobs = jobs;
      if (type) {
        filteredJobs = jobs.filter(job => {
          try {
            const tags = JSON.parse(job.tags || '{}');
            return tags.type === type;
          } catch {
            return false;
          }
        });
      }

      return res.json({
        jobs: filteredJobs.map(job => ({
          id: job.id,
          status: job.status,
          mode: job.mode,
          description: job.inputPrompt,
          outputUrl: job.outputs ? JSON.parse(job.outputs)[0] : null,
          failureReason: job.failureReason,
          processingTimeMs: job.inferenceTime,
          createdAt: job.createdAt,
        })),
        count: filteredJobs.length,
      });
    } catch (error) {
      console.error('[VFX] List jobs failed:', error);
      return res.status(500).json({
        error: 'Failed to list VFX jobs',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
