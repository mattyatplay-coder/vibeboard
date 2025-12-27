import { Router, Request, Response } from 'express';
import { bakeMasterPass, ClipSpec } from '../services/export/BakeMasterPass';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router({ mergeParams: true });

// Configure multer for video uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(process.cwd(), 'uploads', 'timeline');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `video-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}. Only video files are allowed.`));
        }
    }
});

/**
 * POST /api/projects/:projectId/timeline/upload
 * Upload a video file for quick edit mode
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file uploaded' });
        }

        const fileUrl = `/uploads/timeline/${req.file.filename}`;
        console.log(`[TimelineUpload] Video uploaded: ${fileUrl}`);

        res.json({
            success: true,
            fileUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        });
    } catch (error: any) {
        console.error('Error uploading video:', error);
        res.status(500).json({
            error: 'Failed to upload video',
            message: error.message
        });
    }
});

/**
 * POST /api/projects/:projectId/timeline/bake
 * Bake an ad-hoc timeline from directly provided clips (Quick Edit mode)
 * This bypasses scene chains and allows direct video editing
 */
router.post('/bake', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const {
            clips,
            fps = 24,
            codec = 'h264',
            quality = 'master',
            includeAudio = true,
            outputFormat = 'mp4'
        } = req.body;

        if (!clips || !Array.isArray(clips) || clips.length === 0) {
            return res.status(400).json({ error: 'No clips provided' });
        }

        // Convert to ClipSpec format
        const clipSpecs: ClipSpec[] = clips.map((clip: any, index: number) => ({
            id: clip.id || `clip-${index}`,
            videoUrl: clip.videoUrl,
            duration: clip.duration || 5,
            trimStart: clip.trimStart || 0,
            trimEnd: clip.trimEnd || 0,
            audioUrl: clip.audioUrl,
            audioTrimStart: clip.audioTrimStart || 0,
            audioTrimEnd: clip.audioTrimEnd || 0,
            audioGain: clip.audioGain || 1,
            transitionType: clip.transitionType || 'cut',
            transitionDuration: clip.transitionDuration || 0
        }));

        console.log(`[TimelineBake] Starting quick edit bake with ${clipSpecs.length} clips`);

        // Execute bake
        const result = await bakeMasterPass.bake(clipSpecs, {
            fps,
            codec,
            quality,
            includeAudio,
            outputFormat
        });

        if (!result.success) {
            return res.status(500).json({
                error: 'Bake failed',
                logs: result.logs
            });
        }

        // Move output to uploads folder
        const uploadsDir = path.join(process.cwd(), 'uploads', 'baked');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const finalFilename = `quick-edit-${projectId}-${Date.now()}.${outputFormat}`;
        const finalPath = path.join(uploadsDir, finalFilename);
        fs.copyFileSync(result.outputPath, finalPath);

        // Cleanup temp files
        bakeMasterPass.cleanup(result.outputPath);

        const finalUrl = `/uploads/baked/${finalFilename}`;

        console.log(`[TimelineBake] Quick edit bake complete: ${finalUrl}`);

        res.json({
            success: true,
            finalVideoUrl: finalUrl,
            duration: result.duration,
            resolution: result.resolution,
            fileSize: result.fileSize,
            clipsProcessed: clipSpecs.length,
            logs: result.logs
        });

    } catch (error: any) {
        console.error('Error baking quick edit timeline:', error);
        res.status(500).json({
            error: 'Failed to bake timeline',
            message: error.message
        });
    }
});

export default router;
