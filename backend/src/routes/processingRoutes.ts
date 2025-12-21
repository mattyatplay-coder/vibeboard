import express, { Request, Response } from 'express';
import multer from 'multer';
import { processingController } from '../controllers/processingController';
import { frameExtractor } from '../services/FrameExtractor';
import { AIFeedbackStore } from '../services/learning/AIFeedbackStore';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const upload = multer({ dest: 'uploads_local_temp/' });
const memoryUpload = multer({ storage: multer.memoryStorage() });

// Store active rotoscope sessions (sessionId -> session info)
const rotoscopeSessions: Map<string, {
    frameDir: string;
    fps: number;
    totalFrames: number;
    createdAt: Date;
}> = new Map();

// Route: POST /api/process/tattoo-composite
router.post(
    '/tattoo-composite',
    upload.fields([
        { name: 'base_image', maxCount: 1 },
        { name: 'tattoo_image', maxCount: 1 },
        { name: 'mask_image', maxCount: 1 }
    ]),
    processingController.compositeTattoo
);

// Route: POST /api/process/tattoo-ai-generate
// AI-powered tattoo generation directly on skin
router.post(
    '/tattoo-ai-generate',
    upload.fields([
        { name: 'base_image', maxCount: 1 }
    ]),
    processingController.aiTattooGenerate
);

// Route: GET /api/process/inpainting-models
router.get('/inpainting-models', processingController.getInpaintingModels);

// Route: POST /api/process/magic-eraser
router.post(
    '/magic-eraser',
    upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'mask', maxCount: 1 }
    ]),
    processingController.magicEraser
);

// Route: POST /api/process/analyze-inpainting
// AI-assisted image analysis for inpainting parameter recommendations
// Accepts: 'original' (clean image) and 'masked' (image with mask overlay)
router.post(
    '/analyze-inpainting',
    upload.fields([
        { name: 'original', maxCount: 1 },
        { name: 'masked', maxCount: 1 },
        { name: 'image', maxCount: 1 }  // Legacy support for single image
    ]),
    processingController.analyzeImageForInpainting
);

// ============================================
// ROTOSCOPE ENDPOINTS
// ============================================

/**
 * POST /api/process/extract-frames
 * Extract all frames from a video for rotoscoping
 * Accepts either a videoUrl in body OR a video file upload
 */
router.post('/extract-frames', upload.single('video'), async (req: Request, res: Response) => {
    try {
        let videoUrl = req.body.videoUrl;
        const { fps, maxFrames } = req.body;

        // If a file was uploaded, use its path
        if (req.file) {
            videoUrl = req.file.path;
            console.log(`[ProcessRoutes] Using uploaded video file: ${videoUrl}`);
        }

        if (!videoUrl) {
            return res.status(400).json({ error: 'videoUrl or video file is required' });
        }

        console.log(`[ProcessRoutes] Extracting frames from: ${videoUrl}`);

        const result = await frameExtractor.extractFramesForRotoscope(videoUrl, {
            fps: fps ? parseFloat(fps) : undefined,
            maxFrames: maxFrames ? parseInt(maxFrames) : 300
        });

        // Store session info
        const sessionId = path.basename(result.outputDir);
        rotoscopeSessions.set(sessionId, {
            frameDir: result.outputDir,
            fps: result.fps,
            totalFrames: result.totalFrames,
            createdAt: new Date()
        });

        // Return frame URLs (served statically)
        const frames = result.frames.map(f => ({
            url: `/api/process/frames/${sessionId}/${path.basename(f.path)}`,
            timestamp: f.timestamp,
            index: f.index
        }));

        res.json({
            sessionId,
            frames,
            totalFrames: result.totalFrames,
            fps: result.fps,
            duration: result.duration
        });

    } catch (error: any) {
        console.error('[ProcessRoutes] Frame extraction failed:', error);
        res.status(500).json({ error: error.message || 'Frame extraction failed' });
    }
});

/**
 * GET /api/process/frames/:sessionId/:filename
 * Serve individual frame images
 */
