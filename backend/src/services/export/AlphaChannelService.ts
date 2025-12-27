/**
 * AlphaChannelService
 *
 * Generates alpha-channel mattes for video compositing using SAM 2 (Segment Anything Model 2).
 * Supports PNG sequence export for professional VFX pipelines.
 *
 * Features:
 * - SAM 2 video segmentation via Fal.ai
 * - PNG sequence export with transparency
 * - ProRes 4444 export with embedded alpha
 * - Batch processing for multi-subject extraction
 */

import * as fal from '@fal-ai/serverless-client';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// Initialize Fal.ai client
fal.config({
    credentials: process.env.FAL_KEY || process.env.FAL_API_KEY,
});

export interface SegmentationPoint {
    x: number;  // 0-1 normalized
    y: number;  // 0-1 normalized
    label: 1 | 0;  // 1 = foreground, 0 = background
}

export interface SegmentationBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export interface AlphaExportOptions {
    videoUrl: string;
    projectId: string;
    exportName: string;
    segmentationMethod: 'auto' | 'points' | 'box';
    points?: SegmentationPoint[];
    box?: SegmentationBox;
    outputFormat: 'png_sequence' | 'prores4444' | 'webm_alpha';
    frameRate?: number;
    resolution?: string;  // e.g., '1920x1080'
}

export interface AlphaExportResult {
    exportId: string;
    format: string;
    outputPath: string;
    frameCount?: number;
    duration?: number;
    maskVideoUrl?: string;  // URL of the mask video from SAM 2
}

export class AlphaChannelService {
    private static instance: AlphaChannelService;
    private exportDir: string;

    private constructor() {
        this.exportDir = path.join(process.cwd(), 'exports', 'alpha');
        if (!fs.existsSync(this.exportDir)) {
            fs.mkdirSync(this.exportDir, { recursive: true });
        }
    }

    static getInstance(): AlphaChannelService {
        if (!AlphaChannelService.instance) {
            AlphaChannelService.instance = new AlphaChannelService();
        }
        return AlphaChannelService.instance;
    }

    /**
     * Generate alpha mask using SAM 2 video segmentation
     * Uses fal-ai/sam2-video for video input
     */
    async generateMask(
        videoUrl: string,
        method: 'auto' | 'points' | 'box',
        points?: SegmentationPoint[],
        box?: SegmentationBox
    ): Promise<{ maskVideoUrl: string; trackId: string }> {
        try {
            console.log(`[AlphaChannel] Generating mask with SAM 2 for: ${videoUrl.substring(0, 60)}...`);

            // Build input based on segmentation method
            const input: any = {
                video_url: videoUrl,
            };

            if (method === 'points' && points && points.length > 0) {
                // SAM 2 expects points as [[x, y], [x, y], ...]
                input.points_per_frame = [{
                    frame_index: 0,
                    points: points.map(p => [p.x, p.y]),
                    labels: points.map(p => p.label),
                }];
            } else if (method === 'box' && box) {
                // SAM 2 expects box as [x1, y1, x2, y2]
                input.box_per_frame = [{
                    frame_index: 0,
                    box: [box.x1, box.y1, box.x2, box.y2],
                }];
            }
            // 'auto' mode: SAM 2 will attempt automatic segmentation

            const result: any = await fal.subscribe("fal-ai/sam2-video", {
                input,
                logs: true,
                onQueueUpdate: (update) => {
                    if (update.status === 'IN_PROGRESS') {
                        console.log(`[AlphaChannel] SAM 2 processing... ${update.logs?.slice(-1)?.[0]?.message || ''}`);
                    }
                },
            });

            if (!result?.video?.url) {
                throw new Error('SAM 2 did not return a mask video');
            }

            console.log(`[AlphaChannel] Mask generated: ${result.video.url}`);

            return {
                maskVideoUrl: result.video.url,
                trackId: result.track_id || 'default',
            };
        } catch (error: any) {
            console.error('[AlphaChannel] SAM 2 segmentation failed:', error);
            throw error;
        }
    }

