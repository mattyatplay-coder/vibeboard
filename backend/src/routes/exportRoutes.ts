/**
 * Master Export API Routes
 *
 * Endpoints for the "Victory Lap" export workflow:
 * - Bake & Export: Mux video + audio, enforce 24fps
 * - Sidecar generation: JSON with full shot DNA
 * - EDL export: Edit Decision List for NLE import
 * - EPK generation: Electronic Press Kit
 */

import { Router, Request, Response } from 'express';
import { masterExportService } from '../services/export/MasterExportService';
import path from 'path';
import fs from 'fs';

const router = Router();

/**
 * POST /api/projects/:projectId/export/bake
 * Bake & Export a scene chain to production-ready video
 */
router.post('/projects/:projectId/export/bake', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { sceneChainId, audioUrl, fps, quality, videoCodec, includeSidecar, generateEDL } = req.body;

        if (!sceneChainId) {
            return res.status(400).json({ error: 'sceneChainId is required' });
        }

        console.log(`[Export] Starting Bake & Export for scene chain ${sceneChainId}`);

        const result = await masterExportService.bakeAndExport(sceneChainId, {
            audioUrl,
            fps: fps || 24,
            quality: quality || 'balanced',
            videoCodec: videoCodec || 'h264',
            includeSidecar: includeSidecar !== false,
            generateEDL: generateEDL || false,
        });

        if (!result.success) {
            return res.status(500).json({ error: result.error });
        }

        res.json({
            success: true,
            exportId: result.exportId,
            outputPath: result.outputPath,
            sidecarPath: result.sidecarPath,
            edlPath: result.edlPath,
            duration: result.duration,
            fileSize: result.fileSize,
            fileSizeMB: (result.fileSize / (1024 * 1024)).toFixed(2),
        });

    } catch (error: any) {
        console.error('[Export] Bake & Export error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/projects/:projectId/export/shot
 * Export a single shot as production-ready file
 */
router.post('/projects/:projectId/export/shot', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { sceneChainId, shotId, audioUrl, fps, includeSidecar } = req.body;

        if (!sceneChainId || !shotId) {
            return res.status(400).json({ error: 'sceneChainId and shotId are required' });
        }

        console.log(`[Export] Exporting single shot ${shotId}`);

        const result = await masterExportService.exportSingleShot(sceneChainId, shotId, {
            audioUrl,
            fps: fps || 24,
            includeSidecar: includeSidecar !== false,
        });

        if (!result.success) {
            return res.status(500).json({ error: result.error });
        }

        res.json({
            success: true,
            exportId: result.exportId,
            outputPath: result.outputPath,
            sidecarPath: result.sidecarPath,
            duration: result.duration,
            fileSize: result.fileSize,
            fileSizeMB: (result.fileSize / (1024 * 1024)).toFixed(2),
        });

    } catch (error: any) {
        console.error('[Export] Single shot export error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/projects/:projectId/exports
 * List all exports for a project
 */
router.get('/projects/:projectId/exports', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;

        const exports = await masterExportService.getExportsForProject(projectId);

        res.json({
            count: exports.length,
            exports: exports.map(e => ({
                ...e,
                fileSizeMB: (e.fileSize / (1024 * 1024)).toFixed(2),
            })),
        });

    } catch (error: any) {
        console.error('[Export] List exports error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/exports/:exportId/download
 * Download an exported file
 */
router.get('/exports/:exportId/download', async (req: Request, res: Response) => {
    try {
        const { exportId } = req.params;
        const { type } = req.query; // 'video', 'sidecar', 'edl'

        const exportDir = path.join(process.cwd(), 'exports', exportId);

        if (!fs.existsSync(exportDir)) {
            return res.status(404).json({ error: 'Export not found' });
        }

        const files = fs.readdirSync(exportDir);

        let targetFile: string | undefined;

        switch (type) {
            case 'sidecar':
                targetFile = files.find(f => f.endsWith('_sidecar.json'));
                break;
            case 'edl':
                targetFile = files.find(f => f.endsWith('.edl'));
                break;
            default: // video
                targetFile = files.find(f => f.endsWith('.mp4'));
        }

        if (!targetFile) {
            return res.status(404).json({ error: `${type || 'video'} file not found` });
        }

        const filePath = path.join(exportDir, targetFile);
        res.download(filePath, targetFile);

    } catch (error: any) {
        console.error('[Export] Download error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/exports/:exportId
 * Delete an export
 */
router.delete('/exports/:exportId', async (req: Request, res: Response) => {
    try {
        const { exportId } = req.params;

        const exportDir = path.join(process.cwd(), 'exports', exportId);

        if (!fs.existsSync(exportDir)) {
            return res.status(404).json({ error: 'Export not found' });
        }

        // Remove directory and all files
        fs.rmSync(exportDir, { recursive: true, force: true });

        res.json({ success: true, message: 'Export deleted' });

    } catch (error: any) {
        console.error('[Export] Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/projects/:projectId/export/epk
 * Generate Electronic Press Kit (HTML + JSON sidecar)
 */
router.post('/projects/:projectId/export/epk', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { sceneChainId, title, description, author, includeContinuityHeatmap } = req.body;

        if (!sceneChainId) {
            return res.status(400).json({ error: 'sceneChainId is required' });
        }

        console.log(`[Export] Generating EPK for scene chain ${sceneChainId}`);

        const result = await masterExportService.generateEPK(sceneChainId, {
            title,
            description,
            author,
            includeContinuityHeatmap: includeContinuityHeatmap !== false,
        });

        if (!result.success) {
            return res.status(500).json({ error: result.error });
        }

        res.json({
            success: true,
            exportId: result.exportId,
            htmlPath: result.htmlPath,
            sidecarPath: result.sidecarPath,
            viewUrl: `/exports/${result.exportId}/epk.html`,
        });

    } catch (error: any) {
        console.error('[Export] EPK generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/exports/:exportId/epk
 * View or download the EPK HTML
 */
router.get('/exports/:exportId/epk', async (req: Request, res: Response) => {
    try {
        const { exportId } = req.params;
        const { download } = req.query;

        const epkPath = path.join(process.cwd(), 'exports', exportId, 'epk.html');

        if (!fs.existsSync(epkPath)) {
            return res.status(404).json({ error: 'EPK not found' });
        }

        if (download === 'true') {
            res.download(epkPath, 'epk.html');
        } else {
            // Serve as HTML page
            res.sendFile(epkPath);
        }

    } catch (error: any) {
        console.error('[Export] EPK view error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
