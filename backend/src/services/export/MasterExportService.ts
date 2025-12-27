/**
 * Master Export Service
 *
 * The "Victory Lap" - Final production export with:
 * 1. FFmpeg muxing: Combines video + audio into single production-ready file
 * 2. Frame rate enforcement: Converts to constant 24fps for NLE compatibility
 * 3. Sidecar metadata: JSON/XML with complete "Shot DNA" for re-import
 * 4. EPK (Electronic Press Kit): PDF/HTML with scene analysis, lighting recipes
 *
 * This transforms VibeBoard from a generator into a production pipeline.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../prisma';
import { renderQueueService } from '../rendering/RenderQueueService';
import { ShotRecipe } from '../rendering/RenderQueueTypes';

// ============================================================================
// TYPES
// ============================================================================

export interface ExportOptions {
    /** Target frame rate (default: 24) */
    fps?: number;
    /** Audio file URL or path (optional) */
    audioUrl?: string;
    /** Include sidecar JSON with shot DNA */
    includeSidecar?: boolean;
    /** Generate EDL (Edit Decision List) */
    generateEDL?: boolean;
    /** Video codec (default: h264) */
    videoCodec?: 'h264' | 'prores' | 'hevc';
    /** Quality preset */
    quality?: 'fast' | 'balanced' | 'master';
}

/**
 * ShotDNA extends ShotRecipe with additional export metadata
 * Uses same types as ShotRecipe for compatibility
 */
export interface ShotDNA extends Partial<ShotRecipe> {
    /** Unique shot ID */
    id: string;
    /** Shot index in scene */
    orderIndex: number;
    /** AI model used */
    model: string;
    /** Random seed (for reproducibility) */
    seed?: number;
    /** Output URL */
    outputUrl?: string;
    /** Acoustic settings */
    acousticSettings?: {
        reverbLevel: number;
        stereoWidth: number;
        foleyDetail: number;
    };
}

export interface SceneExport {
    /** Export ID */
    id: string;
    /** Scene chain ID */
    sceneChainId: string;
    /** Scene name */
    name: string;
    /** Total duration */
    totalDuration: number;
    /** Export timestamp */
    exportedAt: string;
    /** VibeBoard version */
    version: string;
    /** All shots with their DNA */
    shots: ShotDNA[];
    /** Combined video URL */
    videoUrl?: string;
    /** Audio URL */
    audioUrl?: string;
    /** Sidecar JSON path */
    sidecarPath?: string;
    /** EDL path */
    edlPath?: string;
}

export interface ExportResult {
    success: boolean;
    exportId: string;
    outputPath: string;
    sidecarPath?: string;
    edlPath?: string;
    duration: number;
    fileSize: number;
    error?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

class MasterExportService {
    private static instance: MasterExportService;
    private exportsDir: string;

    private constructor() {
        this.exportsDir = path.join(process.cwd(), 'exports');
        this.ensureExportsDir();
    }

    static getInstance(): MasterExportService {
        if (!MasterExportService.instance) {
            MasterExportService.instance = new MasterExportService();
        }
        return MasterExportService.instance;
    }

    private ensureExportsDir(): void {
        if (!fs.existsSync(this.exportsDir)) {
            fs.mkdirSync(this.exportsDir, { recursive: true });
        }
    }