    /**
     * Generate alpha mask for a single image using SAM 2
     */
    async generateImageMask(
        imageUrl: string,
        points?: SegmentationPoint[],
        box?: SegmentationBox
    ): Promise<string> {
        try {
            console.log(`[AlphaChannel] Generating image mask with SAM 2`);

            const input: any = {
                image_url: imageUrl,
            };

            if (points && points.length > 0) {
                input.points = points.map(p => [p.x, p.y]);
                input.labels = points.map(p => p.label);
            }

            if (box) {
                input.box = [box.x1, box.y1, box.x2, box.y2];
            }

            const result: any = await fal.subscribe("fal-ai/sam2", {
                input,
                logs: true,
            });

            if (!result?.image?.url) {
                throw new Error('SAM 2 did not return a mask image');
            }

            return result.image.url;
        } catch (error: any) {
            console.error('[AlphaChannel] SAM 2 image segmentation failed:', error);
            throw error;
        }
    }

    /**
     * Export video with alpha channel in various formats
     */
    async exportWithAlpha(options: AlphaExportOptions): Promise<AlphaExportResult> {
        const exportId = `alpha_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const exportPath = path.join(this.exportDir, options.projectId, exportId);
        fs.mkdirSync(exportPath, { recursive: true });

        console.log(`[AlphaChannel] Starting export: ${exportId}`);

        try {
            // Step 1: Generate mask using SAM 2
            const { maskVideoUrl } = await this.generateMask(
                options.videoUrl,
                options.segmentationMethod,
                options.points,
                options.box
            );

            // Step 2: Download both source video and mask video
            const sourceVideoPath = path.join(exportPath, 'source.mp4');
            const maskVideoPath = path.join(exportPath, 'mask.mp4');

            await this.downloadFile(options.videoUrl, sourceVideoPath);
            await this.downloadFile(maskVideoUrl, maskVideoPath);

            // Step 3: Export based on format
            let result: AlphaExportResult;

            switch (options.outputFormat) {
                case 'png_sequence':
                    result = await this.exportPNGSequence(exportPath, sourceVideoPath, maskVideoPath, options);
                    break;
                case 'prores4444':
                    result = await this.exportProRes4444(exportPath, sourceVideoPath, maskVideoPath, options);
                    break;
                case 'webm_alpha':
                    result = await this.exportWebMAlpha(exportPath, sourceVideoPath, maskVideoPath, options);
                    break;
                default:
                    throw new Error(`Unknown output format: ${options.outputFormat}`);
            }

            result.exportId = exportId;
            result.maskVideoUrl = maskVideoUrl;

            console.log(`[AlphaChannel] Export complete: ${result.outputPath}`);
            return result;

        } catch (error: any) {
            console.error(`[AlphaChannel] Export failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Export as PNG sequence with transparency
     * Each frame is a PNG with embedded alpha channel
     */
    private async exportPNGSequence(
        exportPath: string,
        sourceVideoPath: string,
        maskVideoPath: string,
        options: AlphaExportOptions
    ): Promise<AlphaExportResult> {
        const sequencePath = path.join(exportPath, 'frames');
        fs.mkdirSync(sequencePath, { recursive: true });

        // Get video info
        const { stdout: probeOutput } = await execAsync(
            `ffprobe -v quiet -print_format json -show_streams "${sourceVideoPath}"`
        );
        const probeData = JSON.parse(probeOutput);
        const videoStream = probeData.streams.find((s: any) => s.codec_type === 'video');
        const frameRate = options.frameRate || eval(videoStream.r_frame_rate);
        const frameCount = parseInt(videoStream.nb_frames) || 0;

        // FFmpeg command to merge source RGB with mask as alpha
        // Uses alphamerge filter: takes color from first input, alpha from second
        const ffmpegCmd = `ffmpeg -y -i "${sourceVideoPath}" -i "${maskVideoPath}" -filter_complex "[0:v][1:v]alphamerge" -pix_fmt rgba "${sequencePath}/frame_%05d.png"`;

        console.log(`[AlphaChannel] Extracting PNG sequence...`);
        await execAsync(ffmpegCmd);

        // Count actual frames
        const frames = fs.readdirSync(sequencePath).filter(f => f.endsWith('.png'));

        return {
            exportId: '',
            format: 'png_sequence',
            outputPath: sequencePath,
            frameCount: frames.length,
            duration: frames.length / frameRate,
        };
    }

    /**
     * Export as ProRes 4444 with embedded alpha
     * Industry-standard for professional VFX
     */
    private async exportProRes4444(
        exportPath: string,
        sourceVideoPath: string,
        maskVideoPath: string,
        options: AlphaExportOptions
    ): Promise<AlphaExportResult> {
        const outputPath = path.join(exportPath, `${options.exportName || 'export'}_prores4444.mov`);

        // FFmpeg command for ProRes 4444 with alpha
        // Profile 4 = ProRes 4444, which supports alpha channel
        const ffmpegCmd = `ffmpeg -y -i "${sourceVideoPath}" -i "${maskVideoPath}" -filter_complex "[0:v][1:v]alphamerge" -c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le "${outputPath}"`;

        console.log(`[AlphaChannel] Encoding ProRes 4444...`);
        await execAsync(ffmpegCmd);

        // Get duration
        const { stdout } = await execAsync(
            `ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`
        );
        const duration = parseFloat(stdout.trim());

        return {
            exportId: '',
            format: 'prores4444',
            outputPath,
            duration,
        };
    }

    /**
     * Export as WebM with VP9 alpha
     * Web-compatible format with transparency
     */
    private async exportWebMAlpha(
        exportPath: string,
        sourceVideoPath: string,
        maskVideoPath: string,
        options: AlphaExportOptions
    ): Promise<AlphaExportResult> {
        const outputPath = path.join(exportPath, `${options.exportName || 'export'}_alpha.webm`);

        // FFmpeg command for WebM VP9 with alpha
        const ffmpegCmd = `ffmpeg -y -i "${sourceVideoPath}" -i "${maskVideoPath}" -filter_complex "[0:v][1:v]alphamerge" -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 2M "${outputPath}"`;

        console.log(`[AlphaChannel] Encoding WebM with alpha...`);
        await execAsync(ffmpegCmd);

        const { stdout } = await execAsync(
            `ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`
        );
        const duration = parseFloat(stdout.trim());

        return {
            exportId: '',
            format: 'webm_alpha',
            outputPath,
            duration,
        };
    }

    /**
     * Download a file from URL to local path
     */
    private async downloadFile(url: string, destPath: string): Promise<void> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download: ${response.statusText}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(destPath, buffer);
    }

