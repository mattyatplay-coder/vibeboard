/**
 * Frame Extraction Service
 *
 * Extracts frames from videos for use as reference images in subsequent generations.
 * Uses local FFmpeg for extraction and Fal.ai storage for hosting the results.
 */

import * as fal from "@fal-ai/serverless-client";
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Configure fal client
fal.config({
    credentials: process.env.FAL_KEY
});

export interface FrameExtractionOptions {
    videoUrl: string;
    framePosition: 'first' | 'last' | 'middle' | 'timestamp';
    timestamp?: number; // In seconds, for 'timestamp' position
    outputFormat?: 'png' | 'jpg';
}

export interface ExtractedFrame {
    url: string;
    position: string;
    timestamp?: number;
    width?: number;
    height?: number;
}

export class FrameExtractor {

    /**
     * Extract a single frame from a video
     */
    async extractFrame(options: FrameExtractionOptions): Promise<ExtractedFrame> {
        const { videoUrl, framePosition, timestamp, outputFormat = 'png' } = options;

        try {
            console.log(`[FrameExtractor] Extracting ${framePosition} frame from video (${videoUrl})...`);

            // 1. Determine the timestamp to extract
            let seekTime = 0;
            if (framePosition === 'timestamp' && timestamp !== undefined) {
                seekTime = timestamp;
            } else if (framePosition === 'middle' || framePosition === 'last') {
                const duration = await this.getVideoDuration(videoUrl);
                if (framePosition === 'middle') {
                    seekTime = duration / 2;
                } else {
                    seekTime = Math.max(0, duration - 0.5); // 0.5s from end
                }
            }

            // 2. Extract frame locally
            const tempDir = os.tmpdir();
            const filename = `${uuidv4()}.${outputFormat}`;
            const outputPath = path.join(tempDir, filename);

            await new Promise<void>((resolve, reject) => {
                ffmpeg(videoUrl)
                    .screenshots({
                        timestamps: [seekTime],
                        filename: filename,
                        folder: tempDir,
                        size: '100%' // Keep original size
                    })
                    .on('end', () => resolve())
                    .on('error', (err) => reject(err));
            });

            // 3. Upload to Fal Storage
            if (!fs.existsSync(outputPath)) {
                throw new Error('FFmpeg failed to generate output file');
            }

            const fileBuffer = fs.readFileSync(outputPath);
            // new Blob is needed for fal.storage.upload in pure Node env, or just pass buffer if supported?
            // We verified new Blob([buffer]) works. 
            // TS might complain about global Blob if not available, but Node 18+ has it.
            // If TS complains, we can cast or polyfill, but let's try standard.
            const blob = new Blob([fileBuffer], { type: `image/${outputFormat}` });

            const uploadedUrl = await fal.storage.upload(blob as any); // Cast to any to avoid strict type mismatch with Node Blob vs Browser Blob

            // Cleanup
            fs.unlinkSync(outputPath);

            return {
                url: uploadedUrl,
                position: framePosition,
                timestamp: seekTime
            };

        } catch (error: any) {
            console.error('[FrameExtractor] Frame extraction failed:', error);
            throw new Error(`Frame extraction failed: ${error.message}`);
        }
    }

    /**
     * Get video duration using ffprobe
     */
    private getVideoDuration(videoUrl: string): Promise<number> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoUrl, (err, metadata) => {
                if (err) return reject(err);
                const duration = metadata.format.duration;
                resolve(duration || 0);
            });
        });
    }

    /**
     * Extract multiple frames from a video
     */
    async extractMultipleFrames(
        videoUrl: string,
        positions: ('first' | 'last' | 'middle')[] | number[]
    ): Promise<ExtractedFrame[]> {
        const frames: ExtractedFrame[] = [];

        // Optimization: Get duration once if needed by multiple frames
        // But for simplicity, we rely on extractFrame's logic.
        // Since fluent-ffmpeg handles remote URLs well, checking duration multiple times is acceptable overhead for now.

        for (const position of positions) {
            try {
                if (typeof position === 'string') {
                    const frame = await this.extractFrame({
                        videoUrl,
                        framePosition: position,
                    });
                    frames.push(frame);
                } else {
                    // Numeric timestamp
                    const frame = await this.extractFrame({
                        videoUrl,
                        framePosition: 'timestamp',
                        timestamp: position,
                    });
                    frames.push(frame);
                }
            } catch (error) {
                console.warn(`[FrameExtractor] Failed to extract frame at ${position}:`, error);
            }
        }

        return frames;
    }

    /**
     * Extract the last frame for use as the start frame of the next generation
     */
    async extractLastFrameForContinuity(videoUrl: string): Promise<ExtractedFrame> {
        return this.extractFrame({
            videoUrl,
            framePosition: 'last',
            outputFormat: 'png',
        });
    }

    /**
     * Extract first and last frames for comparison or editing
     */
    async extractBookendFrames(videoUrl: string): Promise<{ first: ExtractedFrame; last: ExtractedFrame }> {
        const [first, last] = await Promise.all([
            this.extractFrame({ videoUrl, framePosition: 'first' }),
            this.extractFrame({ videoUrl, framePosition: 'last' }),
        ]);

        return { first, last };
    }
    /**
     * Extract frames at a specific rate (e.g., 1 frame per second)
     */
    async extractFramesByRate(videoUrl: string, fps: number = 1): Promise<ExtractedFrame[]> {
        try {
            const duration = await this.getVideoDuration(videoUrl);
            const timestamps: number[] = [];

            // Generate timestamps: 0, 1, 2... up to duration
            // Limit to max 10 frames to prevent huge payloads
            const step = 1 / fps;
            let current = 0;
            let count = 0;
            const MAX_FRAMES = 10;

            while (current < duration && count < MAX_FRAMES) {
                timestamps.push(current);
                current += step;
                count++;
            }

            // Always ensure the very last frame is included if we haven't hit the limit
            if (duration > 0 && count < MAX_FRAMES && (current - step) < (duration - 0.1)) {
                timestamps.push(duration - 0.1);
            }

            console.log(`[FrameExtractor] Extracting ${timestamps.length} frames (Rate: ${fps}fps, Duration: ${duration}s)`);
            return this.extractMultipleFrames(videoUrl, timestamps);
        } catch (error) {
            console.error("[FrameExtractor] Failed to extract by rate:", error);
            // Fallback to basic 3 frames
            return this.extractMultipleFrames(videoUrl, ['first', 'middle', 'last']);
        }
    }
}

// Export singleton instance
export const frameExtractor = new FrameExtractor();

