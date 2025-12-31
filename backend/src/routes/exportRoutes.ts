/**
 * Export Routes
 *
 * API endpoints for NLE Master Export with L-Cut support.
 * Handles timeline baking, EDL generation, and sidecar JSON export.
 */

import { Router, Request, Response } from 'express';
import { MasterExportService, TimelineClipInput, MasterExportOptions } from '../services/export/MasterExportService';
import { prisma } from '../prisma';
import path from 'path';
import fs from 'fs';
import { upload } from '../middleware/upload';

const router = Router({ mergeParams: true });
const masterExportService = MasterExportService.getInstance();

/**
 * POST /api/projects/:projectId/export/master
 * Bake a scene chain to master video with L-Cut support
 */
router.post('/master', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const {
            sceneChainId,
            exportName,
            format = 'h264',
            frameRate = 24,
            resolution,
            audioCodec = 'aac',
            includeEDL = true,
            includeSidecar = true,
        } = req.body;

        if (!sceneChainId) {
            return res.status(400).json({ error: 'sceneChainId is required' });
        }

        console.log(`[ExportRoutes] Starting master export for chain: ${sceneChainId}`);

        const result = await masterExportService.exportSceneChain(projectId, sceneChainId, {
            exportName,
            format,
            frameRate,
            resolution,
            audioCodec,
            includeEDL,
            includeSidecar,
        });

        // Generate public URL for the video
        const publicPath = result.videoPath.replace(process.cwd(), '').replace(/^\//, '');

        res.json({
            success: true,
            exportId: result.exportId,
            videoUrl: `/api/exports/${result.exportId}/video`,
            duration: result.duration,
            clipCount: result.clipCount,
            edlUrl: result.edlPath ? `/api/exports/${result.exportId}/edl` : undefined,
            sidecarUrl: result.sidecarPath ? `/api/exports/${result.exportId}/sidecar` : undefined,
        });

    } catch (error: any) {
        console.error('[ExportRoutes] Master export failed:', error);
        res.status(500).json({ error: error.message || 'Export failed' });
    }
});

/**
 * POST /api/projects/:projectId/export/timeline
 * Bake a custom timeline with explicit clips (for NLETimeline frontend)
 */
router.post('/timeline', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const {
            clips,
            exportName,
            format = 'h264',
            frameRate = 24,
            includeEDL = true,
            includeSidecar = true,
        } = req.body;

        if (!clips || !Array.isArray(clips) || clips.length === 0) {
            return res.status(400).json({ error: 'clips array is required' });
        }

        console.log(`[ExportRoutes] Starting timeline export with ${clips.length} clips`);

        // Validate clips have required fields
        const validatedClips: TimelineClipInput[] = clips.map((clip: any, index: number) => {
            if (!clip.videoPath && !clip.videoUrl) {
                throw new Error(`Clip ${index} missing videoPath or videoUrl`);
            }
            return {
                id: clip.id || `clip_${index}`,
                name: clip.name || `Clip ${index + 1}`,
                videoPath: clip.videoPath || clip.videoUrl,
                audioPath: clip.audioPath || clip.audioUrl,
                duration: clip.duration || 5,
                trimStart: clip.trimStart ?? 0,
                trimEnd: clip.trimEnd ?? clip.duration ?? 5,
                audioTrimStart: clip.audioTrimStart ?? clip.trimStart ?? 0,
                audioTrimEnd: clip.audioTrimEnd ?? clip.trimEnd ?? clip.duration ?? 5,
                audioGain: clip.audioGain ?? 1.0,
                avLinked: clip.avLinked ?? true,
                prompt: clip.prompt,
                negativePrompt: clip.negativePrompt,
                model: clip.model,
                seed: clip.seed,
                lensKit: clip.lensKit,
                lightingSetup: clip.lightingSetup,
                cinematicTags: clip.cinematicTags,
            };
        });

        const result = await masterExportService.bakeTimeline(validatedClips, {
            projectId,
            sceneChainId: 'custom_timeline',
            exportName,
            format,
            frameRate,
            includeEDL,
            includeSidecar,
        } as MasterExportOptions);

        res.json({
            success: true,
            exportId: result.exportId,
            videoUrl: `/api/exports/${result.exportId}/video`,
            duration: result.duration,
            clipCount: result.clipCount,
            edlUrl: result.edlPath ? `/api/exports/${result.exportId}/edl` : undefined,
            sidecarUrl: result.sidecarPath ? `/api/exports/${result.exportId}/sidecar` : undefined,
        });

    } catch (error: any) {
        console.error('[ExportRoutes] Timeline export failed:', error);
        res.status(500).json({ error: error.message || 'Export failed' });
    }
});

