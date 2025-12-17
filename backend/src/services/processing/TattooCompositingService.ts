import sharp from 'sharp';
import path from 'path';

/**
 * Service to handle realistic tattoo compositing.
 *
 * Logic:
 * 1. Place the tattoo design onto a transparent canvas matching the base image size.
 * 2. Apply "Ink Bleed" (Gaussian Blur) to mimic ink spreading in skin.
 * 3. Composite: Base + Ink (Over blend with opacity).
 *
 * For white-background designs (like tattoo flash), luminance keying converts
 * white to transparent and renders the design as black ink.
 */
export class TattooCompositingService {

    /**
     * Composites a tattoo design onto a base image with realistic skin texture integration.
     * 
     * @param baseBuffer - The background image (skin)
     * @param designBuffer - The tattoo design (transparent PNG)
     * @param options - Placement and style options
     */
    async compositeTattoo(
        baseBuffer: Buffer,
        designBuffer: Buffer,
        options: {
            xOffset: number; // Horizontal shift
            yOffset?: number; // Vertical shift (NEW)
            widthRatio: number; // Scale
            opacity?: number;
            blur?: number;
            removeBackground?: boolean;
            maskBuffer?: Buffer; // Optional Mask (NEW)
        }
    ): Promise<Buffer> {
        const {
            xOffset,
            yOffset = 0,
            widthRatio,
            opacity = 0.85,
            blur = 0.8,
            removeBackground = false,
            maskBuffer
        } = options;

        // 1. Get Metadata
        const baseMeta = await sharp(baseBuffer).metadata();
        const designMeta = await sharp(designBuffer).metadata();

        if (!baseMeta.width || !baseMeta.height) throw new Error("Invalid base image");

        // 2. Geometry Calculation (Placement)
        const targetWidth = Math.round(baseMeta.width * widthRatio);
        const ratio = targetWidth / (designMeta.width || 1);
        const targetHeight = Math.round((designMeta.height || 1) * ratio);

        const leftPos = Math.round((baseMeta.width - targetWidth) / 2) + xOffset;
        const topPos = Math.round((baseMeta.height - targetHeight) / 2) + yOffset;

        // 3. Prepare the Tattoo Layer (Resized)
        let processedDesign = sharp(designBuffer);
        const dMetadata = await processedDesign.metadata();

        // LOGIC: Remove Background if requested OR if file is naturally opaque (no alpha)
        const shouldKey = removeBackground || !dMetadata.hasAlpha;

        if (shouldKey) {
            console.log(`[TattooService] Keying background (Auto=${!dMetadata.hasAlpha}, Manual=${removeBackground})`);

            // 1. Generate Alpha (Invert Luminance)
            // Flatten to white first to handle transparent pixels correctly.
            const flattened = processedDesign.clone().flatten({ background: '#ffffff' });

            const alphaBuffer = await flattened
                .grayscale()
                .negate()
                .toBuffer();

            // 2. Create BLACK ink layer with alpha from luminance
            const blackInk = await sharp({
                create: {
                    width: dMetadata.width || 100,
                    height: dMetadata.height || 100,
                    channels: 3,
                    background: { r: 0, g: 0, b: 0 }
                }
            })
                .toColourspace('srgb')
                .raw()
                .toBuffer();

            processedDesign = sharp(blackInk, {
                raw: {
                    width: dMetadata.width || 100,
                    height: dMetadata.height || 100,
                    channels: 3
                }
            })
                .joinChannel(alphaBuffer);
        }

        const resizedDesign = await processedDesign
            .resize(targetWidth, targetHeight)
            .png()
            .toBuffer();

        // 4. Create "Placed" Layer (Full Canvas)
        let tattooLayer = sharp({
            create: {
                width: baseMeta.width,
                height: baseMeta.height,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        })
            .composite([{
                input: resizedDesign,
                left: leftPos,
                top: topPos,
                blend: 'over'
            }]);

        // 4.5 Apply Mask if provided (NEW)
        if (maskBuffer) {
            // Mask needs to be resized to fit constraints if strictly passed? 
            // Or assume mask is same size as Base Image?
            // Let's assume Mask is Base Image size for now (Full Canvas Mask).

            // Note: If Mask is from frontend canvas, it might be same aspect ratio.
            const maskMeta = await sharp(maskBuffer).metadata();
            if (maskMeta.width !== baseMeta.width || maskMeta.height !== baseMeta.height) {
                // Resize mask to match base
                const resizedMask = await sharp(maskBuffer)
                    .resize(baseMeta.width, baseMeta.height)
                    .toBuffer();

                tattooLayer = tattooLayer.composite([{
                    input: resizedMask,
                    blend: 'dest-out' // Erase where mask is white/opaque
                }]);
            } else {
                tattooLayer = tattooLayer.composite([{
                    input: maskBuffer,
                    blend: 'dest-out'
                }]);
            }
        }

        const tattooLayerBuffer = await tattooLayer.png().toBuffer();

        // 5. Apply Look Development (G1: Ink Bleed + Opacity)
        const bleedLayer = await sharp(tattooLayerBuffer)
            .blur(blur)
            .toBuffer();

        // Apply Opacity:
        const blurredInk = await sharp(bleedLayer)
            .linear([1, 1, 1, opacity], [0, 0, 0, 0]) // Scale Alpha Channel
            .toBuffer();

        // 6. Final Composite
        const finalImage = await sharp(baseBuffer)
            .toColourspace('srgb') // convert non-sRGB inputs
            .withMetadata() // Preserve metadata
            .composite([
                { input: blurredInk, blend: 'over' }
            ])
            .toBuffer();

        return finalImage;
    }
}

export const tattooCompositingService = new TattooCompositingService();