    /**
     * Get available export formats
     */
    getAvailableFormats(): Array<{ id: string; name: string; description: string; extension: string }> {
        return [
            {
                id: 'png_sequence',
                name: 'PNG Sequence',
                description: 'Individual PNG frames with alpha channel',
                extension: 'png',
            },
            {
                id: 'prores4444',
                name: 'ProRes 4444',
                description: 'Apple ProRes with embedded alpha (After Effects, Premiere)',
                extension: 'mov',
            },
            {
                id: 'webm_alpha',
                name: 'WebM VP9 Alpha',
                description: 'Web-compatible video with transparency',
                extension: 'webm',
            },
        ];
    }

    /**
     * Batch process multiple subjects in a video
     * Useful for extracting multiple characters/objects
     */
    async batchSegment(
        videoUrl: string,
        subjects: Array<{ name: string; points?: SegmentationPoint[]; box?: SegmentationBox }>
    ): Promise<Array<{ name: string; maskVideoUrl: string }>> {
        const results: Array<{ name: string; maskVideoUrl: string }> = [];

        for (const subject of subjects) {
            console.log(`[AlphaChannel] Segmenting subject: ${subject.name}`);

            const method = subject.points ? 'points' : subject.box ? 'box' : 'auto';
            const { maskVideoUrl } = await this.generateMask(
                videoUrl,
                method,
                subject.points,
                subject.box
            );

            results.push({
                name: subject.name,
                maskVideoUrl,
            });
        }

        return results;
    }

    /**
     * Clean up old exports
     */
    async cleanupExports(olderThanDays: number = 7): Promise<number> {
        let deleted = 0;
        const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

        const projects = fs.readdirSync(this.exportDir);
        for (const project of projects) {
            const projectPath = path.join(this.exportDir, project);
            if (!fs.statSync(projectPath).isDirectory()) continue;

            const exports = fs.readdirSync(projectPath);
            for (const exportDir of exports) {
                const exportPath = path.join(projectPath, exportDir);
                const stat = fs.statSync(exportPath);

                if (stat.isDirectory() && stat.mtimeMs < cutoffTime) {
                    fs.rmSync(exportPath, { recursive: true });
                    deleted++;
                }
            }
        }

        console.log(`[AlphaChannel] Cleaned up ${deleted} old exports`);
        return deleted;
    }
}