/**
 * POST /api/projects/:projectId/export/preview
 * Preview a single clip with L-Cut applied (for testing)
 */
router.post('/preview', async (req: Request, res: Response) => {
    try {
        const {
            videoUrl,
            trimStart = 0,
            trimEnd,
            audioTrimStart,
            audioTrimEnd,
            audioGain = 1.0,
            frameRate = 24,
        } = req.body;

        if (!videoUrl) {
            return res.status(400).json({ error: 'videoUrl is required' });
        }

        const clip: TimelineClipInput = {
            id: 'preview',
            name: 'Preview Clip',
            videoPath: videoUrl,
            duration: trimEnd || 5,
            trimStart,
            trimEnd: trimEnd || 5,
            audioTrimStart: audioTrimStart ?? trimStart,
            audioTrimEnd: audioTrimEnd ?? trimEnd ?? 5,
            audioGain,
            avLinked: false,
        };

        const previewPath = await masterExportService.previewClip(clip, { frameRate });

        res.json({
            success: true,
            previewUrl: `/exports/temp/${path.basename(path.dirname(previewPath))}/${path.basename(previewPath)}`,
        });

    } catch (error: any) {
        console.error('[ExportRoutes] Preview failed:', error);
        res.status(500).json({ error: error.message || 'Preview failed' });
    }
});

/**
 * GET /api/exports/:exportId/video
 * Download the exported video file
 */
router.get('/:exportId/video', async (req: Request, res: Response) => {
    try {
        const { exportId } = req.params;
        const exportDir = path.join(process.cwd(), 'exports', 'master');

        // Find the export directory
        const projects = fs.readdirSync(exportDir);
        let videoPath: string | null = null;

        for (const project of projects) {
            const projectPath = path.join(exportDir, project);
            if (!fs.statSync(projectPath).isDirectory()) continue;

            const files = fs.readdirSync(projectPath);
            const videoFile = files.find(f =>
                f.startsWith(exportId) && (f.endsWith('.mp4') || f.endsWith('.mov'))
            );

            if (videoFile) {
                videoPath = path.join(projectPath, videoFile);
                break;
            }
        }

        if (!videoPath || !fs.existsSync(videoPath)) {
            return res.status(404).json({ error: 'Export not found' });
        }

        res.download(videoPath);

    } catch (error: any) {
        console.error('[ExportRoutes] Video download failed:', error);
        res.status(500).json({ error: error.message || 'Download failed' });
    }
});

/**
 * GET /api/exports/:exportId/edl
 * Download the EDL file
 */
router.get('/:exportId/edl', async (req: Request, res: Response) => {
    try {
        const { exportId } = req.params;
        const exportDir = path.join(process.cwd(), 'exports', 'master');

        // Find the EDL file
        const projects = fs.readdirSync(exportDir);
        let edlPath: string | null = null;

        for (const project of projects) {
            const projectPath = path.join(exportDir, project);
            if (!fs.statSync(projectPath).isDirectory()) continue;

            const files = fs.readdirSync(projectPath);
            const edlFile = files.find(f =>
                f.startsWith(exportId) && f.endsWith('.edl')
            );

            if (edlFile) {
                edlPath = path.join(projectPath, edlFile);
                break;
            }
        }

        if (!edlPath || !fs.existsSync(edlPath)) {
            return res.status(404).json({ error: 'EDL not found' });
        }

        res.download(edlPath);

    } catch (error: any) {
        console.error('[ExportRoutes] EDL download failed:', error);
        res.status(500).json({ error: error.message || 'Download failed' });
    }
});

