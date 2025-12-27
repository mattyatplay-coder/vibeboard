/**
 * Bake Master Pass - FFmpeg Orchestration for NLE Timeline
 *
 * Phase 4: Complete FFmpeg pipeline for non-destructive editing
 *
 * Pipeline:
 * 1. TRIM: Apply trimStart/trimEnd to each clip
 * 2. MUX: Combine audio (L-cut support)
 * 3. STITCH: Join clips with transitions
 * 4. CONFORM: Enforce 24fps constant frame rate
 *
 * Commands:
 * - Trim: ffmpeg -ss [trimStart] -to [end-trimEnd] -i input.mp4 -c copy trimmed.mp4
 * - Mux: ffmpeg -i video.mp4 -i audio.mp3 -c:v copy -c:a aac output.mp4
 * - Stitch: ffmpeg -f concat -safe 0 -i list.txt -r 24 -vsync cfr output.mp4
 */

import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

// =============================================================================
// TYPES
// =============================================================================

export type TransitionType = 'cut' | 'fade' | 'dissolve' | 'crossfade' | 'wipe';

export interface ClipSpec {
    id: string;
    videoUrl: string;           // Source video URL
    duration: number;           // Original duration in seconds
    trimStart: number;          // In-point trim (seconds)
    trimEnd: number;            // Out-point trim (seconds)
    audioUrl?: string;          // Optional separate audio track
    audioTrimStart?: number;    // Audio in-point (for L-cut)
    audioTrimEnd?: number;      // Audio out-point (for L-cut)
    audioGain?: number;         // Volume multiplier (0-2)
    transitionType?: TransitionType;
    transitionDuration?: number; // Transition duration in seconds
}

export interface BakeOptions {
    fps: number;                // Target frame rate (default: 24)
    codec: 'h264' | 'prores';   // Output codec
    quality: 'draft' | 'review' | 'master';
    includeAudio: boolean;
    outputFormat: 'mp4' | 'mov';
}

export interface BakeResult {
    success: boolean;
    outputPath: string;
    duration: number;
    resolution: string;
    fileSize: number;
    logs: string[];
}

// =============================================================================
// BAKE MASTER PASS SERVICE
// =============================================================================

export class BakeMasterPass {
    private tempDir: string;
    private ffmpegPath: string;

