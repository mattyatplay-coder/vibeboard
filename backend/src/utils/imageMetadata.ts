/**
 * Image Metadata Utility
 *
 * Embeds generation parameters into images using:
 * - PNG: tEXt chunks (compatible with most viewers)
 * - JPEG: EXIF UserComment field
 *
 * This allows generation parameters to be extracted later for:
 * - Reproducing the same generation
 * - Viewing settings in image viewers that support metadata
 * - Importing into other tools (like A1111, ComfyUI)
 */

import sharp from 'sharp';
import axios from 'axios';

export interface GenerationMetadata {
    // Core generation info
    prompt: string;
    negativePrompt?: string;
    model: string;
    provider: string;
    seed?: number;

    // Image settings
    width?: number;
    height?: number;
    aspectRatio?: string;

    // Sampler settings
    sampler?: string;
    scheduler?: string;
    steps?: number;
    cfgScale?: number;

    // Strength sliders
    img2imgStrength?: number;        // ControlNet Depth scale
    ipAdapterWeight?: number;        // IP-Adapter weight (0.2-0.8)
    referenceCreativity?: number;    // Raw slider value (0-1)

    // LoRAs
    loras?: Array<{
        name: string;
        strength: number;
        path?: string;
    }>;

    // References
    sourceImages?: string[];
    elementReferences?: string[];
    referenceStrengths?: Record<string, number>;

    // Video specific
    duration?: string;

    // Timestamps
    generatedAt: string;
    vibeboardVersion?: string;
}

/**
 * Download image from URL and return as Buffer
 */
async function downloadImage(url: string): Promise<Buffer> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
}

/**
 * Detect image format from buffer
 */
async function getImageFormat(buffer: Buffer): Promise<'png' | 'jpeg' | 'webp' | 'unknown'> {
    const metadata = await sharp(buffer).metadata();
    if (metadata.format === 'png') return 'png';
    if (metadata.format === 'jpeg' || metadata.format === 'jpg') return 'jpeg';
    if (metadata.format === 'webp') return 'webp';
    return 'unknown';
}

/**
 * Format metadata as a string suitable for embedding
 * Uses a format similar to A1111 for compatibility
 */
function formatMetadataString(metadata: GenerationMetadata): string {
    const lines: string[] = [];

    // Prompt (first line, like A1111)
    lines.push(metadata.prompt);

    // Negative prompt
    if (metadata.negativePrompt) {
        lines.push(`Negative prompt: ${metadata.negativePrompt}`);
    }

    // Generation parameters (key: value format)
    const params: string[] = [];

    params.push(`Model: ${metadata.model}`);
    params.push(`Provider: ${metadata.provider}`);

    if (metadata.seed !== undefined) params.push(`Seed: ${metadata.seed}`);
    if (metadata.width && metadata.height) params.push(`Size: ${metadata.width}x${metadata.height}`);
    if (metadata.aspectRatio) params.push(`Aspect Ratio: ${metadata.aspectRatio}`);
    if (metadata.sampler) params.push(`Sampler: ${metadata.sampler}`);
    if (metadata.scheduler) params.push(`Scheduler: ${metadata.scheduler}`);
    if (metadata.steps) params.push(`Steps: ${metadata.steps}`);
    if (metadata.cfgScale) params.push(`CFG Scale: ${metadata.cfgScale}`);

    // Strength sliders with explanations
    if (metadata.img2imgStrength !== undefined) {
        const controlNetScale = 0.15 + ((1 - metadata.img2imgStrength) * 0.6);
        params.push(`Img2Img Strength: ${Math.round(metadata.img2imgStrength * 100)}% (ControlNet: ${controlNetScale.toFixed(2)})`);
    }
    if (metadata.referenceCreativity !== undefined) {
        const ipWeight = 0.2 + (metadata.referenceCreativity * 0.6);
        params.push(`Reference Strength: ${Math.round(metadata.referenceCreativity * 100)}% (IP-Adapter: ${ipWeight.toFixed(2)})`);
    }

    // LoRAs
    if (metadata.loras && metadata.loras.length > 0) {
        const loraStr = metadata.loras.map(l => `${l.name}:${l.strength}`).join(', ');
        params.push(`LoRAs: ${loraStr}`);
    }

    // Video duration
    if (metadata.duration) params.push(`Duration: ${metadata.duration}s`);

    // Timestamp and version
    params.push(`Generated: ${metadata.generatedAt}`);
    if (metadata.vibeboardVersion) params.push(`Vibeboard: ${metadata.vibeboardVersion}`);

    lines.push(params.join(', '));

    return lines.join('\n');
}