/**
 * GET /api/exports/:exportId/sidecar
 * Download the sidecar JSON file
 */
router.get('/:exportId/sidecar', async (req: Request, res: Response) => {
    try {
        const { exportId } = req.params;
        const exportDir = path.join(process.cwd(), 'exports', 'master');

        // Find the sidecar JSON file
        const projects = fs.readdirSync(exportDir);
        let sidecarPath: string | null = null;

        for (const project of projects) {
            const projectPath = path.join(exportDir, project);
            if (!fs.statSync(projectPath).isDirectory()) continue;

            const files = fs.readdirSync(projectPath);
            const sidecarFile = files.find(f =>
                f.startsWith(exportId) && f.endsWith('_dna.json')
            );

            if (sidecarFile) {
                sidecarPath = path.join(projectPath, sidecarFile);
                break;
            }
        }

        if (!sidecarPath || !fs.existsSync(sidecarPath)) {
            return res.status(404).json({ error: 'Sidecar not found' });
        }

        const content = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8'));
        res.json(content);

    } catch (error: any) {
        console.error('[ExportRoutes] Sidecar download failed:', error);
        res.status(500).json({ error: error.message || 'Download failed' });
    }
});

/**
 * GET /api/projects/:projectId/exports
 * List all exports for a project
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const exportDir = path.join(process.cwd(), 'exports', 'master', projectId);

        if (!fs.existsSync(exportDir)) {
            return res.json({ exports: [] });
        }

        const files = fs.readdirSync(exportDir);
        const exports = files
            .filter(f => f.endsWith('.mp4') || f.endsWith('.mov'))
            .map(f => {
                const stat = fs.statSync(path.join(exportDir, f));
                const exportId = f.replace(/\.(mp4|mov)$/, '');
                return {
                    id: exportId,
                    filename: f,
                    format: f.endsWith('.mov') ? 'prores' : 'h264',
                    size: stat.size,
                    createdAt: stat.mtime.toISOString(),
                    videoUrl: `/api/exports/${exportId}/video`,
                    hasEDL: files.includes(`${exportId}.edl`),
                    hasSidecar: files.includes(`${exportId}_dna.json`),
                };
            });

        res.json({ exports });

    } catch (error: any) {
        console.error('[ExportRoutes] List exports failed:', error);
        res.status(500).json({ error: error.message || 'Failed to list exports' });
    }
});

/**
 * POST /api/projects/:projectId/export/epk
 * Generate an Electronic Press Kit (EPK) with continuity heatmap
 */
router.post('/epk', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const {
            sceneChainId,
            title,
            director,
            logline,
            includeVideo = true,
        } = req.body;

        if (!sceneChainId) {
            return res.status(400).json({ error: 'sceneChainId is required' });
        }

        console.log(`[ExportRoutes] Generating EPK for chain: ${sceneChainId}`);

        const result = await masterExportService.generateEPK(projectId, sceneChainId, {
            title,
            director,
            logline,
            includeVideo,
        });

        res.json({
            success: true,
            epkUrl: `/api/exports/${path.basename(result.epkPath, '.html')}/epk`,
            videoUrl: result.videoPath ? `/api/exports/${path.basename(result.epkPath, '.html')}/video` : undefined,
        });

    } catch (error: any) {
        console.error('[ExportRoutes] EPK generation failed:', error);
        res.status(500).json({ error: error.message || 'EPK generation failed' });
    }
});

/**
 * GET /api/exports/:exportId/epk
 * View the EPK HTML page
 */
router.get('/:exportId/epk', async (req: Request, res: Response) => {
    try {
        const { exportId } = req.params;
        const exportDir = path.join(process.cwd(), 'exports', 'epk');

        if (!fs.existsSync(exportDir)) {
            return res.status(404).json({ error: 'No EPK exports found' });
        }

        // Find the EPK file
        const files = fs.readdirSync(exportDir);
        const epkFile = files.find(f =>
            f.startsWith(exportId) && f.endsWith('.html')
        );

        if (!epkFile) {
            return res.status(404).json({ error: 'EPK not found' });
        }

        const epkPath = path.join(exportDir, epkFile);
        res.sendFile(epkPath);

    } catch (error: any) {
        console.error('[ExportRoutes] EPK view failed:', error);
        res.status(500).json({ error: error.message || 'Failed to load EPK' });
    }
});