router.get('/frames/:sessionId/:filename', (req: Request, res: Response) => {
    try {
        const { sessionId, filename } = req.params;
        const session = rotoscopeSessions.get(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const framePath = path.join(session.frameDir, filename);

        if (!fs.existsSync(framePath)) {
            return res.status(404).json({ error: 'Frame not found' });
        }

        // Prevent caching so edited frames always load fresh
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        res.sendFile(framePath);

    } catch (error: any) {
        console.error('[ProcessRoutes] Frame serve failed:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/process/frames/:sessionId/file/:filename
 * Update a frame by filename (more reliable than index)
 */
router.post('/frames/:sessionId/file/:filename', memoryUpload.single('frame'), async (req: Request, res: Response) => {
    try {
        const { sessionId, filename } = req.params;
        const session = rotoscopeSessions.get(sessionId);

        if (!session) {
            console.error(`[ProcessRoutes] Session not found: ${sessionId}`);
            return res.status(404).json({ error: 'Session not found' });
        }

        if (!req.file) {
            console.error(`[ProcessRoutes] No file in request for ${filename}`);
            return res.status(400).json({ error: 'Frame file is required' });
        }

        const framePath = path.join(session.frameDir, filename);

        console.log(`[ProcessRoutes] Saving frame by filename:`);
        console.log(`  Filename: ${filename}`);
        console.log(`  Buffer size: ${req.file.buffer.length} bytes`);
        console.log(`  Target path: ${framePath}`);

        // Verify the file exists before overwriting
        if (!fs.existsSync(framePath)) {
            console.error(`[ProcessRoutes] Original frame not found: ${framePath}`);
            return res.status(404).json({ error: 'Original frame not found' });
        }

        // Save the edited frame
        fs.writeFileSync(framePath, req.file.buffer);

        // Verify file was written
        const stats = fs.statSync(framePath);
        console.log(`  Saved file size: ${stats.size} bytes`);

        res.json({ success: true, filename, savedBytes: stats.size });

    } catch (error: any) {
        console.error('[ProcessRoutes] Frame update by filename failed:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/process/frames/:sessionId/:index
 * Update a frame (save edited version) - DEPRECATED, use /file/:filename instead
 */
router.post('/frames/:sessionId/:index', memoryUpload.single('frame'), async (req: Request, res: Response) => {
    try {
        const { sessionId, index } = req.params;
        const session = rotoscopeSessions.get(sessionId);

        if (!session) {
            console.error(`[ProcessRoutes] Session not found: ${sessionId}`);
            return res.status(404).json({ error: 'Session not found' });
        }

        if (!req.file) {
            console.error(`[ProcessRoutes] No file in request for frame ${index}`);
            return res.status(400).json({ error: 'Frame file is required' });
        }

        const frameIndex = parseInt(index);

        // List all frame files in directory to verify naming convention
        const existingFiles = fs.readdirSync(session.frameDir).filter(f => f.startsWith('frame_')).sort();
        console.log(`[ProcessRoutes] First 5 frame files in dir: ${existingFiles.slice(0, 5).join(', ')}`);

        const paddedIndex = String(frameIndex + 1).padStart(4, '0');
        const framePath = path.join(session.frameDir, `frame_${paddedIndex}.png`);

        console.log(`[ProcessRoutes] Saving frame ${frameIndex} (0-indexed) -> frame_${paddedIndex}.png:`);
        console.log(`  Buffer size: ${req.file.buffer.length} bytes`);
        console.log(`  MIME type: ${req.file.mimetype}`);
        console.log(`  Target path: ${framePath}`);

        // Verify buffer is valid image data (PNG starts with \x89PNG)
        const isPng = req.file.buffer[0] === 0x89 && req.file.buffer[1] === 0x50;
        const isJpeg = req.file.buffer[0] === 0xFF && req.file.buffer[1] === 0xD8;
        console.log(`  Is PNG: ${isPng}, Is JPEG: ${isJpeg}`);

        // Save the edited frame
        fs.writeFileSync(framePath, req.file.buffer);

        // Verify file was written
        const stats = fs.statSync(framePath);
        console.log(`  Saved file size: ${stats.size} bytes`);

        // Double-check by reading the file back
        const verifyBuffer = fs.readFileSync(framePath);
        const verifyIsPng = verifyBuffer[0] === 0x89 && verifyBuffer[1] === 0x50;
        const verifyIsJpeg = verifyBuffer[0] === 0xFF && verifyBuffer[1] === 0xD8;
        console.log(`  Verification - Read back ${verifyBuffer.length} bytes, PNG: ${verifyIsPng}, JPEG: ${verifyIsJpeg}`);

        res.json({ success: true, index: frameIndex, savedBytes: stats.size });

    } catch (error: any) {
        console.error('[ProcessRoutes] Frame update failed:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/process/reconstruct/:sessionId
 * Reconstruct video from edited frames
 */
router.post('/reconstruct/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const session = rotoscopeSessions.get(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        console.log(`[ProcessRoutes] Reconstructing video from session: ${sessionId}`);

        const videoPath = await frameExtractor.reconstructVideo(session.frameDir, {
            fps: session.fps
        });

        // Upload to Fal storage
        const fileBuffer = fs.readFileSync(videoPath);
        const { default: fal } = await import('@fal-ai/serverless-client');
        const blob = new Blob([fileBuffer], { type: 'video/mp4' });
        const videoUrl = await fal.storage.upload(blob as any);

        // Cleanup temp video
        fs.unlinkSync(videoPath);

        res.json({ videoUrl });

    } catch (error: any) {
        console.error('[ProcessRoutes] Video reconstruction failed:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/process/session/:sessionId
 * Cleanup a rotoscope session
 */
router.delete('/session/:sessionId', (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const session = rotoscopeSessions.get(sessionId);

        if (session) {
            frameExtractor.cleanupFrames(session.frameDir);
            rotoscopeSessions.delete(sessionId);
        }

        res.json({ success: true });

    } catch (error: any) {
        console.error('[ProcessRoutes] Session cleanup failed:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/process/session/:sessionId
 * Get session info
 */
router.get('/session/:sessionId', (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const session = rotoscopeSessions.get(sessionId);

    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
        sessionId,
        fps: session.fps,
        totalFrames: session.totalFrames,
        createdAt: session.createdAt
    });
});

// ============================================
// AI FEEDBACK LEARNING ENDPOINTS
// ============================================

/**
 * POST /api/process/feedback
 * Submit feedback about AI recommendations (thumbs up/down)
 * Used by Magic Eraser AI Assist and Generation Analysis
 */
router.post('/feedback', async (req: Request, res: Response) => {
    try {
        const { context, isHelpful, aiReasoning, userCorrection, objectType, maskPosition, imageDescription } = req.body;

        if (!context || typeof isHelpful !== 'boolean') {
            return res.status(400).json({ error: 'Missing required fields: context, isHelpful' });
        }

        const feedbackStore = AIFeedbackStore.getInstance();
        const entry = feedbackStore.addFeedback({
            context,
            isHelpful,
            aiReasoning: aiReasoning || '',
            userCorrection,
            objectType,
            maskPosition,
            imageDescription
        });

        console.log(`[Feedback] Received ${isHelpful ? 'positive' : 'negative'} feedback for ${context}`);

        res.json({
            success: true,
            feedbackId: entry.id,
            message: isHelpful ? 'Thank you for the feedback!' : 'We will learn from this correction.'
        });

    } catch (error: any) {
        console.error('[Feedback] Error:', error);
        res.status(500).json({ error: error.message || 'Failed to save feedback' });
    }
});

/**
 * GET /api/process/feedback/stats
 * Get feedback statistics and learned patterns
 */
router.get('/feedback/stats', async (req: Request, res: Response) => {
    try {
        const feedbackStore = AIFeedbackStore.getInstance();
        const stats = feedbackStore.getStats();

        res.json(stats);
    } catch (error: any) {
        console.error('[Feedback] Error getting stats:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/process/feedback/hints/:context
 * Get learned hints for a specific context (to inject into AI prompts)
 */
router.get('/feedback/hints/:context', async (req: Request, res: Response) => {
    try {
        const { context } = req.params;
        const feedbackStore = AIFeedbackStore.getInstance();

        const validContexts = ['generation-analysis', 'magic-eraser', 'prompt-enhancement'];
        if (!validContexts.includes(context)) {
            return res.status(400).json({ error: `Invalid context. Must be one of: ${validContexts.join(', ')}` });
        }

        const hints = feedbackStore.getLearnedHints(context as any);

        res.json({ context, hints });
    } catch (error: any) {
        console.error('[Feedback] Error getting hints:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cleanup old sessions periodically (every hour)
setInterval(() => {
    const ONE_HOUR = 60 * 60 * 1000;
    const now = new Date();

    for (const [sessionId, session] of rotoscopeSessions.entries()) {
        if (now.getTime() - session.createdAt.getTime() > ONE_HOUR) {
            console.log(`[ProcessRoutes] Cleaning up stale session: ${sessionId}`);
            frameExtractor.cleanupFrames(session.frameDir);
            rotoscopeSessions.delete(sessionId);
        }
    }
}, 60 * 60 * 1000);

export default router;
