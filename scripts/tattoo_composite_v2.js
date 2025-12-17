#!/usr/bin/env node
/**
 * Tattoo Placement V2: FIXED Composite
 * 
 * Previous issues:
 * 1. White background not becoming transparent
 * 2. Multiply blend mode creating artifacts
 * 
 * Fix:
 * 1. Convert white pixels to transparent (alpha channel)
 * 2. Use 'over' blend mode for clean overlay
 * 3. Don't crop into sections - use the FULL design image
 * 4. Scale and position based on Image 3 reference
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Reference Images
const IMAGES = {
    base: '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_0_1765782554475.png',
    design: '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_1_1765782554475.png',
    reference: '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/uploaded_image_2_1765782554475.png'
};

const OUTPUT_DIR = '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39/tattoo_circles';

async function convertWhiteToTransparent(inputBuffer) {
    /**
     * Convert all white/near-white pixels to transparent.
     * This is the KEY fix - the design has a white background that needs to be removed.
     */
    console.log('🔄 Converting white background to transparent...');

    const { data, info } = await sharp(inputBuffer)
        .ensureAlpha() // Add alpha channel
        .raw()
        .toBuffer({ resolveWithObject: true });

    const channels = 4; // RGBA
    const threshold = 240; // Pixels brighter than this become transparent

    // Process each pixel
    for (let i = 0; i < data.length; i += channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // If pixel is white/near-white, make it transparent
        if (r > threshold && g > threshold && b > threshold) {
            data[i + 3] = 0; // Set alpha to 0 (transparent)
        }
    }

    // Create new image from modified buffer
    const transparentBuffer = await sharp(data, {
        raw: {
            width: info.width,
            height: info.height,
            channels: channels
        }
    })
        .png()
        .toBuffer();

    console.log(`   ✅ Converted ${info.width}x${info.height} image`);
    return transparentBuffer;
}

async function analyzeReference() {
    /**
     * Get the exact placement coordinates from Image 3 (reference).
     */
    console.log('\n📏 Analyzing reference for placement...');

    const refBuffer = fs.readFileSync(IMAGES.reference);
    const refMeta = await sharp(refBuffer).metadata();

    // The tattoo in Image 3 is positioned:
    // - Horizontally: Roughly 55% from left (slightly right of center due to pose)
    // - Vertically: From ~15% to ~85% of image height
    // These are based on visual inspection of Image 3

    const placement = {
        centerXPercent: 0.55, // Center of tattoo X position
        topYPercent: 0.12,   // Top of tattoo
        bottomYPercent: 0.85, // Bottom of tattoo
        widthPercent: 0.12   // Width of tattoo relative to image
    };

    console.log(`   Reference: ${refMeta.width}x${refMeta.height}`);
    console.log(`   Placement: center=${(placement.centerXPercent * 100)}% X, ${(placement.topYPercent * 100)}%-${(placement.bottomYPercent * 100)}% Y`);

    return placement;
}

async function createFixedComposite() {
    console.log('🎯 Creating FIXED composite...\n');

    // 1. Load base image
    const baseBuffer = fs.readFileSync(IMAGES.base);
    const baseMeta = await sharp(baseBuffer).metadata();
    console.log(`Base image: ${baseMeta.width}x${baseMeta.height}`);

    // 2. Load and fix design (convert white to transparent)
    const designBuffer = fs.readFileSync(IMAGES.design);
    const transparentDesign = await convertWhiteToTransparent(designBuffer);

    // Save the transparent version for debugging
    fs.writeFileSync(path.join(OUTPUT_DIR, 'design_transparent.png'), transparentDesign);
    console.log('   Saved: design_transparent.png');

    // 3. Get placement from reference
    const placement = await analyzeReference();

    // 4. Calculate target dimensions
    const targetHeight = Math.floor(baseMeta.height * (placement.bottomYPercent - placement.topYPercent));
    const targetWidth = Math.floor(baseMeta.width * placement.widthPercent);
    const targetTop = Math.floor(baseMeta.height * placement.topYPercent);
    const targetCenterX = Math.floor(baseMeta.width * placement.centerXPercent);
    const targetLeft = targetCenterX - (targetWidth / 2);

    console.log(`\n📐 Target placement:`);
    console.log(`   Size: ${targetWidth}x${targetHeight}`);
    console.log(`   Position: (${Math.floor(targetLeft)}, ${targetTop})`);

    // 5. Resize the transparent design to fit
    const resizedDesign = await sharp(transparentDesign)
        .resize(targetWidth, targetHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

    // Save resized for debugging
    fs.writeFileSync(path.join(OUTPUT_DIR, 'design_resized.png'), resizedDesign);
    console.log('   Saved: design_resized.png');

    // 6. Composite onto base using 'over' blend (transparent areas show base through)
    const composite = await sharp(baseBuffer)
        .composite([{
            input: resizedDesign,
            top: targetTop,
            left: Math.floor(targetLeft),
            blend: 'over' // Standard alpha compositing
        }])
        .png()
        .toBuffer();

    const outputPath = path.join(OUTPUT_DIR, 'composite_fixed.png');
    fs.writeFileSync(outputPath, composite);
    console.log(`\n✅ Fixed composite saved: ${outputPath}`);

    return { outputPath, composite };
}

async function main() {
    console.log('🎨 Tattoo Placement V2: FIXED Composite');
    console.log('======================================\n');

    try {
        // Ensure output directory exists
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        const result = await createFixedComposite();

        console.log('\n======================================');
        console.log('📊 Files created:');
        console.log('   - design_transparent.png (white removed)');
        console.log('   - design_resized.png (scaled to fit)');
        console.log('   - composite_fixed.png (final result)');
        console.log('\n✅ Check composite_fixed.png - this should have NO white rectangles.');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main();
