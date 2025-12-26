/**
 * Video Analysis Service
 *
 * Extracts metadata, frames, and performs AI analysis on uploaded videos
 * for use in the "Extend Video" workflow.
 */

import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import * as fal from "@fal-ai/serverless-client";
import { prisma } from '../prisma';
import { GrokAdapter } from './llm/GrokAdapter';

// Configure fal client
fal.config({
    credentials: process.env.FAL_KEY
});

export interface VideoMetadata {
    duration: number;           // seconds
    fps: number;
    resolution: {
        width: number;
        height: number;
    };
    aspectRatio: string;        // "16:9", "9:16", "1:1", etc.
    codec: string;
    bitrate?: number;           // kbps
    hasAudio: boolean;
    audioCodec?: string;
    fileSize?: number;          // bytes
}

export interface ExtractedFrame {
    id: string;
    imageUrl: string;           // URL to the extracted frame
    localPath?: string;         // Local path if not uploaded
    timestamp: number;          // seconds into video
}

export interface DetectedCharacter {
    characterId: string;
    characterName: string;
    confidence: number;         // 0-1
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface StyleMatch {
    projectId: string;
    matchScore: number;         // 0-1
    matches: boolean;
    suggestions?: string[];
}

export interface VideoAnalysisResult {
    metadata: VideoMetadata;
    lastFrame: ExtractedFrame;
    firstFrame?: ExtractedFrame;
    detectedCharacters: DetectedCharacter[];
    styleAnalysis?: {
        style: string[];
        colorGrading: string;
        lighting: string;
        mood: string[];
    };
    styleMatch: StyleMatch;
}

export class VideoAnalysisService {
    private static instance: VideoAnalysisService;
    private grokAdapter: GrokAdapter;

    private constructor() {
        this.grokAdapter = new GrokAdapter();
    }

    static getInstance(): VideoAnalysisService {
        if (!VideoAnalysisService.instance) {
            VideoAnalysisService.instance = new VideoAnalysisService();
        }
        return VideoAnalysisService.instance;
    }

    /**
     * Analyze a video file and extract all relevant information
     */
    async analyzeVideo(
        videoPath: string,
        projectId?: string,
        options: {
            extractFirstFrame?: boolean;
            uploadFrames?: boolean;
            detectCharacters?: boolean;
            analyzeStyle?: boolean;
        } = {}
    ): Promise<VideoAnalysisResult> {
        const {
            extractFirstFrame = false,
            uploadFrames = true,
            detectCharacters = true,
            analyzeStyle = false
        } = options;

        console.log(`[VideoAnalysis] Analyzing video: ${videoPath}`);

        // 1. Extract metadata using ffprobe
        const metadata = await this.extractMetadata(videoPath);
        console.log(`[VideoAnalysis] Metadata: ${JSON.stringify(metadata)}`);

        // 2. Extract last frame (for video continuation)
        const lastFrame = await this.extractFrame(videoPath, 'last', uploadFrames);
        console.log(`[VideoAnalysis] Last frame extracted: ${lastFrame.imageUrl}`);

        // 3. Optionally extract first frame
        let firstFrame: ExtractedFrame | undefined;
        if (extractFirstFrame) {
            firstFrame = await this.extractFrame(videoPath, 'first', uploadFrames);
        }

        // 4. Detect characters (compare against project's character library)
        let detectedCharacters: DetectedCharacter[] = [];
        if (detectCharacters && projectId) {
            detectedCharacters = await this.detectProjectCharacters(
                lastFrame.imageUrl || lastFrame.localPath!,
                projectId
            );
        }

        // 5. Analyze style (if requested)
        let styleAnalysis: VideoAnalysisResult['styleAnalysis'];
        if (analyzeStyle) {
            styleAnalysis = await this.analyzeVisualStyle(lastFrame.imageUrl || lastFrame.localPath!);
        }

        // 6. Calculate style match
        const styleMatch = await this.calculateStyleMatch(
            metadata,
            styleAnalysis,
            projectId
        );

        return {
            metadata,
            lastFrame,
            firstFrame,
            detectedCharacters,
            styleAnalysis,
            styleMatch
        };
    }