/**
 * POST /api/projects/:projectId/timeline/upload
 * Upload a video file for use in Quick Edit timeline
 *
 * Note: This route is registered at /api/projects/:projectId/timeline via index.ts
 * to match the frontend's expected endpoint
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Validate it's a video file
        const allowedMimeTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            // Delete the uploaded file
            fs.unlinkSync(file.path);
            return res.status(400).json({ error: 'Invalid file type. Please upload a video file.' });
        }

        // Return the file URL
        const fileUrl = `/uploads/${file.filename}`;

        console.log(`[ExportRoutes] Video uploaded for timeline: ${fileUrl}`);

        res.json({
            success: true,
            fileUrl,
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
        });

    } catch (error: any) {
        console.error('[ExportRoutes] Timeline upload failed:', error);
        res.status(500).json({ error: error.message || 'Upload failed' });
    }
});

/**
 * POST /api/projects/:projectId/timeline/bake
 * Bake a quick edit timeline (alias for /export/timeline)
 */
router.post('/bake', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const {
            clips,
            fps = 24,
            codec = 'h264',
            quality = 'master',
        } = req.body;

        if (!clips || !Array.isArray(clips) || clips.length === 0) {
            return res.status(400).json({ error: 'clips array is required' });
        }

        console.log(`[ExportRoutes] Baking quick edit timeline with ${clips.length} clips`);

        // Validate clips have required fields
        const validatedClips: TimelineClipInput[] = clips.map((clip: any, index: number) => {
            if (!clip.videoUrl) {
                throw new Error(`Clip ${index} missing videoUrl`);
            }
            return {
                id: clip.id || `clip_${index}`,
                name: clip.name || `Clip ${index + 1}`,
                videoPath: clip.videoUrl,
                audioPath: clip.audioUrl,
                duration: clip.duration || 5,
                trimStart: clip.trimStart ?? 0,
                trimEnd: clip.trimEnd ?? clip.duration ?? 5,
                audioTrimStart: clip.audioTrimStart ?? clip.trimStart ?? 0,
                audioTrimEnd: clip.audioTrimEnd ?? clip.trimEnd ?? clip.duration ?? 5,
                audioGain: clip.audioGain ?? 1.0,
                avLinked: clip.avLinked ?? true,
            };
        });

        const result = await masterExportService.bakeTimeline(validatedClips, {
            projectId,
            sceneChainId: 'quick_edit',
            format: codec,
            frameRate: fps,
            includeEDL: false,
            includeSidecar: false,
        } as MasterExportOptions);

        res.json({
            success: true,
            finalVideoUrl: `/api/exports/${result.exportId}/video`,
            exportId: result.exportId,
            duration: result.duration,
            clipCount: result.clipCount,
        });

    } catch (error: any) {
        console.error('[ExportRoutes] Quick edit bake failed:', error);
        res.status(500).json({ error: error.message || 'Bake failed' });
    }
});

/**
 * DELETE /api/exports/:exportId
 * Delete an export and its associated files
 */
router.delete('/:exportId', async (req: Request, res: Response) => {
    try {
        const { exportId } = req.params;
        const exportDir = path.join(process.cwd(), 'exports', 'master');

        let deleted = false;

        // Find and delete export files
        const projects = fs.readdirSync(exportDir);
        for (const project of projects) {
            const projectPath = path.join(exportDir, project);
            if (!fs.statSync(projectPath).isDirectory()) continue;

            const files = fs.readdirSync(projectPath);
            const exportFiles = files.filter(f => f.startsWith(exportId));

            for (const file of exportFiles) {
                fs.unlinkSync(path.join(projectPath, file));
                deleted = true;
            }
        }

        if (!deleted) {
            return res.status(404).json({ error: 'Export not found' });
        }

        res.json({ success: true, message: 'Export deleted' });

    } catch (error: any) {
        console.error('[ExportRoutes] Delete export failed:', error);
        res.status(500).json({ error: error.message || 'Delete failed' });
    }
});

export default router;