/**
 * Embed metadata into an image
 * Returns a new buffer with metadata embedded
 */
export async function embedMetadata(
    imageUrl: string,
    metadata: GenerationMetadata
): Promise<{ buffer: Buffer; format: string }> {
    // Download the image
    const imageBuffer = await downloadImage(imageUrl);
    const format = await getImageFormat(imageBuffer);

    // Format metadata
    const metadataString = formatMetadataString(metadata);
    const metadataJson = JSON.stringify(metadata);

    let outputBuffer: Buffer;

    if (format === 'png') {
        // For PNG, use tEXt chunks
        // Sharp supports this via withMetadata with custom text chunks
        outputBuffer = await sharp(imageBuffer)
            .withMetadata({
                exif: {
                    IFD0: {
                        ImageDescription: metadataString,
                        Software: 'Vibeboard AI Studio',
                    }
                }
            })
            .png({
                compressionLevel: 6,
                // Add PNG tEXt chunks for parameters
                // Note: Sharp doesn't directly support tEXt chunks,
                // but EXIF in PNG is widely supported
            })
            .toBuffer();

        // For full PNG tEXt support, we'd need to manually add chunks
        // For now, EXIF in PNG works in most viewers

    } else if (format === 'jpeg') {
        // For JPEG, use EXIF
        outputBuffer = await sharp(imageBuffer)
            .withMetadata({
                exif: {
                    IFD0: {
                        ImageDescription: metadataString,
                        Software: 'Vibeboard AI Studio',
                        Artist: 'AI Generated',
                    },
                    IFD2: {
                        UserComment: metadataJson,
                    }
                }
            })
            .jpeg({ quality: 95 })
            .toBuffer();

    } else if (format === 'webp') {
        // WebP: convert to PNG with metadata for better compatibility
        outputBuffer = await sharp(imageBuffer)
            .withMetadata({
                exif: {
                    IFD0: {
                        ImageDescription: metadataString,
                        Software: 'Vibeboard AI Studio',
                    }
                }
            })
            .png()
            .toBuffer();
        return { buffer: outputBuffer, format: 'png' };

    } else {
        // Unknown format - return as-is
        console.warn(`[ImageMetadata] Unknown format, skipping metadata embedding`);
        return { buffer: imageBuffer, format: 'unknown' };
    }

    return { buffer: outputBuffer, format };
}

/**
 * Extract metadata from an image
 * Returns the embedded generation metadata if present
 */
export async function extractMetadata(imageBuffer: Buffer): Promise<GenerationMetadata | null> {
    try {
        const metadata = await sharp(imageBuffer).metadata();

        // Try to extract from EXIF
        if (metadata.exif) {
            // Parse EXIF data
            // Sharp doesn't provide easy access to specific EXIF fields
            // Would need exif-reader or similar for full extraction
            console.log('[ImageMetadata] EXIF present, extraction requires additional parsing');
        }

        return null;
    } catch (error) {
        console.error('[ImageMetadata] Failed to extract metadata:', error);
        return null;
    }
}

/**
 * Build metadata object from generation data
 */
export function buildMetadata(
    usedLoras: any,
    generation: any
): GenerationMetadata {
    return {
        prompt: generation.inputPrompt || '',
        negativePrompt: usedLoras?.negativePrompt,
        model: usedLoras?.model || 'unknown',
        provider: usedLoras?.provider || 'unknown',
        seed: usedLoras?.seed,
        width: usedLoras?.width,
        height: usedLoras?.height,
        aspectRatio: generation.aspectRatio,
        sampler: typeof usedLoras?.sampler === 'object'
            ? usedLoras.sampler.name || usedLoras.sampler.value
            : usedLoras?.sampler,
        scheduler: typeof usedLoras?.scheduler === 'object'
            ? usedLoras.scheduler.name || usedLoras.scheduler.value
            : usedLoras?.scheduler,
        img2imgStrength: usedLoras?.strength,
        referenceCreativity: usedLoras?.referenceCreativity,
        loras: usedLoras?.loras?.map((l: any) => ({
            name: l.name || l.path?.split('/').pop()?.replace('.safetensors', '') || l.id,
            strength: l.strength || l.scale,
            path: l.path,
        })),
        sourceImages: usedLoras?.sourceImages,
        elementReferences: Object.keys(usedLoras?.referenceStrengths || {}),
        referenceStrengths: usedLoras?.referenceStrengths,
        duration: usedLoras?.duration,
        generatedAt: new Date().toISOString(),
        vibeboardVersion: '1.0.0',
    };
}

export default {
    embedMetadata,
    extractMetadata,
    buildMetadata,
};
