/**
 * Sequencer Routes - Phase 5: Final Assembly & Export
 *
 * Endpoints for the final editing and delivery pipeline:
 * - Timeline assembly with L-Cut/J-Cut support
 * - Caption/subtitle generation via MiniMax M2.1
 * - Final FFmpeg bake with NLE-compatible output
 * - EPK (Electronic Press Kit) export
 */

import { Router } from 'express';
import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { MasterExportService } from '../services/export/MasterExportService';
import { LLMService } from '../services/LLMService';

const router = Router({ mergeParams: true });

// Initialize services
const masterExportService = MasterExportService.getInstance();

/**
 * Get timeline data for a scene chain
 * GET /api/projects/:projectId/sequencer/timeline/:sceneChainId
 */
router.get('/timeline/:sceneChainId', async (req: Request, res: Response) => {
  try {
    const { projectId, sceneChainId } = req.params;

    const sceneChain = await prisma.sceneChain.findFirst({
      where: {
        id: sceneChainId,
        projectId,
      },
      include: {
        segments: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!sceneChain) {
      return res.status(404).json({ error: 'Scene chain not found' });
    }

    // Transform segments to timeline clips
    const clips = sceneChain.segments.map((segment, index) => {
      return {
        id: segment.id,
        name: segment.prompt?.substring(0, 50) || `Shot ${index + 1}`,
        orderIndex: segment.orderIndex,
        duration: segment.duration || 4,
        trimStart: segment.trimStart || 0,
        trimEnd: segment.trimEnd || segment.duration || 4,
        audioTrimStart: segment.audioTrimStart || 0,
        audioTrimEnd: segment.audioTrimEnd || segment.duration || 4,
        audioGain: segment.audioGain || 1.0,
        avLinked: true, // Default to linked A/V
        videoUrl: segment.outputUrl,
        audioUrl: segment.sourceUrl, // Use sourceUrl for audio if available
        firstFrameUrl: segment.firstFrameUrl,
        lastFrameUrl: segment.lastFrameUrl,
        status: segment.status,
        prompt: segment.prompt,
      };
    });

    // Calculate total duration
    const totalDuration = clips.reduce((sum, clip) => {
      const clipDuration = (clip.trimEnd || clip.duration) - (clip.trimStart || 0);
      return sum + clipDuration;
    }, 0);

    return res.json({
      sceneChainId,
      name: sceneChain.name,
      clips,
      totalDuration,
      clipCount: clips.length,
    });
  } catch (error) {
    console.error('[Sequencer] Get timeline failed:', error);
    return res.status(500).json({
      error: 'Failed to get timeline',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Generate captions/subtitles for timeline using MiniMax M2.1
 * POST /api/projects/:projectId/sequencer/generate-captions
 */
router.post('/generate-captions', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const {
      sceneChainId,
      language = 'en',
      style = 'standard', // 'standard', 'dramatic', 'minimal'
      includeTimecodes = true,
    } = req.body;

    if (!sceneChainId) {
      return res.status(400).json({ error: 'sceneChainId is required' });
    }

    // Get scene chain with segments
    const sceneChain = await prisma.sceneChain.findFirst({
      where: { id: sceneChainId, projectId },
      include: {
        segments: {
          orderBy: { orderIndex: 'asc' },
          where: { status: 'complete' },
        },
      },
    });

    if (!sceneChain) {
      return res.status(404).json({ error: 'Scene chain not found' });
    }

    // Build context for caption generation
    const segmentDescriptions = sceneChain.segments.map((seg, i) => {
      const startTime = sceneChain.segments.slice(0, i).reduce((sum, s) => {
        const duration = (s.trimEnd || s.duration || 4) - (s.trimStart || 0);
        return sum + duration;
      }, 0);

      const duration = (seg.trimEnd || seg.duration || 4) - (seg.trimStart || 0);

      return {
        index: i + 1,
        prompt: seg.prompt,
        startTime: startTime.toFixed(2),
        endTime: (startTime + duration).toFixed(2),
        duration: duration.toFixed(2),
        hasAudio: !!seg.sourceUrl, // Use sourceUrl to check for audio
      };
    });

    // Generate captions using LLM
    const llm = new LLMService('grok');
    const styleGuide = {
      standard: 'Write clear, descriptive captions that explain what is happening in each shot.',
      dramatic:
        'Write evocative, cinematic captions with dramatic flair suitable for a film trailer.',
      minimal: 'Write minimal, sparse captions with only essential information.',
    };

    const captionPrompt = `Generate ${style} subtitles/captions for a video sequence.

Timeline segments:
${segmentDescriptions
  .map(
    s => `
Shot ${s.index} (${s.startTime}s - ${s.endTime}s): "${s.prompt}"
${s.hasAudio ? '(Has audio)' : '(Visual only)'}
`
  )
  .join('\n')}

Style guidance: ${styleGuide[style as keyof typeof styleGuide] || styleGuide.standard}

Generate SRT format captions with:
1. Sequential numbers
2. Timecodes in format HH:MM:SS,mmm --> HH:MM:SS,mmm
3. Caption text (max 2 lines per caption)

Output ONLY the SRT content, no additional explanation.`;

    const { content } = await llm.generate({
      prompt: captionPrompt,
      temperature: 0.7,
    });

    // Parse and validate SRT content
    const srtContent = content.trim();
    const captions = parseSRT(srtContent);

    return res.json({
      success: true,
      sceneChainId,
      language,
      style,
      srtContent,
      captions,
      captionCount: captions.length,
    });
  } catch (error) {
    console.error('[Sequencer] Generate captions failed:', error);
    return res.status(500).json({
      error: 'Failed to generate captions',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Export final video with FFmpeg bake
 * POST /api/projects/:projectId/sequencer/export-final
 */
router.post('/export-final', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const {
      sceneChainId,
      exportName,
      format = 'h264', // 'h264', 'prores422', 'prores4444'
      frameRate = 24,
      resolution, // e.g., '1920x1080'
      audioCodec = 'aac', // 'aac', 'pcm'
      includeEDL = true,
      includeSidecar = true,
      includeCaptions = false,
      captionsLanguage = 'en',
    } = req.body;

    if (!sceneChainId) {
      return res.status(400).json({ error: 'sceneChainId is required' });
    }

    // Get scene chain with segments
    const sceneChain = await prisma.sceneChain.findFirst({
      where: { id: sceneChainId, projectId },
      include: {
        segments: {
          orderBy: { orderIndex: 'asc' },
          where: { status: 'complete' },
        },
      },
    });

    if (!sceneChain) {
      return res.status(404).json({ error: 'Scene chain not found' });
    }

    if (sceneChain.segments.length === 0) {
      return res.status(400).json({ error: 'Scene chain has no completed segments' });
    }

    // Build clips for export service
    const clips = sceneChain.segments.map(segment => {
      return {
        id: segment.id,
        name: segment.prompt?.substring(0, 50) || `Shot ${segment.orderIndex + 1}`,
        videoPath: segment.outputUrl || '',
        audioPath: segment.sourceUrl || undefined, // Use sourceUrl for audio
        duration: segment.duration || 4,
        trimStart: segment.trimStart || 0,
        trimEnd: segment.trimEnd || segment.duration || 4,
        audioTrimStart: segment.audioTrimStart || 0,
        audioTrimEnd: segment.audioTrimEnd || segment.duration || 4,
        audioGain: segment.audioGain || 1.0,
        avLinked: true, // Default to linked
        prompt: segment.prompt || undefined,
      };
    });

    console.log(
      `[Sequencer] Exporting ${clips.length} clips, format: ${format}, fps: ${frameRate}`
    );

    // Execute bake
    const result = await masterExportService.bakeTimeline(clips, {
      projectId,
      sceneChainId,
      exportName,
      format: format as 'h264' | 'prores422' | 'prores4444',
      frameRate,
      resolution,
      audioCodec: audioCodec as 'aac' | 'pcm',
      includeEDL,
      includeSidecar,
    });

    // Update scene chain with export info
    await prisma.sceneChain.update({
      where: { id: sceneChainId },
      data: {
        updatedAt: new Date(),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Final export complete',
      exportId: result.exportId,
      videoPath: result.videoPath,
      duration: result.duration,
      clipCount: result.clipCount,
      edlPath: result.edlPath,
      sidecarPath: result.sidecarPath,
    });
  } catch (error) {
    console.error('[Sequencer] Export final failed:', error);
    return res.status(500).json({
      error: 'Failed to export final video',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Generate EPK (Electronic Press Kit) export
 * POST /api/projects/:projectId/sequencer/export-epk
 */
router.post('/export-epk', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const {
      sceneChainId,
      title,
      synopsis,
      credits,
      includeStills = true,
      includeBehindTheScenes = false,
    } = req.body;

    if (!sceneChainId) {
      return res.status(400).json({ error: 'sceneChainId is required' });
    }

    const sceneChain = await prisma.sceneChain.findFirst({
      where: { id: sceneChainId, projectId },
      include: {
        segments: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!sceneChain) {
      return res.status(404).json({ error: 'Scene chain not found' });
    }

    // Calculate continuity scores
    const continuityScores = sceneChain.segments.map((seg, i, arr) => {
      let score = 0;
      if (seg.firstFrameUrl) score += 25;
      if (seg.lastFrameUrl) score += 25;
      if (i > 0 && arr[i - 1].lastFrameUrl === seg.firstFrameUrl) score += 25;
      if (i < arr.length - 1 && seg.lastFrameUrl === arr[i + 1].firstFrameUrl) score += 25;
      return {
        segmentId: seg.id,
        orderIndex: seg.orderIndex,
        score,
        hasFirstFrame: !!seg.firstFrameUrl,
        hasLastFrame: !!seg.lastFrameUrl,
        linkedToPrev: i > 0 && !!arr[i - 1].lastFrameUrl,
        linkedToNext: i < arr.length - 1 && !!arr[i + 1].firstFrameUrl,
      };
    });

    const avgContinuityScore =
      continuityScores.reduce((sum, s) => sum + s.score, 0) / continuityScores.length;

    // Build EPK data
    const epkData = {
      title: title || sceneChain.name,
      synopsis,
      credits,
      segments: sceneChain.segments.map(seg => {
        return {
          orderIndex: seg.orderIndex,
          prompt: seg.prompt,
          duration: seg.duration,
          outputUrl: seg.outputUrl,
          firstFrameUrl: includeStills ? seg.firstFrameUrl : undefined,
          lastFrameUrl: includeStills ? seg.lastFrameUrl : undefined,
          transitionType: seg.transitionType,
        };
      }),
      continuityHeatmap: continuityScores,
      avgContinuityScore: Math.round(avgContinuityScore),
      totalDuration: sceneChain.segments.reduce((sum, s) => sum + (s.duration || 4), 0),
      exportedAt: new Date().toISOString(),
    };

    return res.json({
      success: true,
      epk: epkData,
    });
  } catch (error) {
    console.error('[Sequencer] Export EPK failed:', error);
    return res.status(500).json({
      error: 'Failed to export EPK',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Get export status
 * GET /api/projects/:projectId/sequencer/exports/:exportId
 */
router.get('/exports/:exportId', async (req: Request, res: Response) => {
  try {
    const { exportId } = req.params;

    // For now, exports are synchronous so we return completed status
    // In production, this would check a job queue
    return res.json({
      exportId,
      status: 'completed',
      message: 'Export completed synchronously',
    });
  } catch (error) {
    console.error('[Sequencer] Get export status failed:', error);
    return res.status(500).json({
      error: 'Failed to get export status',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * List exports for a project
 * GET /api/projects/:projectId/sequencer/exports
 */
router.get('/exports', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // List export files from the exports directory
    const fs = await import('fs');
    const path = await import('path');
    const exportDir = path.join(process.cwd(), 'exports', 'master');

    if (!fs.existsSync(exportDir)) {
      return res.json({ exports: [], count: 0 });
    }

    const files = fs.readdirSync(exportDir);
    const exports = files
      .filter((f: string) => f.endsWith('.mp4') || f.endsWith('.mov'))
      .map((f: string) => {
        const stats = fs.statSync(path.join(exportDir, f));
        return {
          filename: f,
          path: `/exports/master/${f}`,
          size: stats.size,
          createdAt: stats.birthtime,
        };
      })
      .sort(
        (a: { createdAt: Date }, b: { createdAt: Date }) =>
          b.createdAt.getTime() - a.createdAt.getTime()
      );

    return res.json({
      exports,
      count: exports.length,
    });
  } catch (error) {
    console.error('[Sequencer] List exports failed:', error);
    return res.status(500).json({
      error: 'Failed to list exports',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Helper function to parse SRT content
function parseSRT(srtContent: string): Array<{
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}> {
  const captions: Array<{
    index: number;
    startTime: string;
    endTime: string;
    text: string;
  }> = [];

  const blocks = srtContent.trim().split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length >= 3) {
      const index = parseInt(lines[0], 10);
      const timecodeMatch = lines[1].match(
        /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/
      );

      if (!isNaN(index) && timecodeMatch) {
        captions.push({
          index,
          startTime: timecodeMatch[1],
          endTime: timecodeMatch[2],
          text: lines.slice(2).join('\n'),
        });
      }
    }
  }

  return captions;
}

export default router;