    constructor() {
        this.tempDir = path.join(os.tmpdir(), 'vibeboard-bake');
        this.ffmpegPath = '/opt/homebrew/bin/ffmpeg';

        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * Main bake pipeline: Trim → Mux → Stitch → Conform
     */
    async bake(clips: ClipSpec[], options: Partial<BakeOptions> = {}): Promise<BakeResult> {
        const opts: BakeOptions = {
            fps: 24,
            codec: 'h264',
            quality: 'master',
            includeAudio: true,
            outputFormat: 'mp4',
            ...options,
        };

        const jobId = uuidv4();
        const jobDir = path.join(this.tempDir, jobId);
        fs.mkdirSync(jobDir, { recursive: true });

        const logs: string[] = [];
        const log = (msg: string) => {
            console.log(`[BakeMasterPass] ${msg}`);
            logs.push(`[${new Date().toISOString()}] ${msg}`);
        };

        try {
            log(`Starting bake job ${jobId} with ${clips.length} clips`);

            // Step 1: Download all source videos
            const localPaths = await this.downloadClips(clips, jobDir, log);

            // Step 2: Trim each clip
            const trimmedPaths = await this.trimClips(clips, localPaths, jobDir, log);

            // Step 3: Mux audio (if L-cut or separate audio)
            const muxedPaths = await this.muxAudio(clips, trimmedPaths, jobDir, opts, log);

            // Step 4: Stitch with transitions
            const outputPath = await this.stitchClips(
                clips,
                muxedPaths,
                jobDir,
                opts,
                log
            );

            // Get output metadata
            const stats = fs.statSync(outputPath);
            const metadata = await this.getVideoMetadata(outputPath);

            log(`Bake complete: ${outputPath}`);
            log(`Duration: ${metadata.duration}s, Resolution: ${metadata.width}x${metadata.height}`);

            return {
                success: true,
                outputPath,
                duration: metadata.duration,
                resolution: `${metadata.width}x${metadata.height}`,
                fileSize: stats.size,
                logs,
            };

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            log(`ERROR: ${errorMsg}`);
            throw error;
        }
    }

    /**
     * Download clips from URLs to local filesystem
     */
    private async downloadClips(
        clips: ClipSpec[],
        jobDir: string,
        log: (msg: string) => void
    ): Promise<string[]> {
        const localPaths: string[] = [];

        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i];
            const ext = path.extname(new URL(clip.videoUrl).pathname) || '.mp4';
            const localPath = path.join(jobDir, `source_${i}${ext}`);

            log(`Downloading clip ${i + 1}/${clips.length}: ${clip.videoUrl}`);

            const response = await axios.get(clip.videoUrl, { responseType: 'stream' });
            const writer = fs.createWriteStream(localPath);
            response.data.pipe(writer);

            await new Promise<void>((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            localPaths.push(localPath);
        }

        return localPaths;
    }

    /**
     * Apply non-destructive trims to clips
     */
    private async trimClips(
        clips: ClipSpec[],
        localPaths: string[],
        jobDir: string,
        log: (msg: string) => void
    ): Promise<string[]> {
        const trimmedPaths: string[] = [];

        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i];
            const sourcePath = localPaths[i];
            const trimmedPath = path.join(jobDir, `trimmed_${i}.mp4`);

            // Calculate effective duration
            const effectiveDuration = clip.duration - clip.trimStart - clip.trimEnd;

            if (clip.trimStart === 0 && clip.trimEnd === 0) {
                // No trim needed, copy directly
                log(`Clip ${i + 1}: No trim needed`);
                fs.copyFileSync(sourcePath, trimmedPath);
            } else {
                log(`Clip ${i + 1}: Trimming [${clip.trimStart}s - ${clip.duration - clip.trimEnd}s] (${effectiveDuration}s)`);

                await new Promise<void>((resolve, reject) => {
                    let cmd = ffmpeg(sourcePath);

                    // Apply seek (ss before input for fast seek)
                    if (clip.trimStart > 0) {
                        cmd = cmd.setStartTime(clip.trimStart);
                    }

                    // Calculate end time
                    const endTime = clip.duration - clip.trimEnd;

                    cmd
                        .setDuration(effectiveDuration)
                        .outputOptions([
                            '-c:v', 'libx264',
                            '-crf', '18',
                            '-preset', 'fast',
                            '-c:a', 'aac',
                            '-b:a', '192k',
                        ])
                        .save(trimmedPath)
                        .on('end', () => resolve())
                        .on('error', (err) => reject(err));
                });
            }

            trimmedPaths.push(trimmedPath);
        }

