import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

export class VideoStitcher {
    private tempDir: string;

    constructor() {
        this.tempDir = path.join(os.tmpdir(), 'vibeboard-stitch');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async stitchVideos(videoUrls: string[]): Promise<string> {
        if (videoUrls.length === 0) {
            throw new Error("No videos to stitch");
        }

        const jobId = uuidv4();
        const jobDir = path.join(this.tempDir, jobId);
        fs.mkdirSync(jobDir);

        try {
            console.log(`[Stitcher] Starting job ${jobId} with ${videoUrls.length} videos`);

            // 1. Download all videos
            const localPaths: string[] = [];
            for (let i = 0; i < videoUrls.length; i++) {
                const url = videoUrls[i];
                const ext = path.extname(new URL(url).pathname) || '.mp4';
                const localPath = path.join(jobDir, `input_${i}${ext}`);

                console.log(`[Stitcher] Downloading ${url} to ${localPath}`);
                const response = await axios.get(url, { responseType: 'stream' });
                const writer = fs.createWriteStream(localPath);
                response.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', () => resolve(null));
                    writer.on('error', reject);
                });
                localPaths.push(localPath);
            }

            // 2. Create Concat List File
            // ffmpeg concat demuxer requires a text file with "file 'path'" lines
            const listPath = path.join(jobDir, 'list.txt');
            const fileContent = localPaths.map(p => `file '${p}'`).join('\n');
            fs.writeFileSync(listPath, fileContent);

            // 3. Run ffmpeg
            const outputPath = path.join(jobDir, 'output.mp4');
            console.log(`[Stitcher] Concatenating to ${outputPath}`);

            await new Promise((resolve, reject) => {
                ffmpeg()
                    .input(listPath)
                    .inputOptions(['-f', 'concat', '-safe', '0'])
                    .outputOptions('-c copy') // Fast copy if codecs match
                    // If codecs might differ, we should re-encode:
                    // .outputOptions('-c:v libx264', '-c:a aac')
                    .save(outputPath)
                    .on('end', resolve)
                    .on('error', (err) => {
                        console.error('[Stitcher] ffmpeg error:', err);
                        reject(err);
                    });
            });

            // 4. Return path (caller handles upload/cleanup of this file, but we clean up inputs)
            // Actually, let's read the file to buffer or return path and let caller handle.
            // Returning path is safer for large files.
            return outputPath;

        } catch (error) {
            console.error("[Stitcher] Error:", error);
            // Cleanup on error
            fs.rmSync(jobDir, { recursive: true, force: true });
            throw error;
        }
    }

    cleanup(filePath: string) {
        try {
            // The filePath is inside jobDir, so we can remove the parent dir
            const jobDir = path.dirname(filePath);
            if (jobDir.startsWith(this.tempDir)) {
                fs.rmSync(jobDir, { recursive: true, force: true });
            }
        } catch (e) {
            console.error("[Stitcher] Cleanup failed:", e);
        }
    }
}

export const videoStitcher = new VideoStitcher();
