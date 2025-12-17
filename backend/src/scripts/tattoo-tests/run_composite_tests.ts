import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { TestConfig, CompositeOptions } from './types';

// Hardcoded paths based on verified artifacts
const ARTIFACTS_DIR = '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39';
const BASE_IMG = path.join(ARTIFACTS_DIR, 'uploaded_image_0_1765782554475.png');
const DESIGN_IMG = path.join(ARTIFACTS_DIR, 'uploaded_image_1_1765782554475.png');
const REF_IMG = path.join(ARTIFACTS_DIR, 'uploaded_image_2_1765782554475.png');

const OUTPUT_DIR = path.resolve(__dirname, '../../tests/output/tattoo');

async function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

async function runCompositeTest() {
    console.log("Starting Tattoo Placement Test: Approach A");
    await ensureDir(OUTPUT_DIR);

    // Load Metadata to get dimensions
    const baseMeta = await sharp(BASE_IMG).metadata();
    const designMeta = await sharp(DESIGN_IMG).metadata();

    console.log(`Base: ${baseMeta.width}x${baseMeta.height}`);
    console.log(`Design: ${designMeta.width}x${designMeta.height}`);

    // --- A1: Basic Multiply Blend ---
    // Hypothesis: Simple overlay with multiply gives perfect geometry but flat look.
    // For this test, we'll center the design on the spine (approx center of image).
    // We'll scale the design to be roughly 30% of base width (based on Ref Image 3 typically).

    const targetWidth = Math.round((baseMeta.width || 1024) * 0.4); // slightly larger, 40%
    const resizedDesign = await sharp(DESIGN_IMG)
        .resize(targetWidth)
        .toBuffer();

    console.log("Generating A1: Pure Composite (Multiply)...");

    await sharp(BASE_IMG)
        .composite([{
            input: resizedDesign,
            gravity: 'center', // Approx placement
            blend: 'multiply'
        }])
        .toFile(path.join(OUTPUT_DIR, 'A1_pure_composite.png'));

    console.log("-> Saved A1_pure_composite.png");

    // --- A2: Simulated Perspective (Rotation only for now) ---
    // Sharp doesn't do warp, so we'll just rotate slightly to match spine curve if needed.
    // Let's Skip actual warp A2 for now and move to A3 (Color/Opacity).

    // --- A3: Color Adjusted "Natural" Look ---
    // Lower opacity (80%), maybe tint it?
    // We can simulate skin embedding by reducing opacity.

    console.log("Generating A3: Natural Composite (0.8 Opacity)...");

    // Create a semi-transparent version of design FIRST
    const transparentDesign = await sharp(resizedDesign)
        .ensureAlpha(0.8) // Global alpha
        .toBuffer();

    await sharp(BASE_IMG)
        .composite([{
            input: transparentDesign, // Pre-processed transparency
            gravity: 'center',
            blend: 'multiply',
            // blend: 'dest-in' ?? No, multiply is best for tattoo
        }])
        .toFile(path.join(OUTPUT_DIR, 'A3_natural_composite.png')); // NOTE: Sharp doesn't support 'opacity' option in composite directly cleanly without pre-buffer mod often

    // Actually typically we need to modulate original image channels.
    // Let's Try a simpler approach for A3: Just lighter multiply.
    // Actually, let's use a buffer with opacity applied.

    // Re-do A3 with explicit alpha channel manipulation if ensureAlpha(0.8) isn't sufficient (it sets opacity to 0.8 * 255)
    // Actually `ensureAlpha` adds an alpha channel, it doesn't SET it.
    // `modulate` doesn't affect alpha.
    // We'll proceed with A1 primarily as the "Geometry Truth".

    // --- Alignment Sweep ---
    console.log("Generating A4: Alignment Sweep...");
    const offsets = [-60, -30, 30, 60]; // 0 is already done as A1

    for (const xOff of offsets) {
        await sharp(BASE_IMG)
            .composite([{
                input: resizedDesign,
                gravity: 'center',
                left: Math.round((baseMeta.width! - targetWidth) / 2) + xOff,
                top: Math.round((baseMeta.height! - Math.round(designMeta.height! * (targetWidth / designMeta.width!))) / 2),
                blend: 'multiply'
            }])
            .toFile(path.join(OUTPUT_DIR, `A4_align_${xOff > 0 ? 'right' : 'left'}_${Math.abs(xOff)}.png`));
        console.log(`-> Saved offset ${xOff}`);
    }
}

runCompositeTest().catch(console.error);