        return trimmedPaths;
    }

    /**
     * Mux separate audio tracks (L-cut support)
     */
    private async muxAudio(
        clips: ClipSpec[],
        trimmedPaths: string[],
        jobDir: string,
        options: BakeOptions,
        log: (msg: string) => void
    ): Promise<string[]> {
        if (!options.includeAudio) {
            return trimmedPaths;
        }

        const muxedPaths: string[] = [];

        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i];
            const videoPath = trimmedPaths[i];
            const muxedPath = path.join(jobDir, `muxed_${i}.mp4`);

            if (!clip.audioUrl) {
                // No separate audio, use video's audio
                muxedPaths.push(videoPath);
                continue;
            }

            log(`Clip ${i + 1}: Muxing audio from ${clip.audioUrl}`);

            // Download audio
            const audioPath = path.join(jobDir, `audio_${i}.mp3`);
            const audioResponse = await axios.get(clip.audioUrl, { responseType: 'stream' });
            const audioWriter = fs.createWriteStream(audioPath);
            audioResponse.data.pipe(audioWriter);

            await new Promise<void>((resolve, reject) => {
                audioWriter.on('finish', resolve);
                audioWriter.on('error', reject);
            });

            // Calculate audio trim
            const audioTrimStart = clip.audioTrimStart ?? 0;
            const audioTrimEnd = clip.audioTrimEnd ?? 0;
            const videoEffectiveDuration = clip.duration - clip.trimStart - clip.trimEnd;

            await new Promise<void>((resolve, reject) => {
                let cmd = ffmpeg()
                    .input(videoPath)
                    .input(audioPath);

                // Apply audio trim if needed
                if (audioTrimStart > 0) {
                    cmd = cmd.inputOptions(['-ss', String(audioTrimStart)]);
                }

                const complexFilter: string[] = [];

                // Apply audio gain if specified
                if (clip.audioGain && clip.audioGain !== 1) {
                    complexFilter.push(`[1:a]volume=${clip.audioGain}[aout]`);
                    cmd = cmd.outputOptions(['-map', '0:v', '-map', '[aout]']);
                } else {
                    cmd = cmd.outputOptions(['-map', '0:v', '-map', '1:a']);
                }

                if (complexFilter.length > 0) {
                    cmd = cmd.complexFilter(complexFilter);
                }

                cmd
                    .setDuration(videoEffectiveDuration)
                    .outputOptions([
                        '-c:v', 'copy',
                        '-c:a', 'aac',
                        '-b:a', '192k',
                        '-shortest',
                    ])
                    .save(muxedPath)
                    .on('end', () => resolve())
                    .on('error', (err) => reject(err));
            });

            muxedPaths.push(muxedPath);
        }

        return muxedPaths;
    }

    /**
     * Stitch clips together with transitions
     */
    private async stitchClips(
        clips: ClipSpec[],
        muxedPaths: string[],
        jobDir: string,
        options: BakeOptions,
        log: (msg: string) => void
    ): Promise<string> {
        const outputPath = path.join(jobDir, `output.${options.outputFormat}`);

        // Check if any transitions are needed
        const hasTransitions = clips.some(
            (c) => c.transitionType && c.transitionType !== 'cut'
        );

        if (!hasTransitions) {
            // Simple concat with stream copy
            log('Stitching with simple concat (no transitions)');
            await this.concatSimple(muxedPaths, outputPath, jobDir, options);
        } else {
            // Complex filter for transitions
            log('Stitching with transitions');
            await this.concatWithTransitions(clips, muxedPaths, outputPath, options, log);
        }

        return outputPath;
    }

    /**
     * Simple concatenation without transitions (stream copy)
     */
    private async concatSimple(
        paths: string[],
        outputPath: string,
        jobDir: string,
        options: BakeOptions
    ): Promise<void> {
        // Create concat list file
        const listPath = path.join(jobDir, 'concat.txt');
        const listContent = paths.map((p) => `file '${p}'`).join('\n');
        fs.writeFileSync(listPath, listContent);

        await new Promise<void>((resolve, reject) => {
            ffmpeg()
                .input(listPath)
                .inputOptions(['-f', 'concat', '-safe', '0'])
                .outputOptions([
                    '-r', String(options.fps),
                    '-vsync', 'cfr',  // Constant frame rate
                    '-c:v', options.codec === 'prores' ? 'prores_ks' : 'libx264',
                    ...(options.codec === 'prores' ? ['-profile:v', '3'] : ['-crf', '18', '-preset', 'fast']),
                    '-c:a', 'aac',
                    '-b:a', '192k',
                ])
                .save(outputPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });
    }

    /**
     * Concatenation with transition effects using xfade
     */
    private async concatWithTransitions(
        clips: ClipSpec[],
        paths: string[],
        outputPath: string,
        options: BakeOptions,
        log: (msg: string) => void
    ): Promise<void> {
        // Get durations for offset calculation
        const durations: number[] = [];
        for (const p of paths) {
            const meta = await this.getVideoMetadata(p);
            durations.push(meta.duration);
        }

        // Build xfade filter chain
        const transitionFilters = this.buildXfadeFilter(clips, durations);

        await new Promise<void>((resolve, reject) => {
            let cmd = ffmpeg();

            // Add all inputs
            for (const p of paths) {
                cmd = cmd.input(p);
            }

            cmd
                .complexFilter(transitionFilters.filter)
                .outputOptions([
                    '-map', `[${transitionFilters.outputLabel}]`,
                    '-r', String(options.fps),
                    '-vsync', 'cfr',
                    '-c:v', options.codec === 'prores' ? 'prores_ks' : 'libx264',
                    ...(options.codec === 'prores' ? ['-profile:v', '3'] : ['-crf', '18', '-preset', 'fast']),
                    '-pix_fmt', 'yuv420p',
                ])
                .save(outputPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });
    }

    /**
     * Build FFmpeg xfade filter for transitions
     */
    private buildXfadeFilter(
        clips: ClipSpec[],
        durations: number[]
    ): { filter: string; outputLabel: string } {
        if (clips.length === 1) {
            return { filter: '[0:v]copy[outv]', outputLabel: 'outv' };
        }

        const filters: string[] = [];
        const defaultTransitionDuration = 0.5;

        // Calculate offsets for each transition
        let cumulativeOffset = 0;

        for (let i = 0; i < clips.length - 1; i++) {
            const clip = clips[i];
            const transitionType = clip.transitionType || 'cut';
            const transitionDuration = clip.transitionDuration || defaultTransitionDuration;

            // Map our transition types to FFmpeg xfade types
            const xfadeType = this.mapTransitionType(transitionType);

            if (i === 0) {
                // First transition: [0:v][1:v]xfade[v01]
                const offset = durations[0] - transitionDuration;
                cumulativeOffset = offset;
                filters.push(
                    `[0:v][1:v]xfade=transition=${xfadeType}:duration=${transitionDuration}:offset=${offset}[v01]`
                );
            } else {
                // Chain: [v0X][N:v]xfade[v0Y]
                const prevLabel = i === 1 ? 'v01' : `v0${i}`;
                const nextLabel = i === clips.length - 2 ? 'outv' : `v0${i + 1}`;

                // Add previous clip's effective duration minus transition overlap
                cumulativeOffset += durations[i] - transitionDuration;

                filters.push(
                    `[${prevLabel}][${i + 1}:v]xfade=transition=${xfadeType}:duration=${transitionDuration}:offset=${cumulativeOffset}[${nextLabel}]`
                );
            }
        }

        return {
            filter: filters.join(';'),
            outputLabel: clips.length === 2 ? 'v01' : 'outv',
        };
    }

    /**
     * Map transition type to FFmpeg xfade transition name
     */
    private mapTransitionType(type: TransitionType): string {
        switch (type) {
            case 'fade':
                return 'fade';
            case 'dissolve':
                return 'dissolve';
            case 'crossfade':
                return 'fade';
            case 'wipe':
                return 'wipeleft';
            case 'cut':
            default:
                return 'fade';
        }
    }

    /**
     * Get video metadata using ffprobe
     */
    private async getVideoMetadata(
        filePath: string
    ): Promise<{ duration: number; width: number; height: number }> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    reject(err);
                    return;
                }

                const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
                resolve({
                    duration: metadata.format.duration || 0,
                    width: videoStream?.width || 1920,
                    height: videoStream?.height || 1080,
                });
            });
        });
    }

    /**
     * Cleanup temp files after bake
     */
    cleanup(outputPath: string): void {
        try {
            const jobDir = path.dirname(outputPath);
            if (jobDir.startsWith(this.tempDir)) {
                fs.rmSync(jobDir, { recursive: true, force: true });
            }
        } catch (e) {
            console.error('[BakeMasterPass] Cleanup failed:', e);
        }
    }

    /**
     * Generate timecode burn-in for dailies
     */
    async addTimecodeBurnIn(
        inputPath: string,
        outputPath: string,
        fps: number = 24
    ): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions([
                    '-vf',
                    `drawtext=fontfile=/System/Library/Fonts/Menlo.ttc:` +
                    `fontsize=24:fontcolor=white:box=1:boxcolor=black@0.5:` +
                    `x=10:y=h-40:` +
                    `text='TC\\: %{pts\\:hms}'`,
                    '-c:a', 'copy',
                ])
                .save(outputPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });
    }
}

// Singleton instance
export const bakeMasterPass = new BakeMasterPass();
