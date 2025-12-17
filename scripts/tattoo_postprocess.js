#!/usr/bin/env node
/**
 * Tattoo Placement: Post-Processing Only (No AI)
 * 
 * Enhance the composite to look more realistic WITHOUT any AI involvement.
 * Guarantees geometry preservation.
 * 
 * Techniques:
 * 1. Edge softening (slight blur on ink edges)
 * 2. Opacity blending (make ink more translucent)
 * 3. Color adjustment (warm up the black ink slightly)
 * 4. Gaussian blend with skin tones
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_PATH = '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/tattoo_circles/composite_result.png';
const OUTPUT_DIR = '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/tattoo_circles';

async function createVariants() {
    console.log('🎨 Creating post-processed variants (NO AI)...\n');

    const inputBuffer = fs.readFileSync(INPUT_PATH);
    const metadata = await sharp(inputBuffer).metadata();

    console.log(`Input: ${metadata.width}x${metadata.height}`);

    // Variant 1: Slight edge blur (1px Gaussian)
    console.log('\n📸 Variant 1: Edge blur (1px Gaussian)...');
    const variant1 = await sharp(inputBuffer)
        .blur(0.5) // Very subtle blur
        .png()
        .toBuffer();
    fs.writeFileSync(path.join(OUTPUT_DIR, 'variant_1_blur.png'), variant1);

    // Variant 2: Moderate edge blur (2px Gaussian)
    console.log('📸 Variant 2: Edge blur (2px Gaussian)...');
    const variant2 = await sharp(inputBuffer)
        .blur(1.0)
        .png()
        .toBuffer();
    fs.writeFileSync(path.join(OUTPUT_DIR, 'variant_2_blur.png'), variant2);

    // Variant 3: Reduced contrast (makes ink look more embedded)
    console.log('📸 Variant 3: Reduced contrast...');
    const variant3 = await sharp(inputBuffer)
        .modulate({ brightness: 1.0, saturation: 0.9 })
        .linear(0.9, 10) // Reduce contrast slightly
        .png()
        .toBuffer();
    fs.writeFileSync(path.join(OUTPUT_DIR, 'variant_3_contrast.png'), variant3);

    // Variant 4: Blur + Contrast combined
    console.log('📸 Variant 4: Blur + Contrast combined...');
    const variant4 = await sharp(inputBuffer)
        .blur(0.8)
        .modulate({ brightness: 1.0, saturation: 0.95 })
        .linear(0.92, 8)
        .png()
        .toBuffer();
    fs.writeFileSync(path.join(OUTPUT_DIR, 'variant_4_combined.png'), variant4);

    // Variant 5: Warmer ink (add slight blue/gray tint to black)
    console.log('📸 Variant 5: Warmer ink tone...');
    const variant5 = await sharp(inputBuffer)
        .blur(0.5)
        .tint({ r: 40, g: 50, b: 60 }) // Slight blue-gray tint
        .png()
        .toBuffer();
    fs.writeFileSync(path.join(OUTPUT_DIR, 'variant_5_warm.png'), variant5);

    // Variant 6: Light sharpen on tattoo (crisp edges but not harsh)
    console.log('📸 Variant 6: Crispened edges...');
    const variant6 = await sharp(inputBuffer)
        .sharpen({ sigma: 0.5, m1: 0.5, m2: 0.5 })
        .png()
        .toBuffer();
    fs.writeFileSync(path.join(OUTPUT_DIR, 'variant_6_crisp.png'), variant6);

    // Variant 7: Overlay with slight transparency simulation
    // This creates a pseudo-embedded look by blending
    console.log('📸 Variant 7: Opacity blend simulation...');

    // Load original base (no tattoo)
    const basePath = '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_0_1765782554475.png';
    const baseBuffer = fs.readFileSync(basePath);

    // Resize base to match composite if needed
    const baseMeta = await sharp(baseBuffer).metadata();
    let resizedBase = baseBuffer;
    if (baseMeta.width !== metadata.width || baseMeta.height !== metadata.height) {
        resizedBase = await sharp(baseBuffer)
            .resize(metadata.width, metadata.height)
            .toBuffer();
    }

    // Blend composite over base with reduced opacity
    const variant7 = await sharp(resizedBase)
        .composite([{
            input: await sharp(inputBuffer)
                .blur(0.3)
                .ensureAlpha(0.85) // 85% opacity
                .toBuffer(),
            blend: 'over'
        }])
        .png()
        .toBuffer();
    fs.writeFileSync(path.join(OUTPUT_DIR, 'variant_7_opacity.png'), variant7);

    console.log('\n✅ All variants saved to:', OUTPUT_DIR);
    console.log('\nVariants created:');
    console.log('  1. variant_1_blur.png     - Slight 0.5px blur');
    console.log('  2. variant_2_blur.png     - Moderate 1px blur');
    console.log('  3. variant_3_contrast.png - Reduced contrast');
    console.log('  4. variant_4_combined.png - Blur + contrast');
    console.log('  5. variant_5_warm.png     - Warmer ink tone');
    console.log('  6. variant_6_crisp.png    - Crispened edges');
    console.log('  7. variant_7_opacity.png  - Opacity blend (85%)');
}

createVariants().catch(console.error);