    /**
     * Extract video metadata using ffprobe
     */
    private extractMetadata(videoPath: string): Promise<VideoMetadata> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    console.error('[VideoAnalysis] ffprobe error:', err);
                    return reject(new Error(`Failed to probe video: ${err.message}`));
                }

                const videoStream = metadata.streams.find(s => s.codec_type === 'video');
                const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

                if (!videoStream) {
                    return reject(new Error('No video stream found'));
                }

                // Parse FPS
                let fps = 24;
                if (videoStream.r_frame_rate) {
                    const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
                    if (den > 0) fps = Math.round((num / den) * 100) / 100;
                }

                // Calculate aspect ratio
                const width = videoStream.width || 1920;
                const height = videoStream.height || 1080;
                const aspectRatio = this.calculateAspectRatio(width, height);

                resolve({
                    duration: metadata.format.duration || 0,
                    fps,
                    resolution: { width, height },
                    aspectRatio,
                    codec: videoStream.codec_name || 'unknown',
                    bitrate: metadata.format.bit_rate ? Math.round(metadata.format.bit_rate / 1000) : undefined,
                    hasAudio: !!audioStream,
                    audioCodec: audioStream?.codec_name,
                    fileSize: metadata.format.size
                });
            });
        });
    }

    /**
     * Calculate aspect ratio string from dimensions
     */
    private calculateAspectRatio(width: number, height: number): string {
        const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
        const divisor = gcd(width, height);
        const w = width / divisor;
        const h = height / divisor;

        // Normalize to common ratios
        const ratio = width / height;
        if (Math.abs(ratio - 16/9) < 0.05) return '16:9';
        if (Math.abs(ratio - 9/16) < 0.05) return '9:16';
        if (Math.abs(ratio - 4/3) < 0.05) return '4:3';
        if (Math.abs(ratio - 3/4) < 0.05) return '3:4';
        if (Math.abs(ratio - 1) < 0.05) return '1:1';
        if (Math.abs(ratio - 21/9) < 0.05) return '21:9';

        return `${w}:${h}`;
    }

    /**
     * Extract a frame from the video
     */
    private async extractFrame(
        videoPath: string,
        position: 'first' | 'last' | 'middle' | number,
        upload: boolean = true
    ): Promise<ExtractedFrame> {
        const tempDir = os.tmpdir();
        const frameId = uuidv4();
        const filename = `frame_${frameId}.png`;
        const outputPath = path.join(tempDir, filename);

        // Determine timestamp
        let timestamp = 0;
        if (position !== 'first' && position !== 0) {
            const metadata = await this.extractMetadata(videoPath);
            if (position === 'last') {
                timestamp = Math.max(0, metadata.duration - 0.1);
            } else if (position === 'middle') {
                timestamp = metadata.duration / 2;
            } else if (typeof position === 'number') {
                timestamp = position;
            }
        }

        // Extract frame
        await new Promise<void>((resolve, reject) => {
            ffmpeg(videoPath)
                .screenshots({
                    timestamps: [timestamp],
                    filename,
                    folder: tempDir,
                    size: '100%'
                })
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });

        if (!fs.existsSync(outputPath)) {
            throw new Error('Failed to extract frame from video');
        }

        let imageUrl = outputPath;

        // Upload to Fal storage if requested
        if (upload) {
            try {
                const fileBuffer = fs.readFileSync(outputPath);
                const blob = new Blob([fileBuffer], { type: 'image/png' });
                imageUrl = await fal.storage.upload(blob as any);

                // Clean up local file after upload
                fs.unlinkSync(outputPath);
            } catch (uploadErr) {
                console.error('[VideoAnalysis] Failed to upload frame:', uploadErr);
                // Fall back to local path
                imageUrl = `/uploads/${filename}`;
                // Copy to uploads folder
                const uploadsPath = path.join(__dirname, '../../uploads', filename);
                fs.copyFileSync(outputPath, uploadsPath);
                fs.unlinkSync(outputPath);
            }
        }

        return {
            id: frameId,
            imageUrl,
            localPath: upload ? undefined : outputPath,
            timestamp
        };
    }

    /**
     * Detect project characters in the frame using Grok Vision for face matching
     * Compares the frame against each character's reference images
     */
    private async detectProjectCharacters(
        frameUrl: string,
        projectId: string
    ): Promise<DetectedCharacter[]> {
        const detectedCharacters: DetectedCharacter[] = [];

        try {
            // Get project's characters with their reference images
            const characters = await prisma.character.findMany({
                where: { projectId }
            });

            if (characters.length === 0) {
                console.log(`[VideoAnalysis] No characters found for project ${projectId}`);
                return detectedCharacters;
            }

            console.log(`[VideoAnalysis] Comparing frame against ${characters.length} project characters`);

            // Build a comparison request for Grok Vision
            // Include the frame and all character reference images
            const imageInputs: { url: string; label: string }[] = [
                { url: frameUrl, label: '[FRAME TO ANALYZE - detect all faces/people in this image]' }
            ];

            const characterRefMap: Map<string, { id: string; name: string }> = new Map();

            for (const character of characters) {
                // Parse reference images JSON
                let referenceImages: string[] = [];
                try {
                    referenceImages = JSON.parse(character.referenceImages || '[]');
                } catch (e) {
                    if (character.primaryImageUrl) {
                        referenceImages = [character.primaryImageUrl];
                    }
                }

                if (referenceImages.length > 0) {
                    // Add first reference image for each character
                    const refUrl = referenceImages[0];
                    const label = `[CHARACTER: ${character.name} - reference image]`;
                    imageInputs.push({ url: refUrl, label });
                    characterRefMap.set(character.name.toLowerCase(), {
                        id: character.id,
                        name: character.name
                    });
                }
            }

            if (characterRefMap.size === 0) {
                console.log(`[VideoAnalysis] No character reference images found`);
                return detectedCharacters;
            }

            // Ask Grok Vision to identify which characters appear in the frame
            const prompt = `Analyze the first image (FRAME TO ANALYZE) and identify which of the following characters appear in it:
${Array.from(characterRefMap.keys()).map(name => `- ${name}`).join('\n')}

For each character that appears in the frame, provide:
1. The character name (must match exactly one of the names above)
2. A confidence score from 0.0 to 1.0 (1.0 = certain match, 0.5 = possible match, 0.0 = not present)

Respond in JSON format:
{
  "detected": [
    { "name": "character name", "confidence": 0.85 }
  ]
}

If no characters are detected or the frame contains no recognizable faces, respond with:
{ "detected": [] }

Compare facial features, hair, clothing, and distinguishing characteristics. Be conservative with confidence scores - only use >0.8 for very clear matches.`;

            const response = await this.grokAdapter.analyzeImage(imageInputs, prompt);

            // Parse the response
            try {
                // Extract JSON from response (may have markdown code blocks)
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.detected && Array.isArray(parsed.detected)) {
                        for (const detection of parsed.detected) {
                            const charInfo = characterRefMap.get(detection.name?.toLowerCase());
                            if (charInfo && detection.confidence > 0.3) {
                                detectedCharacters.push({
                                    characterId: charInfo.id,
                                    characterName: charInfo.name,
                                    confidence: Math.min(1, Math.max(0, detection.confidence))
                                });
                            }
                        }
                    }
                }
            } catch (parseError) {
                console.error('[VideoAnalysis] Failed to parse Grok response:', parseError);
                console.log('[VideoAnalysis] Raw response:', response);
            }

            console.log(`[VideoAnalysis] Detected ${detectedCharacters.length} characters in frame`);
        } catch (error) {
            console.error('[VideoAnalysis] Character detection error:', error);
        }

        return detectedCharacters;
    }

    /**
     * Analyze visual style of a frame using Grok Vision
     * Extracts cinematic style, color grading, lighting, and mood
     */
    private async analyzeVisualStyle(frameUrl: string): Promise<VideoAnalysisResult['styleAnalysis']> {
        try {
            console.log(`[VideoAnalysis] Analyzing visual style with Grok Vision`);

            const prompt = `Analyze this image's visual/cinematic style and provide a structured analysis.

Respond in JSON format:
{
  "style": ["style1", "style2"],
  "colorGrading": "color grade description",
  "lighting": "lighting description",
  "mood": ["mood1", "mood2"]
}

For style, choose 1-3 from: Cinematic, Anime, Cartoon, Photorealistic, Noir, Vintage, Modern, Documentary, Music Video, Commercial, Artistic, Fantasy, Sci-Fi, Horror, Action, Drama, Comedy, Romantic

For colorGrading, choose one: Neutral, Warm, Cool, Desaturated, High Contrast, Low Contrast, Teal Orange, Sepia, Black and White, Neon, Pastel, Saturated, Film Grain, Golden Hour, Blue Hour

For lighting, choose one: Natural, Studio, High Key, Low Key, Dramatic, Soft, Hard, Backlit, Rim Light, Ambient, Golden Hour, Blue Hour, Neon, Practical, Mixed

For mood, choose 1-3 from: Calm, Tense, Joyful, Melancholic, Mysterious, Romantic, Energetic, Peaceful, Dark, Bright, Nostalgic, Futuristic, Ethereal, Gritty, Elegant, Playful

Be precise and choose the most fitting descriptors based on what you see.`;

            const response = await this.grokAdapter.analyzeImage([frameUrl], prompt);

            // Parse the response
            try {
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return {
                        style: Array.isArray(parsed.style) ? parsed.style : ['Cinematic'],
                        colorGrading: parsed.colorGrading || 'Neutral',
                        lighting: parsed.lighting || 'Natural',
                        mood: Array.isArray(parsed.mood) ? parsed.mood : ['Calm']
                    };
                }
            } catch (parseError) {
                console.error('[VideoAnalysis] Failed to parse style response:', parseError);
                console.log('[VideoAnalysis] Raw response:', response);
            }
        } catch (error) {
            console.error('[VideoAnalysis] Style analysis error:', error);
        }

        // Fallback to defaults if analysis fails
        return {
            style: ['Cinematic'],
            colorGrading: 'Neutral',
            lighting: 'Natural',
            mood: ['Calm']
        };
    }

    /**
     * Calculate how well the video matches the project's style
     */
    private async calculateStyleMatch(
        metadata: VideoMetadata,
        styleAnalysis: VideoAnalysisResult['styleAnalysis'] | undefined,
        projectId?: string
    ): Promise<StyleMatch> {
        let matchScore = 0.8; // Default reasonable match
        const suggestions: string[] = [];

        if (projectId) {
            try {
                // Check if project has a style guide
                const styleGuide = await prisma.styleGuide.findFirst({
                    where: { projectId }
                });

                if (styleGuide) {
                    // Compare aspect ratios
                    const derivedMeta = styleGuide.derivedMetadata
                        ? JSON.parse(styleGuide.derivedMetadata)
                        : null;

                    if (derivedMeta?.aspectRatio && derivedMeta.aspectRatio !== metadata.aspectRatio) {
                        matchScore -= 0.15;
                        suggestions.push(`Video aspect ratio (${metadata.aspectRatio}) differs from project style (${derivedMeta.aspectRatio})`);
                    }

                    // Other style comparisons could go here
                }
            } catch (error) {
                console.error('[VideoAnalysis] Style match error:', error);
            }
        }

        return {
            projectId: projectId || '',
            matchScore: Math.max(0, Math.min(1, matchScore)),
            matches: matchScore >= 0.6,
            suggestions: suggestions.length > 0 ? suggestions : undefined
        };
    }

    /**
     * Quick analysis - just metadata and last frame
     */
    async quickAnalysis(videoPath: string): Promise<{
        metadata: VideoMetadata;
        lastFrame: ExtractedFrame;
    }> {
        const metadata = await this.extractMetadata(videoPath);
        const lastFrame = await this.extractFrame(videoPath, 'last', true);
        return { metadata, lastFrame };
    }
}

// Export singleton instance
export const videoAnalysisService = VideoAnalysisService.getInstance();
