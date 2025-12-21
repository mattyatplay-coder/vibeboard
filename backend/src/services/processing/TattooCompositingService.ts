import sharp from 'sharp';

interface WarpPoint {
    x: number;
    y: number;
}

type WarpMode = 'none' | 'mesh' | 'cylindrical';

interface CompositeTattooOptions {
    xOffset: number;
    yOffset?: number;
    widthRatio: number;
    opacity?: number;
    blur?: number;
    removeBackground?: boolean;
    rotation?: number;
    warpMode?: WarpMode;
    cylindricalBend?: number;
    meshPoints?: WarpPoint[][];
    maskBuffer?: Buffer;
}

/**
 * Service to handle realistic tattoo compositing.
 *
 * Logic:
 * 1. Place the tattoo design onto a transparent canvas matching the base image size.
 * 2. Apply rotation if specified.
 * 3. Apply mesh warp or cylindrical warp if specified.
 * 4. Apply "Ink Bleed" (Gaussian Blur) to mimic ink spreading in skin.
 * 5. Composite: Base + Ink (Over blend with opacity).
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
        options: CompositeTattooOptions
    ): Promise<Buffer> {
        const {
            xOffset,
            yOffset = 0,
            widthRatio,
            opacity = 0.85,
            blur = 0.8,
            removeBackground = false,
            rotation = 0,
            warpMode = 'none',
            cylindricalBend = 0.3,
            meshPoints,
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

        // 4. Apply Rotation if specified
        if (rotation !== 0) {
            console.log(`[TattooService] Applying rotation: ${rotation}°`);
            processedDesign = sharp(await processedDesign.png().toBuffer())
                .rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
        }

        // 5. Resize to target dimensions
        let resizedDesign = await processedDesign
            .resize(targetWidth, targetHeight, { fit: 'fill' })
            .png()
            .toBuffer();

        // 6. Apply Warp transformations
        if (warpMode === 'mesh' && meshPoints && meshPoints.length >= 3) {
            console.log(`[TattooService] Applying mesh warp with ${meshPoints.length}x${meshPoints[0].length} grid`);
            resizedDesign = await this.applyMeshWarp(resizedDesign, meshPoints, targetWidth, targetHeight);
        } else if (warpMode === 'cylindrical' && cylindricalBend > 0) {
            console.log(`[TattooService] Applying cylindrical warp: bend=${cylindricalBend}`);
            resizedDesign = await this.applyCylindricalWarp(resizedDesign, cylindricalBend, targetWidth, targetHeight);
        }

        // 7. Create "Placed" Layer (Full Canvas)
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

        // 8. Apply Mask if provided
        if (maskBuffer) {
            const maskMeta = await sharp(maskBuffer).metadata();
            if (maskMeta.width !== baseMeta.width || maskMeta.height !== baseMeta.height) {
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

        // 9. Apply Look Development (G1: Ink Bleed + Opacity)
        const bleedLayer = await sharp(tattooLayerBuffer)
            .blur(blur)
            .toBuffer();

        // Apply Opacity:
        const blurredInk = await sharp(bleedLayer)
            .linear([1, 1, 1, opacity], [0, 0, 0, 0]) // Scale Alpha Channel
            .toBuffer();

        // 10. Final Composite
        const finalImage = await sharp(baseBuffer)
            .toColourspace('srgb') // convert non-sRGB inputs
            .withMetadata() // Preserve metadata
            .composite([
                { input: blurredInk, blend: 'over' }
            ])
            .toBuffer();

        return finalImage;
    }

    /**
     * Apply mesh warp using triangle-based bilinear interpolation
     * Divides the image into triangular regions based on the mesh grid
     * and applies affine-like transformations to each region
     */
    private async applyMeshWarp(
        inputBuffer: Buffer,
        meshPoints: WarpPoint[][],
        width: number,
        height: number
    ): Promise<Buffer> {
        // Get raw pixel data from input
        const inputMeta = await sharp(inputBuffer).metadata();
        const inputWidth = inputMeta.width || width;
        const inputHeight = inputMeta.height || height;

        const { data: srcData, info } = await sharp(inputBuffer)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const channels = info.channels; // Should be 4 (RGBA)

        // Create output buffer
        const outputData = Buffer.alloc(inputWidth * inputHeight * channels);

        // Default grid (source positions) - normalized 0-1
        const defaultGrid: WarpPoint[][] = [
            [{ x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 1, y: 0 }],
            [{ x: 0, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 1, y: 0.5 }],
            [{ x: 0, y: 1 }, { x: 0.5, y: 1 }, { x: 1, y: 1 }]
        ];

        const rows = meshPoints.length;
        const cols = meshPoints[0].length;

        // For each output pixel, find which quad it belongs to
        // and interpolate the source position
        for (let outY = 0; outY < inputHeight; outY++) {
            for (let outX = 0; outX < inputWidth; outX++) {
                // Normalized output position
                const nx = outX / inputWidth;
                const ny = outY / inputHeight;

                // Find which cell in the mesh grid this pixel belongs to
                const cellCol = Math.min(Math.floor(nx * (cols - 1)), cols - 2);
                const cellRow = Math.min(Math.floor(ny * (rows - 1)), rows - 2);

                // Local coordinates within the cell (0-1)
                const localX = (nx * (cols - 1)) - cellCol;
                const localY = (ny * (rows - 1)) - cellRow;

                // Get the four corners of the warped quad
                const tl = meshPoints[cellRow][cellCol];
                const tr = meshPoints[cellRow][cellCol + 1];
                const bl = meshPoints[cellRow + 1][cellCol];
                const br = meshPoints[cellRow + 1][cellCol + 1];

                // Get the four corners of the source quad (default grid)
                const srcTl = defaultGrid[cellRow][cellCol];
                const srcTr = defaultGrid[cellRow][cellCol + 1];
                const srcBl = defaultGrid[cellRow + 1][cellCol];
                const srcBr = defaultGrid[cellRow + 1][cellCol + 1];

                // Bilinear interpolation to find source position
                // First, find where in the warped quad our output position falls
                // We need to solve the inverse mapping

                // For the warped position, interpolate
                const warpedX = this.bilinearInterp(tl.x, tr.x, bl.x, br.x, localX, localY);
                const warpedY = this.bilinearInterp(tl.y, tr.y, bl.y, br.y, localX, localY);

                // The source position maps from the default grid
                const srcX = this.bilinearInterp(srcTl.x, srcTr.x, srcBl.x, srcBr.x, localX, localY);
                const srcY = this.bilinearInterp(srcTl.y, srcTr.y, srcBl.y, srcBr.y, localX, localY);

                // Now we need to find what source pixel maps to our output position
                // The warped mesh tells us where source pixels go TO
                // We need the inverse: given an output position, where does it come FROM

                // Inverse bilinear: given the output is at (nx, ny) in the warped space,
                // find the corresponding position in source space

                // Check if the output pixel is within the warped quad
                const invSrc = this.inverseBilinear(nx, ny, tl, tr, bl, br);

                if (invSrc) {
                    // Map back to source image coordinates
                    const finalSrcX = this.bilinearInterp(srcTl.x, srcTr.x, srcBl.x, srcBr.x, invSrc.u, invSrc.v);
                    const finalSrcY = this.bilinearInterp(srcTl.y, srcTr.y, srcBl.y, srcBr.y, invSrc.u, invSrc.v);

                    // Convert to pixel coordinates
                    const srcPxX = finalSrcX * inputWidth;
                    const srcPxY = finalSrcY * inputHeight;

                    // Sample with bilinear interpolation
                    const color = this.sampleBilinear(srcData, inputWidth, inputHeight, channels, srcPxX, srcPxY);

                    const outIdx = (outY * inputWidth + outX) * channels;
                    outputData[outIdx] = color.r;
                    outputData[outIdx + 1] = color.g;
                    outputData[outIdx + 2] = color.b;
                    outputData[outIdx + 3] = color.a;
                } else {
                    // Outside warped region - transparent
                    const outIdx = (outY * inputWidth + outX) * channels;
                    outputData[outIdx] = 0;
                    outputData[outIdx + 1] = 0;
                    outputData[outIdx + 2] = 0;
                    outputData[outIdx + 3] = 0;
                }
            }
        }

        // Convert back to PNG
        return sharp(outputData, {
            raw: {
                width: inputWidth,
                height: inputHeight,
                channels: channels as 4
            }
        })
            .png()
            .toBuffer();
    }

    /**
     * Bilinear interpolation for a single value
     */
    private bilinearInterp(tl: number, tr: number, bl: number, br: number, u: number, v: number): number {
        const top = tl + (tr - tl) * u;
        const bottom = bl + (br - bl) * u;
        return top + (bottom - top) * v;
    }

    /**
     * Inverse bilinear interpolation
     * Given a point (x, y) and a quad defined by four corners,
     * find the (u, v) parametric coordinates
     */
    private inverseBilinear(
        x: number, y: number,
        p0: WarpPoint, p1: WarpPoint, p2: WarpPoint, p3: WarpPoint
    ): { u: number; v: number } | null {
        // p0 = top-left, p1 = top-right, p2 = bottom-left, p3 = bottom-right
        // Solve for u, v where:
        // x = (1-u)(1-v)*p0.x + u*(1-v)*p1.x + (1-u)*v*p2.x + u*v*p3.x
        // y = (1-u)(1-v)*p0.y + u*(1-v)*p1.y + (1-u)*v*p2.y + u*v*p3.y

        const e = p1.x - p0.x;
        const f = p2.x - p0.x;
        const g = p0.x - p1.x + p3.x - p2.x;
        const h = x - p0.x;

        const e2 = p1.y - p0.y;
        const f2 = p2.y - p0.y;
        const g2 = p0.y - p1.y + p3.y - p2.y;
        const h2 = y - p0.y;

        // Solve quadratic for v
        const a = g2 * f - g * f2;
        const b = e2 * f - e * f2 + h * g2 - h2 * g;
        const c = h * e2 - h2 * e;

        let v: number;

        if (Math.abs(a) < 1e-10) {
            // Linear case
            if (Math.abs(b) < 1e-10) return null;
            v = -c / b;
        } else {
            const discriminant = b * b - 4 * a * c;
            if (discriminant < 0) return null;

            const sqrtD = Math.sqrt(discriminant);
            const v1 = (-b + sqrtD) / (2 * a);
            const v2 = (-b - sqrtD) / (2 * a);

            // Choose the v that's in [0, 1]
            if (v1 >= -0.01 && v1 <= 1.01) {
                v = v1;
            } else if (v2 >= -0.01 && v2 <= 1.01) {
                v = v2;
            } else {
                return null;
            }
        }

        // Solve for u
        const denom = e + g * v;
        if (Math.abs(denom) < 1e-10) {
            // Try with y equation
            const denom2 = e2 + g2 * v;
            if (Math.abs(denom2) < 1e-10) return null;
            const u = (h2 - f2 * v) / denom2;
            if (u < -0.01 || u > 1.01 || v < -0.01 || v > 1.01) return null;
            return { u: Math.max(0, Math.min(1, u)), v: Math.max(0, Math.min(1, v)) };
        }

        const u = (h - f * v) / denom;

        if (u < -0.01 || u > 1.01 || v < -0.01 || v > 1.01) return null;

        return { u: Math.max(0, Math.min(1, u)), v: Math.max(0, Math.min(1, v)) };
    }

    /**
     * Sample a pixel with bilinear interpolation
     */
    private sampleBilinear(
        data: Buffer,
        width: number,
        height: number,
        channels: number,
        x: number,
        y: number
    ): { r: number; g: number; b: number; a: number } {
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const x1 = Math.min(x0 + 1, width - 1);
        const y1 = Math.min(y0 + 1, height - 1);

        const fx = x - x0;
        const fy = y - y0;

        // Clamp coordinates
        const cx0 = Math.max(0, Math.min(x0, width - 1));
        const cy0 = Math.max(0, Math.min(y0, height - 1));
        const cx1 = Math.max(0, Math.min(x1, width - 1));
        const cy1 = Math.max(0, Math.min(y1, height - 1));

        // Get pixel values
        const getPixel = (px: number, py: number) => {
            const idx = (py * width + px) * channels;
            return {
                r: data[idx] || 0,
                g: data[idx + 1] || 0,
                b: data[idx + 2] || 0,
                a: data[idx + 3] || 0
            };
        };

        const p00 = getPixel(cx0, cy0);
        const p10 = getPixel(cx1, cy0);
        const p01 = getPixel(cx0, cy1);
        const p11 = getPixel(cx1, cy1);

        // Bilinear interpolation
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

        return {
            r: Math.round(lerp(lerp(p00.r, p10.r, fx), lerp(p01.r, p11.r, fx), fy)),
            g: Math.round(lerp(lerp(p00.g, p10.g, fx), lerp(p01.g, p11.g, fx), fy)),
            b: Math.round(lerp(lerp(p00.b, p10.b, fx), lerp(p01.b, p11.b, fx), fy)),
            a: Math.round(lerp(lerp(p00.a, p10.a, fx), lerp(p01.a, p11.a, fx), fy))
        };
    }

    /**
     * Apply cylindrical warp to simulate wrapping around an arm/cylinder
     * Uses slice-based perspective transformation
     */
    private async applyCylindricalWarp(
        inputBuffer: Buffer,
        bend: number,
        width: number,
        height: number
    ): Promise<Buffer> {
        const slices = 20;
        const sliceWidth = Math.ceil(width / slices);

        // Get input metadata
        const inputMeta = await sharp(inputBuffer).metadata();
        const inputWidth = inputMeta.width || width;
        const inputHeight = inputMeta.height || height;

        // Calculate output dimensions (may be taller due to perspective)
        const maxScale = 1 / Math.cos(0.5 * Math.PI * bend);
        const outputHeight = Math.ceil(inputHeight * maxScale);

        // Create composite operations for each slice
        const compositeOps: sharp.OverlayOptions[] = [];

        for (let i = 0; i < slices; i++) {
            const t = (i + 0.5) / slices; // Center of slice
            const angle = (t - 0.5) * Math.PI * bend;

            // Calculate perspective scale for this slice
            const perspectiveScale = Math.cos(angle);
            const sliceHeight = Math.round(inputHeight * (0.7 + 0.3 * perspectiveScale));

            // Extract slice from source
            const srcX = Math.round((i / slices) * inputWidth);
            const srcSliceWidth = Math.min(sliceWidth, inputWidth - srcX);

            if (srcSliceWidth <= 0) continue;

            try {
                const sliceBuffer = await sharp(inputBuffer)
                    .extract({
                        left: srcX,
                        top: 0,
                        width: srcSliceWidth,
                        height: inputHeight
                    })
                    .resize(srcSliceWidth, sliceHeight, { fit: 'fill' })
                    .png()
                    .toBuffer();

                // Calculate position with curve offset
                const curveOffset = Math.round(Math.sin(angle) * width * 0.1 * bend);
                const yOffset = Math.round((outputHeight - sliceHeight) / 2);

                compositeOps.push({
                    input: sliceBuffer,
                    left: Math.round(i * sliceWidth) + curveOffset,
                    top: yOffset,
                    blend: 'over'
                });
            } catch (e) {
                // Skip slices that fail to extract
                console.warn(`[TattooService] Skipping slice ${i}: ${e}`);
            }
        }

        // Create output canvas and composite slices
        const result = await sharp({
            create: {
                width: width,
                height: outputHeight,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        })
            .composite(compositeOps)
            .png()
            .toBuffer();

        // Resize back to original height
        return sharp(result)
            .resize(width, height, { fit: 'fill' })
            .png()
            .toBuffer();
    }
}

export const tattooCompositingService = new TattooCompositingService();
