/**
 * MasterExportService
 *
 * Professional NLE export service with L-Cut aware FFmpeg baking.
 * Supports independent audio/video trimming for J-Cut and L-Cut transitions.
 *
 * Features:
 * - L-Cut/J-Cut support via independent audio trim points
 * - FFmpeg complex filter graph for adelay/atrim
 * - 24fps CFR output for Premiere/Resolve compatibility
 * - ProRes 422 HQ option for professional workflows
 * - CMX 3600 EDL generation
 * - Sidecar JSON with full shot DNA
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../../prisma';
import { queueService, RenderJobData } from '../queue/QueueService';

const execAsync = promisify(exec);

export interface TimelineClipInput {
    id: string;
    name: string;
    videoPath: string;          // Local path or URL to download
    audioPath?: string;         // Separate audio if exists
    duration: number;           // Total clip duration
    trimStart: number;          // Video in-point (seconds)
    trimEnd: number;            // Video out-point (seconds)
    audioTrimStart: number;     // Audio in-point (may differ for L-Cut)
    audioTrimEnd: number;       // Audio out-point
    audioGain: number;          // 0-2 volume multiplier
    avLinked: boolean;          // Whether A/V are linked
    // Recipe metadata for sidecar
    prompt?: string;
    negativePrompt?: string;
    model?: string;
    seed?: number;
    lensKit?: any;
    lightingSetup?: any;
    cinematicTags?: any;
}

export interface MasterExportOptions {
    projectId: string;
    sceneChainId: string;
    exportName?: string;
    format: 'h264' | 'prores422' | 'prores4444';
    frameRate: number;          // Default 24
    resolution?: string;        // e.g., '1920x1080'
    audioCodec?: 'aac' | 'pcm'; // Default 'aac'
    includeEDL?: boolean;       // Generate CMX 3600 EDL
    includeSidecar?: boolean;   // Generate JSON with shot DNA
}

export interface MasterExportResult {
    exportId: string;
    videoPath: string;
    duration: number;
    edlPath?: string;
    sidecarPath?: string;
    clipCount: number;
}

export class MasterExportService {
    private static instance: MasterExportService;
    private exportDir: string;
    private tempDir: string;

    private constructor() {
        this.exportDir = path.join(process.cwd(), 'exports', 'master');
        this.tempDir = path.join(process.cwd(), 'exports', 'temp');

        if (!fs.existsSync(this.exportDir)) {
            fs.mkdirSync(this.exportDir, { recursive: true });
        }
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    static getInstance(): MasterExportService {
        if (!MasterExportService.instance) {
            MasterExportService.instance = new MasterExportService();
        }
        return MasterExportService.instance;
    }

    /**
     * Bake timeline with L-Cut aware audio processing
     * Main export entry point
     */
    async bakeTimeline(
        clips: TimelineClipInput[],
        options: MasterExportOptions
    ): Promise<MasterExportResult> {
        const exportId = `master_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const workDir = path.join(this.tempDir, exportId);
        fs.mkdirSync(workDir, { recursive: true });

        console.log(`[MasterExport] Starting bake: ${exportId} with ${clips.length} clips`);

        try {
            // Step 1: Download/prepare all clips locally
            const localClips = await this.prepareClips(clips, workDir);

            // Step 2: Build FFmpeg complex filter graph with L-Cut support
            const { filterGraph, outputLabels } = this.buildLCutFilterGraph(localClips, options);

            // Step 3: Execute FFmpeg bake
            const outputPath = await this.executeBake(
                localClips,
                filterGraph,
                outputLabels,
                workDir,
                options
            );

            // Step 4: Move to final export location
            const finalPath = path.join(
                this.exportDir,
                options.projectId,
                `${options.exportName || exportId}.${this.getExtension(options.format)}`
            );
            fs.mkdirSync(path.dirname(finalPath), { recursive: true });
            fs.renameSync(outputPath, finalPath);

            // Step 5: Generate EDL if requested
            let edlPath: string | undefined;
            if (options.includeEDL) {
                edlPath = await this.generateEDL(clips, finalPath, options);
            }

            // Step 6: Generate sidecar JSON if requested
            let sidecarPath: string | undefined;
            if (options.includeSidecar) {
                sidecarPath = await this.generateSidecar(clips, finalPath, options);
            }

            // Step 7: Get final duration
            const duration = await this.getVideoDuration(finalPath);

            // Cleanup temp directory
            fs.rmSync(workDir, { recursive: true, force: true });

            console.log(`[MasterExport] Bake complete: ${finalPath}`);

            return {
                exportId,
                videoPath: finalPath,
                duration,
                edlPath,
                sidecarPath,
                clipCount: clips.length,
            };

        } catch (error: any) {
            console.error(`[MasterExport] Bake failed: ${error.message}`);
            // Cleanup on error
            fs.rmSync(workDir, { recursive: true, force: true });
            throw error;
        }
    }

    /**
     * Download/copy clips to local temp directory
     */
    private async prepareClips(
        clips: TimelineClipInput[],
        workDir: string
    ): Promise<Array<TimelineClipInput & { localVideoPath: string; localAudioPath?: string }>> {
        const prepared: Array<TimelineClipInput & { localVideoPath: string; localAudioPath?: string }> = [];

        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i];
            const localVideoPath = path.join(workDir, `clip_${i}_video.mp4`);
            let localAudioPath: string | undefined;

            // Download or copy video
            if (clip.videoPath.startsWith('http')) {
                await this.downloadFile(clip.videoPath, localVideoPath);
            } else {
                fs.copyFileSync(clip.videoPath, localVideoPath);
            }

            // Handle separate audio if exists
            if (clip.audioPath) {
                localAudioPath = path.join(workDir, `clip_${i}_audio.mp3`);
                if (clip.audioPath.startsWith('http')) {
                    await this.downloadFile(clip.audioPath, localAudioPath);
                } else {
                    fs.copyFileSync(clip.audioPath, localAudioPath);
                }
            }

            prepared.push({
                ...clip,
                localVideoPath,
                localAudioPath,
            });
        }

        return prepared;
    }

    /**
     * Build FFmpeg complex filter graph with L-Cut support
     *
     * L-Cut Logic:
     * - Audio offset = audioTrimStart - trimStart
     * - If positive: audio starts AFTER video (L-cut: audio lags)
     * - If negative: audio starts BEFORE video (J-cut: audio leads)
     */
    private buildLCutFilterGraph(
        clips: Array<TimelineClipInput & { localVideoPath: string; localAudioPath?: string }>,
        options: MasterExportOptions
    ): { filterGraph: string[]; outputLabels: { video: string; audio: string } } {
        const filters: string[] = [];
        const videoOutputs: string[] = [];
        const audioOutputs: string[] = [];

        let currentVideoCursor = 0; // Track global timeline position

        clips.forEach((clip, index) => {
            const videoDuration = clip.trimEnd - clip.trimStart;
            const audioOffset = clip.audioTrimStart - clip.trimStart; // L-Cut offset

            // === VIDEO PROCESSING ===
            // Trim video and reset timestamps
            filters.push(
                `[${index}:v]trim=start=${clip.trimStart}:end=${clip.trimEnd},setpts=PTS-STARTPTS,fps=${options.frameRate}[v${index}]`
            );
            videoOutputs.push(`[v${index}]`);

            // === AUDIO PROCESSING (L-Cut Logic) ===
            // Calculate audio delay for global timeline position
            let audioDelay = (currentVideoCursor + audioOffset) * 1000; // Convert to milliseconds
            let audioTrimStart = clip.audioTrimStart;

            // Handle negative delays (J-cut: audio leads video)
            if (audioDelay < 0) {
                // Adjust audio trim to start earlier
                audioTrimStart += Math.abs(audioDelay / 1000);
                audioDelay = 0;
            }

            const audioTrimEnd = clip.audioTrimEnd;
            const audioGain = clip.audioGain || 1.0;

            // Audio filter chain: trim -> volume -> delay
            // If clip has separate audio file, use that stream
            const audioInputIndex = clip.localAudioPath ? clips.length + index : index;
            const audioStream = clip.localAudioPath ? '0' : 'a';

            filters.push(
                `[${index}:a]atrim=start=${audioTrimStart}:end=${audioTrimEnd},asetpts=PTS-STARTPTS,volume=${audioGain},adelay=${Math.floor(audioDelay)}|${Math.floor(audioDelay)}[a${index}]`
            );
            audioOutputs.push(`[a${index}]`);

            // Advance timeline cursor
            currentVideoCursor += videoDuration;
        });

        // === CONCATENATION ===
        // Concatenate all video streams
        if (clips.length > 1) {
            filters.push(
                `${videoOutputs.join('')}concat=n=${clips.length}:v=1:a=0[outv]`
            );
        } else {
            // Single clip - just alias the output
            filters.push(`[v0]copy[outv]`);
        }

        // Mix all audio streams (handles overlapping audio from L/J-cuts)
        if (clips.length > 1) {
            filters.push(
                `${audioOutputs.join('')}amix=inputs=${clips.length}:duration=longest:dropout_transition=0.1,apad=whole_dur=${currentVideoCursor}[outa]`
            );
        } else {
            filters.push(`[a0]apad=whole_dur=${currentVideoCursor}[outa]`);
        }

        return {
            filterGraph: filters,
            outputLabels: { video: 'outv', audio: 'outa' },
        };
    }

    /**
     * Execute FFmpeg with the complex filter graph
     */
    private async executeBake(
        clips: Array<TimelineClipInput & { localVideoPath: string; localAudioPath?: string }>,
        filterGraph: string[],
        outputLabels: { video: string; audio: string },
        workDir: string,
        options: MasterExportOptions
    ): Promise<string> {
        const outputPath = path.join(workDir, `output.${this.getExtension(options.format)}`);

        // Build input arguments
        const inputs = clips.flatMap(clip => {
            const args = ['-i', `"${clip.localVideoPath}"`];
            if (clip.localAudioPath) {
                args.push('-i', `"${clip.localAudioPath}"`);
            }
            return args;
        }).join(' ');

        // Build output encoding options
        const encodingOpts = this.getEncodingOptions(options);

        // Construct full FFmpeg command
        const filterComplex = filterGraph.join(';');
        const ffmpegCmd = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[${outputLabels.video}]" -map "[${outputLabels.audio}]" ${encodingOpts} "${outputPath}"`;

        console.log(`[MasterExport] Executing FFmpeg...`);
        console.log(`[MasterExport] Filter graph: ${filterComplex.substring(0, 200)}...`);

        try {
            const { stdout, stderr } = await execAsync(ffmpegCmd, { maxBuffer: 50 * 1024 * 1024 });
            if (stderr && !stderr.includes('frame=')) {
                console.log(`[MasterExport] FFmpeg stderr: ${stderr.substring(0, 500)}`);
            }
        } catch (error: any) {
            console.error(`[MasterExport] FFmpeg error: ${error.message}`);
            if (error.stderr) {
                console.error(`[MasterExport] FFmpeg stderr: ${error.stderr}`);
            }
            throw error;
        }

        return outputPath;
    }

    /**
     * Get FFmpeg encoding options based on format
     */
    private getEncodingOptions(options: MasterExportOptions): string {
        const frameRate = options.frameRate || 24;
        const audioCodec = options.audioCodec || 'aac';

        switch (options.format) {
            case 'prores422':
                // ProRes 422 HQ (profile 3) for professional editing
                return `-c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le -r ${frameRate} -vsync cfr -c:a pcm_s16le`;

            case 'prores4444':
                // ProRes 4444 with alpha support
                return `-c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le -r ${frameRate} -vsync cfr -c:a pcm_s16le`;

            case 'h264':
            default:
                // H.264 for web/preview
                return `-c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -r ${frameRate} -vsync cfr -c:a ${audioCodec} -b:a 192k`;
        }
    }

    /**
     * Get file extension for format
     */
    private getExtension(format: string): string {
        switch (format) {
            case 'prores422':
            case 'prores4444':
                return 'mov';
            case 'h264':
            default:
                return 'mp4';
        }
    }

    /**
     * Generate CMX 3600 EDL for NLE import
     */
    private async generateEDL(
        clips: TimelineClipInput[],
        videoPath: string,
        options: MasterExportOptions
    ): Promise<string> {
        const edlPath = videoPath.replace(/\.[^.]+$/, '.edl');
        const frameRate = options.frameRate || 24;

        let edl = `TITLE: ${options.exportName || 'Untitled'}\n`;
        edl += `FCM: NON-DROP FRAME\n\n`;

        let recordIn = 0; // Timeline position in seconds

        clips.forEach((clip, index) => {
            const eventNum = String(index + 1).padStart(3, '0');
            const sourceIn = clip.trimStart;
            const sourceOut = clip.trimEnd;
            const duration = sourceOut - sourceIn;
            const recordOut = recordIn + duration;

            // Format timecodes (simplified - no frame counting)
            const srcInTC = this.secondsToTimecode(sourceIn, frameRate);
            const srcOutTC = this.secondsToTimecode(sourceOut, frameRate);
            const recInTC = this.secondsToTimecode(recordIn, frameRate);
            const recOutTC = this.secondsToTimecode(recordOut, frameRate);

            edl += `${eventNum}  AX       V     C        ${srcInTC} ${srcOutTC} ${recInTC} ${recOutTC}\n`;
            edl += `* FROM CLIP NAME: ${clip.name || `Clip ${index + 1}`}\n`;

            // Add L-Cut note if audio offset exists
            const audioOffset = clip.audioTrimStart - clip.trimStart;
            if (Math.abs(audioOffset) > 0.01) {
                const cutType = audioOffset > 0 ? 'L-CUT' : 'J-CUT';
                edl += `* ${cutType}: Audio offset ${audioOffset.toFixed(2)}s\n`;
            }

            edl += `\n`;
            recordIn = recordOut;
        });

        fs.writeFileSync(edlPath, edl);
        console.log(`[MasterExport] EDL generated: ${edlPath}`);
        return edlPath;
    }

    /**
     * Generate sidecar JSON with full shot DNA
     */
    private async generateSidecar(
        clips: TimelineClipInput[],
        videoPath: string,
        options: MasterExportOptions
    ): Promise<string> {
        const sidecarPath = videoPath.replace(/\.[^.]+$/, '_dna.json');

        const sidecar = {
            exportId: path.basename(videoPath, path.extname(videoPath)),
            projectId: options.projectId,
            sceneChainId: options.sceneChainId,
            exportedAt: new Date().toISOString(),
            format: options.format,
            frameRate: options.frameRate || 24,
            clipCount: clips.length,
            shots: clips.map((clip, index) => ({
                index,
                id: clip.id,
                name: clip.name,
                duration: clip.trimEnd - clip.trimStart,
                trimStart: clip.trimStart,
                trimEnd: clip.trimEnd,
                audioTrimStart: clip.audioTrimStart,
                audioTrimEnd: clip.audioTrimEnd,
                audioGain: clip.audioGain,
                audioOffset: clip.audioTrimStart - clip.trimStart,
                avLinked: clip.avLinked,
                recipe: {
                    prompt: clip.prompt,
                    negativePrompt: clip.negativePrompt,
                    model: clip.model,
                    seed: clip.seed,
                    lensKit: clip.lensKit,
                    lightingSetup: clip.lightingSetup,
                    cinematicTags: clip.cinematicTags,
                },
            })),
        };

        fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2));
        console.log(`[MasterExport] Sidecar JSON generated: ${sidecarPath}`);
        return sidecarPath;
    }

    /**
     * Convert seconds to timecode string (HH:MM:SS:FF)
     */
    private secondsToTimecode(seconds: number, frameRate: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const frames = Math.floor((seconds % 1) * frameRate);

        return [
            String(hours).padStart(2, '0'),
            String(minutes).padStart(2, '0'),
            String(secs).padStart(2, '0'),
            String(frames).padStart(2, '0'),
        ].join(':');
    }

    /**
     * Download a file from URL
     */
    private async downloadFile(url: string, destPath: string): Promise<void> {
        console.log(`[MasterExport] Downloading: ${url.substring(0, 60)}...`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download: ${response.statusText}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(destPath, buffer);
    }

    /**
     * Get video duration using ffprobe
     */
    private async getVideoDuration(videoPath: string): Promise<number> {
        const { stdout } = await execAsync(
            `ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
        );
        return parseFloat(stdout.trim()) || 0;
    }

    /**
     * Export a scene chain from database
     */
    async exportSceneChain(
        projectId: string,
        sceneChainId: string,
        options: Partial<MasterExportOptions> = {}
    ): Promise<MasterExportResult> {
        // Fetch scene chain with segments
        const sceneChain = await prisma.sceneChain.findUnique({
            where: { id: sceneChainId },
            include: {
                segments: {
                    orderBy: { orderIndex: 'asc' },
                },
            },
        });

        if (!sceneChain) {
            throw new Error(`Scene chain not found: ${sceneChainId}`);
        }

        // Convert segments to timeline clips
        const clips: TimelineClipInput[] = sceneChain.segments
            .filter(seg => seg.outputUrl) // Only include rendered segments
            .map(seg => ({
                id: seg.id,
                name: seg.prompt?.substring(0, 50) || `Segment ${seg.orderIndex}`,
                videoPath: seg.outputUrl!,
                duration: seg.duration,
                trimStart: seg.trimStart,
                trimEnd: seg.trimEnd ?? seg.duration,
                audioTrimStart: seg.audioTrimStart,
                audioTrimEnd: seg.audioTrimEnd ?? seg.duration,
                audioGain: seg.audioGain,
                avLinked: true, // Default to linked
                prompt: seg.prompt || undefined,
                // model and seed would come from linked generation if needed
            }));

        if (clips.length === 0) {
            throw new Error('No rendered segments to export');
        }

        return this.bakeTimeline(clips, {
            projectId,
            sceneChainId,
            format: 'h264',
            frameRate: 24,
            includeEDL: true,
            includeSidecar: true,
            ...options,
        } as MasterExportOptions);
    }

    /**
     * Generate Electronic Press Kit (EPK)
     * Self-contained HTML with video, shot details, continuity heatmap, and sidecar
     */
    async generateEPK(
        projectId: string,
        sceneChainId: string,
        options: {
            title?: string;
            director?: string;
            logline?: string;
            includeVideo?: boolean;
        } = {}
    ): Promise<{ epkPath: string; videoPath?: string }> {
        const exportId = `epk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const epkDir = path.join(this.exportDir, projectId, 'epk', exportId);
        fs.mkdirSync(epkDir, { recursive: true });

        console.log(`[MasterExport] Generating EPK: ${exportId}`);

        // Fetch scene chain with segments
        const sceneChain = await prisma.sceneChain.findUnique({
            where: { id: sceneChainId },
            include: {
                segments: {
                    orderBy: { orderIndex: 'asc' },
                },
            },
        });

        if (!sceneChain) {
            throw new Error(`Scene chain not found: ${sceneChainId}`);
        }

        // Calculate continuity scores for each segment
        const segments = sceneChain.segments;
        const shotDetails = segments.map((seg, index) => {
            let continuityScore = 0;
            if (seg.firstFrameUrl) continuityScore += 25;
            if (seg.lastFrameUrl) continuityScore += 25;
            // Check if linked to previous/next
            if (index > 0 && segments[index - 1].lastFrameUrl === seg.firstFrameUrl) {
                continuityScore += 25;
            }
            if (index < segments.length - 1 && seg.lastFrameUrl === segments[index + 1].firstFrameUrl) {
                continuityScore += 25;
            }

            return {
                index: index + 1,
                id: seg.id,
                prompt: seg.prompt || 'No prompt',
                duration: seg.duration,
                status: seg.status,
                continuityScore,
                firstFrameUrl: seg.firstFrameUrl,
                lastFrameUrl: seg.lastFrameUrl,
                outputUrl: seg.outputUrl,
            };
        });

        // Export video if requested
        let videoPath: string | undefined;
        let videoFileName: string | undefined;
        if (options.includeVideo) {
            const exportResult = await this.exportSceneChain(projectId, sceneChainId, {
                format: 'h264',
                frameRate: 24,
                exportName: `${exportId}_video`,
            });
            videoPath = exportResult.videoPath;
            videoFileName = path.basename(videoPath);
            // Copy video to EPK directory
            fs.copyFileSync(videoPath, path.join(epkDir, videoFileName));
        }

        // Generate continuity heatmap colors
        const getHeatmapColor = (score: number): string => {
            if (score >= 75) return '#22c55e'; // green
            if (score >= 50) return '#eab308'; // yellow
            if (score >= 25) return '#f97316'; // orange
            return '#ef4444'; // red
        };

        // Generate HTML
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title || sceneChain.name} - Electronic Press Kit</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #fff; }
        .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 60px; }
        .header h1 { font-size: 3rem; font-weight: 700; margin-bottom: 10px; background: linear-gradient(135deg, #06b6d4, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .header .meta { color: #888; font-size: 0.9rem; }
        .logline { font-size: 1.25rem; color: #ccc; max-width: 800px; margin: 20px auto; text-align: center; font-style: italic; }
        .video-container { margin-bottom: 60px; text-align: center; }
        .video-container video { max-width: 100%; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .section { margin-bottom: 60px; }
        .section-title { font-size: 1.5rem; font-weight: 600; margin-bottom: 20px; color: #06b6d4; }
        .heatmap { display: flex; gap: 4px; padding: 20px; background: #111; border-radius: 12px; margin-bottom: 20px; overflow-x: auto; }
        .heatmap-cell { min-width: 40px; height: 40px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; color: #000; }
        .shots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .shot-card { background: #111; border-radius: 12px; padding: 20px; border: 1px solid #222; }
        .shot-card .shot-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .shot-card .shot-num { font-size: 0.875rem; color: #888; }
        .shot-card .score-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
        .shot-card .prompt { font-size: 0.875rem; color: #aaa; margin-bottom: 12px; line-height: 1.5; }
        .shot-card .frames { display: flex; gap: 10px; margin-top: 12px; }
        .shot-card .frame { flex: 1; aspect-ratio: 16/9; background: #000; border-radius: 8px; overflow: hidden; }
        .shot-card .frame img { width: 100%; height: 100%; object-fit: cover; }
        .shot-card .frame-label { font-size: 0.625rem; color: #666; text-align: center; margin-top: 4px; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
        .stat-card { background: #111; border-radius: 12px; padding: 20px; text-align: center; }
        .stat-card .value { font-size: 2rem; font-weight: 700; color: #06b6d4; }
        .stat-card .label { font-size: 0.875rem; color: #888; margin-top: 5px; }
        .footer { text-align: center; padding: 40px; color: #444; font-size: 0.875rem; }
        .download-btn { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #06b6d4, #8b5cf6); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>${options.title || sceneChain.name}</h1>
            ${options.director ? `<p class="meta">Directed by ${options.director}</p>` : ''}
            <p class="meta">Generated ${new Date().toLocaleDateString()}</p>
        </header>

        ${options.logline ? `<p class="logline">"${options.logline}"</p>` : ''}

        ${videoFileName ? `
        <div class="video-container">
            <video controls poster="">
                <source src="${videoFileName}" type="video/mp4">
            </video>
            <br>
            <a href="${videoFileName}" class="download-btn" download>Download Video</a>
        </div>
        ` : ''}

        <div class="stats">
            <div class="stat-card">
                <div class="value">${segments.length}</div>
                <div class="label">Total Shots</div>
            </div>
            <div class="stat-card">
                <div class="value">${segments.filter(s => s.status === 'complete').length}</div>
                <div class="label">Rendered</div>
            </div>
            <div class="stat-card">
                <div class="value">${segments.reduce((sum, s) => sum + s.duration, 0).toFixed(1)}s</div>
                <div class="label">Total Duration</div>
            </div>
            <div class="stat-card">
                <div class="value">${Math.round(shotDetails.reduce((sum, s) => sum + s.continuityScore, 0) / shotDetails.length)}%</div>
                <div class="label">Avg Continuity</div>
            </div>
        </div>

        <section class="section">
            <h2 class="section-title">Continuity Heatmap</h2>
            <div class="heatmap">
                ${shotDetails.map(s => `
                    <div class="heatmap-cell" style="background: ${getHeatmapColor(s.continuityScore)}" title="Shot ${s.index}: ${s.continuityScore}%">
                        ${s.index}
                    </div>
                `).join('')}
            </div>
        </section>

        <section class="section">
            <h2 class="section-title">Shot Breakdown</h2>
            <div class="shots-grid">
                ${shotDetails.map(s => `
                    <div class="shot-card">
                        <div class="shot-header">
                            <span class="shot-num">Shot ${s.index}</span>
                            <span class="score-badge" style="background: ${getHeatmapColor(s.continuityScore)}20; color: ${getHeatmapColor(s.continuityScore)}">
                                ${s.continuityScore}% continuity
                            </span>
                        </div>
                        <p class="prompt">${s.prompt.substring(0, 150)}${s.prompt.length > 150 ? '...' : ''}</p>
                        <div class="frames">
                            ${s.firstFrameUrl ? `
                                <div class="frame">
                                    <img src="${s.firstFrameUrl}" alt="First frame">
                                </div>
                            ` : '<div class="frame"></div>'}
                            ${s.lastFrameUrl ? `
                                <div class="frame">
                                    <img src="${s.lastFrameUrl}" alt="Last frame">
                                </div>
                            ` : '<div class="frame"></div>'}
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                            <span class="frame-label">First Frame</span>
                            <span class="frame-label">Last Frame</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>

        <footer class="footer">
            <p>Generated with VibeBoard</p>
            <p>Export ID: ${exportId}</p>
        </footer>
    </div>
</body>
</html>`;

        const htmlPath = path.join(epkDir, 'index.html');
        fs.writeFileSync(htmlPath, html);

        // Also save the sidecar JSON
        const sidecarData = {
            exportId,
            projectId,
            sceneChainId,
            title: options.title || sceneChain.name,
            director: options.director,
            logline: options.logline,
            generatedAt: new Date().toISOString(),
            shots: shotDetails,
        };
        fs.writeFileSync(path.join(epkDir, 'epk_data.json'), JSON.stringify(sidecarData, null, 2));

        console.log(`[MasterExport] EPK generated: ${htmlPath}`);

        return {
            epkPath: htmlPath,
            videoPath: videoPath ? path.join(epkDir, videoFileName!) : undefined,
        };
    }

    /**
     * Preview a single clip with L-Cut applied
     */
    async previewClip(clip: TimelineClipInput, options: { format?: string; frameRate?: number } = {}): Promise<string> {
        const exportId = `preview_${Date.now()}`;
        const workDir = path.join(this.tempDir, exportId);
        fs.mkdirSync(workDir, { recursive: true });

        try {
            const [prepared] = await this.prepareClips([clip], workDir);

            const { filterGraph, outputLabels } = this.buildLCutFilterGraph([prepared], {
                projectId: '',
                sceneChainId: '',
                format: 'h264',
                frameRate: options.frameRate || 24,
            });

            const outputPath = await this.executeBake(
                [prepared],
                filterGraph,
                outputLabels,
                workDir,
                {
                    projectId: '',
                    sceneChainId: '',
                    format: 'h264',
                    frameRate: options.frameRate || 24,
                }
            );

            return outputPath;
        } catch (error) {
            fs.rmSync(workDir, { recursive: true, force: true });
            throw error;
        }
    }

    // ========================================
    // Queue-Based Async Methods
    // ========================================

    /**
     * Submit timeline bake job to queue (async)
     * Returns job ID for polling status
     */
    async bakeTimelineAsync(
        clips: TimelineClipInput[],
        options: MasterExportOptions
    ): Promise<{ jobId: string; exportId: string }> {
        const exportId = `master_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        // Prepare output path
        const outputPath = path.join(
            this.exportDir,
            options.projectId,
            `${options.exportName || exportId}.${this.getExtension(options.format)}`
        );

        // Collect input paths from clips
        const inputPaths = clips.map(c => c.videoPath);

        // Submit to render queue
        const job = await queueService.addRenderJob({
            type: 'bake',
            projectId: options.projectId,
            inputPaths,
            outputPath,
            options: {
                codec: options.format === 'h264' ? 'h264' : 'prores',
                fps: options.frameRate || 24,
            },
            // Store full data for worker to process
            metadata: {
                clips: JSON.stringify(clips),
                options: JSON.stringify(options),
                exportId,
            },
        } as RenderJobData & { metadata: Record<string, string> });

        const jobId = job.id!;
        console.log(`[MasterExport] Bake job submitted: ${jobId} (exportId: ${exportId})`);

        return { jobId, exportId };
    }

    /**
     * Submit scene chain export job to queue (async)
     */
    async exportSceneChainAsync(
        projectId: string,
        sceneChainId: string,
        options: Partial<MasterExportOptions> = {}
    ): Promise<{ jobId: string; exportId: string }> {
        // Fetch scene chain to get clips
        const sceneChain = await prisma.sceneChain.findUnique({
            where: { id: sceneChainId },
            include: {
                segments: {
                    orderBy: { orderIndex: 'asc' },
                },
            },
        });

        if (!sceneChain) {
            throw new Error(`Scene chain not found: ${sceneChainId}`);
        }

        // Convert segments to timeline clips
        const clips: TimelineClipInput[] = sceneChain.segments
            .filter(seg => seg.outputUrl)
            .map(seg => ({
                id: seg.id,
                name: seg.prompt?.substring(0, 50) || `Segment ${seg.orderIndex}`,
                videoPath: seg.outputUrl!,
                duration: seg.duration,
                trimStart: seg.trimStart,
                trimEnd: seg.trimEnd ?? seg.duration,
                audioTrimStart: seg.audioTrimStart,
                audioTrimEnd: seg.audioTrimEnd ?? seg.duration,
                audioGain: seg.audioGain,
                avLinked: true,
                prompt: seg.prompt || undefined,
            }));

        if (clips.length === 0) {
            throw new Error('No rendered segments to export');
        }

        return this.bakeTimelineAsync(clips, {
            projectId,
            sceneChainId,
            format: 'h264',
            frameRate: 24,
            includeEDL: true,
            includeSidecar: true,
            ...options,
        } as MasterExportOptions);
    }

    /**
     * Get job status from queue
     */
    async getJobStatus(jobId: string): Promise<{
        status: 'waiting' | 'active' | 'completed' | 'failed';
        progress?: number;
        result?: MasterExportResult;
        error?: string;
    }> {
        const status = await queueService.getJobStatus('render', jobId);

        if (!status) {
            return { status: 'waiting' };
        }

        if (status.state === 'completed' && status.result) {
            return {
                status: 'completed',
                progress: 100,
                result: status.result.data as MasterExportResult,
            };
        }

        if (status.state === 'failed') {
            return {
                status: 'failed',
                error: status.result?.error || 'Unknown error',
            };
        }

        return {
            status: status.state as 'waiting' | 'active',
            progress: status.progress,
        };
    }

    /**
     * Cancel a pending or active bake job
     */
    async cancelJob(jobId: string): Promise<boolean> {
        try {
            const queue = queueService.getQueue('render');
            if (!queue) return false;

            const job = await queue.getJob(jobId);
            if (!job) return false;

            const state = await job.getState();
            if (state === 'waiting' || state === 'delayed') {
                await job.remove();
                console.log(`[MasterExport] Job ${jobId} cancelled`);
                return true;
            }

            // Can't cancel active jobs easily
            return false;
        } catch (error) {
            console.error(`[MasterExport] Failed to cancel job ${jobId}:`, error);
            return false;
        }
    }
}