    /**
     * Bake & Export: Mux video with audio, enforce 24fps
     */
    async bakeAndExport(
        sceneChainId: string,
        options: ExportOptions = {}
    ): Promise<ExportResult> {
        const exportId = uuidv4();
        const outputDir = path.join(this.exportsDir, exportId);
        fs.mkdirSync(outputDir, { recursive: true });

        const fps = options.fps || 24;
        const quality = options.quality || 'balanced';
        const videoCodec = options.videoCodec || 'h264';

        try {
            // 1. Gather all shots from the scene chain
            const chain = await prisma.sceneChain.findUnique({
                where: { id: sceneChainId },
                include: {
                    segments: {
                        orderBy: { orderIndex: 'asc' }
                    }
                }
            });

            if (!chain) {
                throw new Error(`Scene chain ${sceneChainId} not found`);
            }

            // 2. Get version stacks to find best outputs
            const stacks = await renderQueueService.getAllVersionStacks(sceneChainId);

            // 3. Collect video files and build shot DNA
            const shotDNAs: ShotDNA[] = [];
            const videoFiles: string[] = [];
            let totalDuration = 0;

            for (const segment of chain.segments) {
                const stack = stacks.find(s => s.shotId === segment.id);
                const bestVersion = stack?.versions
                    .filter(v => v.status === 'complete')
                    .sort((a, b) => {
                        const rank = { draft: 1, review: 2, master: 3 };
                        return rank[b.quality] - rank[a.quality];
                    })[0];

                if (bestVersion?.outputUrl) {
                    videoFiles.push(bestVersion.outputUrl);
                    totalDuration += segment.duration || 5;

                    // Build Shot DNA
                    const dna: ShotDNA = {
                        id: segment.id,
                        orderIndex: segment.orderIndex,
                        prompt: segment.prompt || '',
                        model: bestVersion.model || 'unknown',
                        seed: bestVersion.seed,
                        aspectRatio: chain.aspectRatio || '16:9',
                        duration: segment.duration || 5,
                        firstFrameUrl: segment.firstFrameUrl || undefined,
                        lastFrameUrl: segment.lastFrameUrl || undefined,
                        outputUrl: bestVersion.outputUrl,
                    };

                    // Parse recipe for additional settings
                    if (stack?.recipe) {
                        dna.negativePrompt = stack.recipe.negativePrompt;
                        dna.guidanceScale = stack.recipe.guidanceScale;
                        dna.inferenceSteps = stack.recipe.inferenceSteps;
                        dna.lensKit = stack.recipe.lensKit;
                        dna.lightingSetup = stack.recipe.lightingSetup;
                        dna.cinematicTags = stack.recipe.cinematicTags;
                        dna.loras = stack.recipe.loras;
                    }

                    shotDNAs.push(dna);
                }
            }

            if (videoFiles.length === 0) {
                throw new Error('No completed videos found in scene chain');
            }

            // 4. Create concat file for FFmpeg
            const concatFilePath = path.join(outputDir, 'concat.txt');
            const concatContent = videoFiles.map(f => `file '${f}'`).join('\n');
            fs.writeFileSync(concatFilePath, concatContent);

            // 5. Build FFmpeg command
            const outputFilename = `${chain.name || 'export'}_${exportId.slice(0, 8)}.mp4`;
            const outputPath = path.join(outputDir, outputFilename);

            const ffmpegArgs = this.buildFFmpegArgs({
                concatFilePath,
                outputPath,
                fps,
                quality,
                videoCodec,
                audioUrl: options.audioUrl,
            });

            // 6. Run FFmpeg
            console.log(`[MasterExport] Running FFmpeg with args:`, ffmpegArgs.join(' '));
            await this.runFFmpeg(ffmpegArgs);

            // 7. Generate sidecar JSON if requested
            let sidecarPath: string | undefined;
            if (options.includeSidecar !== false) {
                sidecarPath = path.join(outputDir, `${chain.name || 'export'}_sidecar.json`);
                const sceneExport: SceneExport = {
                    id: exportId,
                    sceneChainId,
                    name: chain.name,
                    totalDuration,
                    exportedAt: new Date().toISOString(),
                    version: '1.0.0',
                    shots: shotDNAs,
                    videoUrl: outputPath,
                    audioUrl: options.audioUrl,
                    sidecarPath,
                };
                fs.writeFileSync(sidecarPath, JSON.stringify(sceneExport, null, 2));
                console.log(`[MasterExport] Sidecar written to: ${sidecarPath}`);
            }

            // 8. Generate EDL if requested
            let edlPath: string | undefined;
            if (options.generateEDL) {
                edlPath = path.join(outputDir, `${chain.name || 'export'}.edl`);
                const edlContent = this.generateEDL(shotDNAs, chain.name, fps);
                fs.writeFileSync(edlPath, edlContent);
                console.log(`[MasterExport] EDL written to: ${edlPath}`);
            }

            // 9. Get file size
            const stats = fs.statSync(outputPath);

            return {
                success: true,
                exportId,
                outputPath,
                sidecarPath,
                edlPath,
                duration: totalDuration,
                fileSize: stats.size,
            };
        } catch (error) {
            console.error('[MasterExport] Export failed:', error);
            return {
                success: false,
                exportId,
                outputPath: '',
                duration: 0,
                fileSize: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Build FFmpeg arguments for muxing
     */
    private buildFFmpegArgs(params: {
        concatFilePath: string;
        outputPath: string;
        fps: number;
        quality: 'fast' | 'balanced' | 'master';
        videoCodec: 'h264' | 'prores' | 'hevc';
        audioUrl?: string;
    }): string[] {
        const { concatFilePath, outputPath, fps, quality, videoCodec, audioUrl } = params;

        const args: string[] = [
            '-y', // Overwrite output
            '-f', 'concat',
            '-safe', '0',
            '-i', concatFilePath,
        ];

        // Add audio input if provided
        if (audioUrl) {
            args.push('-i', audioUrl);
        }

        // Video codec settings
        switch (videoCodec) {
            case 'prores':
                args.push('-c:v', 'prores_ks', '-profile:v', '3');
                break;
            case 'hevc':
                args.push('-c:v', 'libx265');
                break;
            default: // h264
                args.push('-c:v', 'libx264');
        }

        // Quality presets
        switch (quality) {
            case 'fast':
                args.push('-preset', 'fast', '-crf', '23');
                break;
            case 'master':
                args.push('-preset', 'slow', '-crf', '18');
                break;
            default: // balanced
                args.push('-preset', 'medium', '-crf', '20');
        }

        // CRITICAL: Enforce constant frame rate (24fps)
        // AI video often has variable frame rate which breaks NLE workflows
        args.push('-r', String(fps));
        args.push('-vsync', 'cfr'); // Constant frame rate

        // Audio settings
        if (audioUrl) {
            args.push('-c:a', 'aac', '-b:a', '192k');
            args.push('-map', '0:v:0', '-map', '1:a:0');
            args.push('-shortest'); // Match shortest stream
        } else {
            args.push('-an'); // No audio if none provided
        }

        // Pixel format for compatibility
        args.push('-pix_fmt', 'yuv420p');

        args.push(outputPath);

        return args;
    }

    /**
     * Run FFmpeg command
     */
    private runFFmpeg(args: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', args);

            let stderr = '';

            ffmpeg.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
                }
            });

            ffmpeg.on('error', (err) => {
                reject(new Error(`Failed to start FFmpeg: ${err.message}`));
            });
        });
    }

    /**
     * Generate EDL (Edit Decision List) for NLE import
     *
     * Standard CMX 3600 format compatible with:
     * - DaVinci Resolve
     * - Adobe Premiere Pro
     * - Final Cut Pro
     * - Avid Media Composer
     */
    private generateEDL(shots: ShotDNA[], sceneName: string, fps: number): string {
        const lines: string[] = [];

        // EDL Header
        lines.push(`TITLE: ${sceneName}`);
        lines.push(`FCM: NON-DROP FRAME`);
        lines.push('');

        let timelinePosition = 0;

        shots.forEach((shot, index) => {
            const editNumber = String(index + 1).padStart(3, '0');
            const reelName = `VB${String(index + 1).padStart(4, '0')}`;
            const shotDuration = shot.duration || 5;
            const shotPrompt = shot.prompt || '';

            const startTC = this.secondsToTimecode(timelinePosition, fps);
            const endTC = this.secondsToTimecode(timelinePosition + shotDuration, fps);

            // EDL Event Line (CMX 3600 format)
            // Format: EDIT# REEL CHANNEL TRANSITION SOURCE_IN SOURCE_OUT REC_IN REC_OUT
            lines.push(`${editNumber}  ${reelName} V     C        00:00:00:00 ${this.secondsToTimecode(shotDuration, fps)} ${startTC} ${endTC}`);

            // Optional: Add comment with shot details
            lines.push(`* FROM CLIP NAME: ${shotPrompt.slice(0, 50)}...`);
            lines.push(`* SHOT ID: ${shot.id}`);
            if (shot.seed) {
                lines.push(`* SEED: ${shot.seed}`);
            }
            lines.push('');

            timelinePosition += shotDuration;
        });

        return lines.join('\n');
    }

    /**
     * Convert seconds to SMPTE timecode
     */
    private secondsToTimecode(seconds: number, fps: number): string {
        const totalFrames = Math.floor(seconds * fps);
        const frames = totalFrames % fps;
        const secs = Math.floor(totalFrames / fps) % 60;
        const mins = Math.floor(totalFrames / (fps * 60)) % 60;
        const hours = Math.floor(totalFrames / (fps * 60 * 60));

        return [
            String(hours).padStart(2, '0'),
            String(mins).padStart(2, '0'),
            String(secs).padStart(2, '0'),
            String(frames).padStart(2, '0'),
        ].join(':');
    }

    /**
     * Export single shot as production file with full metadata
     */
    async exportSingleShot(
        sceneChainId: string,
        shotId: string,
        options: ExportOptions = {}
    ): Promise<ExportResult> {
        const exportId = uuidv4();
        const outputDir = path.join(this.exportsDir, exportId);
        fs.mkdirSync(outputDir, { recursive: true });

        try {
            const stack = await renderQueueService.getVersionStack(sceneChainId, shotId);
            if (!stack) {
                throw new Error(`Shot ${shotId} not found`);
            }

            const bestVersion = stack.versions
                .filter(v => v.status === 'complete')
                .sort((a, b) => {
                    const rank = { draft: 1, review: 2, master: 3 };
                    return rank[b.quality] - rank[a.quality];
                })[0];

            if (!bestVersion?.outputUrl) {
                throw new Error('No completed render found for shot');
            }

            // Build shot DNA
            const dna: ShotDNA = {
                id: shotId,
                orderIndex: 0,
                prompt: stack.recipe.prompt || '',
                model: bestVersion.model || 'unknown',
                seed: bestVersion.seed,
                aspectRatio: stack.recipe.aspectRatio || '16:9',
                duration: stack.recipe.duration || 5,
                negativePrompt: stack.recipe.negativePrompt,
                guidanceScale: stack.recipe.guidanceScale,
                inferenceSteps: stack.recipe.inferenceSteps,
                lensKit: stack.recipe.lensKit,
                lightingSetup: stack.recipe.lightingSetup,
                cinematicTags: stack.recipe.cinematicTags,
                loras: stack.recipe.loras,
                firstFrameUrl: stack.recipe.firstFrameUrl,
                lastFrameUrl: stack.recipe.lastFrameUrl,
                outputUrl: bestVersion.outputUrl,
            };

            // Convert to constant 24fps
            const fps = options.fps || 24;
            const outputFilename = `shot_${shotId.slice(0, 8)}_${exportId.slice(0, 8)}.mp4`;
            const outputPath = path.join(outputDir, outputFilename);

            const ffmpegArgs = [
                '-y',
                '-i', bestVersion.outputUrl,
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', '18',
                '-r', String(fps),
                '-vsync', 'cfr',
                '-pix_fmt', 'yuv420p',
            ];

            if (options.audioUrl) {
                ffmpegArgs.push('-i', options.audioUrl);
                ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k');
                ffmpegArgs.push('-map', '0:v:0', '-map', '1:a:0');
                ffmpegArgs.push('-shortest');
            } else {
                ffmpegArgs.push('-an');
            }

            ffmpegArgs.push(outputPath);

            await this.runFFmpeg(ffmpegArgs);

            // Write sidecar
            let sidecarPath: string | undefined;
            if (options.includeSidecar !== false) {
                sidecarPath = path.join(outputDir, `shot_${shotId.slice(0, 8)}_sidecar.json`);
                fs.writeFileSync(sidecarPath, JSON.stringify(dna, null, 2));
            }

            const stats = fs.statSync(outputPath);

            return {
                success: true,
                exportId,
                outputPath,
                sidecarPath,
                duration: dna.duration || 5,
                fileSize: stats.size,
            };
        } catch (error) {
            console.error('[MasterExport] Single shot export failed:', error);
            return {
                success: false,
                exportId,
                outputPath: '',
                duration: 0,
                fileSize: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Get list of exports for a project
     */
    async getExportsForProject(projectId: string): Promise<Array<{
        id: string;
        sceneChainId: string;
        name: string;
        createdAt: Date;
        fileSize: number;
    }>> {
        // Read exports directory
        const exports: Array<{
            id: string;
            sceneChainId: string;
            name: string;
            createdAt: Date;
            fileSize: number;
        }> = [];

        if (!fs.existsSync(this.exportsDir)) {
            return exports;
        }

        const dirs = fs.readdirSync(this.exportsDir);
        for (const dir of dirs) {
            const sidecarPath = path.join(this.exportsDir, dir);
            const files = fs.readdirSync(sidecarPath);
            const sidecarFile = files.find(f => f.endsWith('_sidecar.json'));

            if (sidecarFile) {
                try {
                    const content = fs.readFileSync(path.join(sidecarPath, sidecarFile), 'utf-8');
                    const data = JSON.parse(content) as SceneExport;

                    // Check if this belongs to the project
                    const chain = await prisma.sceneChain.findUnique({
                        where: { id: data.sceneChainId },
                        select: { projectId: true }
                    });

                    if (chain?.projectId === projectId) {
                        const videoFile = files.find(f => f.endsWith('.mp4'));
                        const videoPath = videoFile ? path.join(sidecarPath, videoFile) : null;
                        const stats = videoPath ? fs.statSync(videoPath) : null;

                        exports.push({
                            id: data.id,
                            sceneChainId: data.sceneChainId,
                            name: data.name,
                            createdAt: new Date(data.exportedAt),
                            fileSize: stats?.size || 0,
                        });
                    }
                } catch (e) {
                    // Skip invalid exports
                }
            }
        }

        return exports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    /**
     * Generate EPK (Electronic Press Kit)
     *
     * Creates a self-contained HTML page with:
     * - Project/Scene overview
     * - Video embed with poster frame
     * - Shot-by-shot breakdown (lens, lighting, prompt)
     * - Continuity heatmap summary
     * - Downloadable sidecar JSON
     *
     * This is the "pitch tool" - what directors use to sell their vision.
     */
    async generateEPK(
        sceneChainId: string,
        options: {
            title?: string;
            description?: string;
            author?: string;
            includeContinuityHeatmap?: boolean;
        } = {}
    ): Promise<{
        success: boolean;
        exportId: string;
        htmlPath: string;
        sidecarPath: string;
        error?: string;
    }> {
        const exportId = uuidv4();
        const outputDir = path.join(this.exportsDir, exportId);
        fs.mkdirSync(outputDir, { recursive: true });

        try {
            // 1. Get scene chain and all data
            const chain = await prisma.sceneChain.findUnique({
                where: { id: sceneChainId },
                include: {
                    segments: {
                        orderBy: { orderIndex: 'asc' }
                    },
                    project: true
                }
            });

            if (!chain) {
                throw new Error(`Scene chain ${sceneChainId} not found`);
            }

            // 2. Get version stacks for full shot data
            const stacks = await renderQueueService.getAllVersionStacks(sceneChainId);

            // 3. Build shot DNA array with full recipes
            const shotDNAs: ShotDNA[] = [];
            let totalDuration = 0;

            for (const segment of chain.segments) {
                const stack = stacks.find(s => s.shotId === segment.id);
                const bestVersion = stack?.versions
                    .filter(v => v.status === 'complete')
                    .sort((a, b) => {
                        const rank = { draft: 1, review: 2, master: 3 };
                        return rank[b.quality] - rank[a.quality];
                    })[0];

                const dna: ShotDNA = {
                    id: segment.id,
                    orderIndex: segment.orderIndex,
                    prompt: segment.prompt || '',
                    model: bestVersion?.model || 'unknown',
                    seed: bestVersion?.seed,
                    aspectRatio: chain.aspectRatio || '16:9',
                    duration: segment.duration || 5,
                    firstFrameUrl: segment.firstFrameUrl || undefined,
                    lastFrameUrl: segment.lastFrameUrl || undefined,
                    outputUrl: bestVersion?.outputUrl,
                };

                if (stack?.recipe) {
                    dna.negativePrompt = stack.recipe.negativePrompt;
                    dna.guidanceScale = stack.recipe.guidanceScale;
                    dna.inferenceSteps = stack.recipe.inferenceSteps;
                    dna.lensKit = stack.recipe.lensKit;
                    dna.lightingSetup = stack.recipe.lightingSetup;
                    dna.cinematicTags = stack.recipe.cinematicTags;
                    dna.loras = stack.recipe.loras;
                }

                shotDNAs.push(dna);
                totalDuration += segment.duration || 5;
            }

            // 4. Write sidecar JSON
            const sidecarPath = path.join(outputDir, 'project_sidecar.json');
            const sceneExport: SceneExport = {
                id: exportId,
                sceneChainId,
                name: chain.name,
                totalDuration,
                exportedAt: new Date().toISOString(),
                version: '1.0.0',
                shots: shotDNAs,
            };
            fs.writeFileSync(sidecarPath, JSON.stringify(sceneExport, null, 2));

            // 5. Generate HTML EPK
            const htmlPath = path.join(outputDir, 'epk.html');
            const htmlContent = this.generateEPKHtml({
                exportId,
                title: options.title || chain.name,
                description: options.description || `Scene created with VibeBoard`,
                author: options.author || 'VibeBoard Studio',
                projectName: chain.project?.name || 'Untitled Project',
                sceneName: chain.name,
                totalDuration,
                shots: shotDNAs,
                sidecarFilename: 'project_sidecar.json',
                includeContinuityHeatmap: options.includeContinuityHeatmap !== false,
            });
            fs.writeFileSync(htmlPath, htmlContent);

            console.log(`[MasterExport] EPK generated at: ${htmlPath}`);

            return {
                success: true,
                exportId,
                htmlPath,
                sidecarPath,
            };
        } catch (error) {
            console.error('[MasterExport] EPK generation failed:', error);
            return {
                success: false,
                exportId,
                htmlPath: '',
                sidecarPath: '',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Generate HTML content for EPK
     */
    private generateEPKHtml(params: {
        exportId: string;
        title: string;
        description: string;
        author: string;
        projectName: string;
        sceneName: string;
        totalDuration: number;
        shots: ShotDNA[];
        sidecarFilename: string;
        includeContinuityHeatmap: boolean;
    }): string {
        const {
            exportId,
            title,
            description,
            author,
            projectName,
            sceneName,
            totalDuration,
            shots,
            sidecarFilename,
            includeContinuityHeatmap,
        } = params;

        // Generate shot cards HTML
        const shotCardsHtml = shots.map((shot, index) => {
            const lensInfo = shot.lensKit
                ? `<div class="recipe-item"><span class="label">Lens:</span> ${this.formatLensKit(shot.lensKit)}</div>`
                : '';
            const lightingInfo = shot.lightingSetup
                ? `<div class="recipe-item"><span class="label">Lighting:</span> ${this.formatLightingSetup(shot.lightingSetup)}</div>`
                : '';
            const tagsInfo = shot.cinematicTags
                ? `<div class="recipe-item"><span class="label">Tags:</span> ${this.formatCinematicTags(shot.cinematicTags)}</div>`
                : '';

            return `
                <div class="shot-card">
                    <div class="shot-header">
                        <span class="shot-number">Shot ${index + 1}</span>
                        <span class="shot-duration">${shot.duration || 5}s</span>
                    </div>
                    ${shot.firstFrameUrl ? `<img src="${shot.firstFrameUrl}" alt="Shot ${index + 1}" class="shot-thumbnail" />` : '<div class="shot-placeholder">No thumbnail</div>'}
                    <div class="shot-details">
                        <div class="prompt">${this.escapeHtml(shot.prompt || '').slice(0, 150)}${(shot.prompt?.length || 0) > 150 ? '...' : ''}</div>
                        <div class="recipe">
                            ${lensInfo}
                            ${lightingInfo}
                            ${tagsInfo}
                            <div class="recipe-item"><span class="label">Model:</span> ${shot.model}</div>
                            ${shot.seed ? `<div class="recipe-item"><span class="label">Seed:</span> ${shot.seed}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Generate continuity heatmap section
        const continuitySection = includeContinuityHeatmap ? `
            <section class="section continuity">
                <h2>Continuity Analysis</h2>
                <div class="heatmap-grid">
                    ${shots.map((shot, i) => {
                        // Simple continuity score based on connected frames
                        const hasFirstFrame = !!shot.firstFrameUrl;
                        const hasLastFrame = !!shot.lastFrameUrl;
                        const prevShot = shots[i - 1];
                        const nextShot = shots[i + 1];
                        const linkedToPrev = prevShot?.lastFrameUrl === shot.firstFrameUrl;
                        const linkedToNext = shot.lastFrameUrl === nextShot?.firstFrameUrl;

                        let score = 0;
                        if (hasFirstFrame) score += 25;
                        if (hasLastFrame) score += 25;
                        if (linkedToPrev) score += 25;
                        if (linkedToNext) score += 25;

                        const color = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : score >= 25 ? '#f97316' : '#ef4444';

                        return `
                            <div class="heatmap-cell" style="background-color: ${color}20; border-color: ${color}">
                                <span class="cell-label">${i + 1}</span>
                                <span class="cell-score">${score}%</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="legend">
                    <span><span class="dot" style="background: #22c55e"></span> Fully Linked (75-100%)</span>
                    <span><span class="dot" style="background: #eab308"></span> Partially Linked (50-74%)</span>
                    <span><span class="dot" style="background: #f97316"></span> Needs Work (25-49%)</span>
                    <span><span class="dot" style="background: #ef4444"></span> Missing Links (0-24%)</span>
                </div>
            </section>
        ` : '';

        // Full HTML document
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(title)} - Electronic Press Kit</title>
    <style>
        :root {
            --bg-primary: #0a0a0a;
            --bg-secondary: #141414;
            --bg-tertiary: #1f1f1f;
            --text-primary: #ffffff;
            --text-secondary: #a1a1aa;
            --accent-purple: #a855f7;
            --accent-cyan: #22d3ee;
            --accent-green: #22c55e;
            --border-color: #27272a;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }

        header {
            text-align: center;
            padding: 3rem 0;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 3rem;
        }

        .logo {
            font-size: 0.875rem;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: var(--accent-purple);
            margin-bottom: 1rem;
        }

        h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            background: linear-gradient(135deg, var(--accent-purple), var(--accent-cyan));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .subtitle {
            color: var(--text-secondary);
            font-size: 1.125rem;
        }

        .meta {
            display: flex;
            justify-content: center;
            gap: 2rem;
            margin-top: 1.5rem;
            color: var(--text-secondary);
            font-size: 0.875rem;
        }

        .meta-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .section {
            margin-bottom: 3rem;
        }

        h2 {
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid var(--border-color);
        }

        .shots-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.5rem;
        }

        .shot-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .shot-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }

        .shot-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 1rem;
            background: var(--bg-tertiary);
        }

        .shot-number {
            font-weight: 600;
            color: var(--accent-cyan);
        }

        .shot-duration {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .shot-thumbnail {
            width: 100%;
            aspect-ratio: 16/9;
            object-fit: cover;
            display: block;
        }

        .shot-placeholder {
            width: 100%;
            aspect-ratio: 16/9;
            background: var(--bg-tertiary);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
        }

        .shot-details {
            padding: 1rem;
        }

        .prompt {
            font-size: 0.875rem;
            color: var(--text-secondary);
            margin-bottom: 1rem;
            font-style: italic;
        }

        .recipe {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .recipe-item {
            font-size: 0.75rem;
            color: var(--text-secondary);
        }

        .recipe-item .label {
            color: var(--accent-purple);
            font-weight: 500;
        }

        .continuity {
            background: var(--bg-secondary);
            padding: 2rem;
            border-radius: 12px;
            border: 1px solid var(--border-color);
        }

        .heatmap-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
        }

        .heatmap-cell {
            width: 60px;
            height: 60px;
            border-radius: 8px;
            border: 2px solid;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
        }

        .cell-label {
            font-weight: 600;
        }

        .cell-score {
            font-size: 0.625rem;
            opacity: 0.7;
        }

        .legend {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            font-size: 0.75rem;
            color: var(--text-secondary);
        }

        .legend span {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }

        .download-section {
            background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(34, 211, 238, 0.1));
            border: 1px solid var(--accent-purple);
            padding: 2rem;
            border-radius: 12px;
            text-align: center;
        }

        .download-section h3 {
            margin-bottom: 1rem;
        }

        .download-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: var(--accent-purple);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            transition: background 0.2s;
        }

        .download-btn:hover {
            background: #9333ea;
        }

        footer {
            text-align: center;
            padding: 2rem 0;
            border-top: 1px solid var(--border-color);
            margin-top: 3rem;
            color: var(--text-secondary);
            font-size: 0.875rem;
        }

        footer a {
            color: var(--accent-cyan);
            text-decoration: none;
        }

        @media (max-width: 640px) {
            .container {
                padding: 1rem;
            }

            h1 {
                font-size: 1.75rem;
            }

            .meta {
                flex-direction: column;
                gap: 0.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="logo">VibeBoard Electronic Press Kit</div>
            <h1>${this.escapeHtml(title)}</h1>
            <p class="subtitle">${this.escapeHtml(description)}</p>
            <div class="meta">
                <div class="meta-item">
                    <span>📁</span>
                    <span>${this.escapeHtml(projectName)}</span>
                </div>
                <div class="meta-item">
                    <span>🎬</span>
                    <span>${this.escapeHtml(sceneName)}</span>
                </div>
                <div class="meta-item">
                    <span>⏱️</span>
                    <span>${Math.floor(totalDuration / 60)}:${String(Math.floor(totalDuration % 60)).padStart(2, '0')}</span>
                </div>
                <div class="meta-item">
                    <span>🎞️</span>
                    <span>${shots.length} shots</span>
                </div>
                <div class="meta-item">
                    <span>✍️</span>
                    <span>${this.escapeHtml(author)}</span>
                </div>
            </div>
        </header>

        <section class="section">
            <h2>Shot Breakdown</h2>
            <div class="shots-grid">
                ${shotCardsHtml}
            </div>
        </section>

        ${continuitySection}

        <section class="section download-section">
            <h3>Download Full Project Data</h3>
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                Get the complete Shot DNA with all seeds, prompts, and settings for re-import.
            </p>
            <a href="${sidecarFilename}" class="download-btn" download>
                <span>📦</span>
                Download Sidecar JSON
            </a>
        </section>

        <footer>
            <p>Generated by <a href="https://vibeboard.studio" target="_blank">VibeBoard Studio</a></p>
            <p style="margin-top: 0.5rem; opacity: 0.7;">Export ID: ${exportId}</p>
        </footer>
    </div>
</body>
</html>`;
    }

    /**
     * Format cinematic tags for display
     */
    private formatCinematicTags(tags: {
        camera?: string;
        lens?: string;
        filmStock?: string;
        colorGrade?: string;
        lighting?: string;
        motion?: string;
        mood?: string;
    }): string {
        const parts: string[] = [];
        if (tags.camera) parts.push(tags.camera);
        if (tags.lens) parts.push(tags.lens);
        if (tags.filmStock) parts.push(tags.filmStock);
        if (tags.colorGrade) parts.push(tags.colorGrade);
        if (tags.lighting) parts.push(tags.lighting);
        if (tags.motion) parts.push(tags.motion);
        if (tags.mood) parts.push(tags.mood);
        return parts.join(', ') || 'None';
    }

    /**
     * Format lens kit for display
     */
    private formatLensKit(lensKit: unknown): string {
        if (typeof lensKit === 'string') return lensKit;
        if (typeof lensKit === 'object' && lensKit !== null) {
            const kit = lensKit as Record<string, unknown>;
            const parts: string[] = [];
            if (kit.focalLength) parts.push(`${kit.focalLength}mm`);
            if (kit.aperture) parts.push(`f/${kit.aperture}`);
            if (kit.brand) parts.push(String(kit.brand));
            if (kit.type) parts.push(String(kit.type));
            return parts.join(' ') || 'Custom';
        }
        return 'Standard';
    }

    /**
     * Format lighting setup for display
     */
    private formatLightingSetup(lightingSetup: unknown): string {
        if (typeof lightingSetup === 'string') return lightingSetup;
        if (typeof lightingSetup === 'object' && lightingSetup !== null) {
            const setup = lightingSetup as Record<string, unknown>;
            const parts: string[] = [];
            if (setup.style) parts.push(String(setup.style));
            if (setup.keyLight) parts.push(`Key: ${setup.keyLight}`);
            if (setup.ratio) parts.push(`Ratio: ${setup.ratio}`);
            if (setup.colorTemp) parts.push(`${setup.colorTemp}K`);
            return parts.join(', ') || 'Natural';
        }
        return 'Natural';
    }

    /**
     * Escape HTML special characters
     */
    private escapeHtml(text: string): string {
        const escapes: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        };
        return text.replace(/[&<>"']/g, char => escapes[char] || char);
    }
}

export const masterExportService = MasterExportService.getInstance();
export { MasterExportService };
