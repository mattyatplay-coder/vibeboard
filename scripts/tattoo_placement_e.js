#!/usr/bin/env node
/**
 * Tattoo Placement Test: Approach E - Per-Circle Sectioning
 * 
 * This script sections the tattoo design into 8 individual circles,
 * calculates precise spine placement coordinates, and composites each
 * circle onto the base image with exact control.
 * 
 * Steps:
 * 1. Load Image 2 (design) and analyze circle positions
 * 2. Crop each of the 8 circles into separate images
 * 3. Analyze Image 3 (reference) to extract spine coordinates
 * 4. Place each circle onto Image 1 (base) at calculated positions
 * 5. Save the composite result
 * 6. Optionally run light AI bake for realism
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

// API Config
const BASE_URL = 'http://localhost:3001';
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

async function analyzeDesign() {
    /**
     * Analyze Image 2 to find the 8 circle positions.
     * The design is a vertical stack of circles on a white background.
     * We'll find the bounding box of the black ink and divide it into 8 equal sections.
     */
    console.log('\n📐 Analyzing design...');

    const designBuffer = fs.readFileSync(IMAGES.design);
    const metadata = await sharp(designBuffer).metadata();

    // Get image data to find ink bounds
    const { data, info } = await sharp(designBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

    // Find top and bottom of ink (black pixels)
    let topY = info.height;
    let bottomY = 0;
    let leftX = info.width;
    let rightX = 0;

    for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
            const idx = (y * info.width + x) * info.channels;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Detect black/dark pixels (ink)
            if (r < 50 && g < 50 && b < 50) {
                if (y < topY) topY = y;
                if (y > bottomY) bottomY = y;
                if (x < leftX) leftX = x;
                if (x > rightX) rightX = x;
            }
        }
    }

    const inkHeight = bottomY - topY;
    const inkWidth = rightX - leftX;
    const circleHeight = inkHeight / 8; // 8 circles stacked

    console.log(`   Design dimensions: ${info.width}x${info.height}`);
    console.log(`   Ink bounds: top=${topY}, bottom=${bottomY}, height=${inkHeight}`);
    console.log(`   Estimated circle height: ${circleHeight.toFixed(1)}px`);

    return {
        designWidth: info.width,
        designHeight: info.height,
        inkBounds: { topY, bottomY, leftX, rightX },
        inkHeight,
        inkWidth,
        circleHeight
    };
}

async function sectionCircles(designInfo) {
    /**
     * Crop each of the 8 circles from the design image.
     * Add padding around each circle for clean edges.
     */
    console.log('\n✂️ Sectioning into 8 circles...');

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const designBuffer = fs.readFileSync(IMAGES.design);
    const { inkBounds, circleHeight, designWidth } = designInfo;

    const circles = [];
    const padding = Math.floor(circleHeight * 0.1); // 10% padding

    for (let i = 0; i < 8; i++) {
        const y = inkBounds.topY + (i * circleHeight) - padding;
        const height = circleHeight + (padding * 2);

        // Center X crop (use full width to capture the circle)
        const cropConfig = {
            left: Math.max(0, inkBounds.leftX - padding),
            top: Math.max(0, Math.floor(y)),
            width: Math.min(designWidth, inkBounds.rightX - inkBounds.leftX + (padding * 2)),
            height: Math.min(designInfo.designHeight - Math.floor(y), Math.floor(height))
        };

        const circleBuffer = await sharp(designBuffer)
            .extract(cropConfig)
            .png()
            .toBuffer();

        const circlePath = path.join(OUTPUT_DIR, `circle_${i + 1}.png`);
        fs.writeFileSync(circlePath, circleBuffer);

        circles.push({
            index: i + 1,
            path: circlePath,
            buffer: circleBuffer,
            originalY: y,
            height: height
        });

        console.log(`   Circle ${i + 1}: cropped at y=${Math.floor(y)}, height=${Math.floor(height)}`);
    }

    return circles;
}

async function analyzeReference() {
    /**
     * Analyze Image 3 (reference) to extract:
     * - Spine centerline X position (as % of width)
     * - Top and bottom Y positions (as % of height)
     * - Circle size relative to image
     */
    console.log('\n📏 Analyzing reference image for placement...');

    const refBuffer = fs.readFileSync(IMAGES.reference);
    const metadata = await sharp(refBuffer).metadata();

    // For the reference image, detect the tattoo position
    const { data, info } = await sharp(refBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

    // Find ink bounds in reference (darker pixels)
    let topY = info.height;
    let bottomY = 0;
    let leftX = info.width;
    let rightX = 0;

    for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
            const idx = (y * info.width + x) * info.channels;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Detect dark tattoo pixels (more lenient threshold for skin contrast)
            if (r < 80 && g < 80 && b < 80) {
                if (y < topY) topY = y;
                if (y > bottomY) bottomY = y;
                if (x < leftX) leftX = x;
                if (x > rightX) rightX = x;
            }
        }
    }

    // Calculate as percentages
    const centerX = (leftX + rightX) / 2;
    const tattooWidth = rightX - leftX;
    const tattooHeight = bottomY - topY;

    const placement = {
        centerXPercent: centerX / info.width,
        topYPercent: topY / info.height,
        bottomYPercent: bottomY / info.height,
        widthPercent: tattooWidth / info.width,
        heightPercent: tattooHeight / info.height
    };

    console.log(`   Reference dimensions: ${info.width}x${info.height}`);
    console.log(`   Tattoo center X: ${(placement.centerXPercent * 100).toFixed(1)}%`);
    console.log(`   Tattoo Y span: ${(placement.topYPercent * 100).toFixed(1)}% to ${(placement.bottomYPercent * 100).toFixed(1)}%`);
    console.log(`   Tattoo size: ${(placement.widthPercent * 100).toFixed(1)}% x ${(placement.heightPercent * 100).toFixed(1)}%`);

    return placement;
}

async function compositeOntoBase(circles, placement) {
    /**
     * Place each circle onto Image 1 (base) using the placement data from reference.
     */
    console.log('\n🎨 Compositing onto base image...');

    const baseBuffer = fs.readFileSync(IMAGES.base);
    const baseMeta = await sharp(baseBuffer).metadata();

    // Calculate target positions
    const targetCenterX = Math.floor(baseMeta.width * placement.centerXPercent);
    const targetTopY = Math.floor(baseMeta.height * placement.topYPercent);
    const targetBottomY = Math.floor(baseMeta.height * placement.bottomYPercent);
    const targetHeight = targetBottomY - targetTopY;
    const circleTargetHeight = targetHeight / 8;

    // Calculate target width (maintain aspect ratio from circles)
    const sampleCircleMeta = await sharp(circles[0].buffer).metadata();
    const aspectRatio = sampleCircleMeta.width / sampleCircleMeta.height;
    const circleTargetWidth = Math.floor(circleTargetHeight * aspectRatio);

    console.log(`   Base dimensions: ${baseMeta.width}x${baseMeta.height}`);
    console.log(`   Target center X: ${targetCenterX}`);
    console.log(`   Target Y span: ${targetTopY} to ${targetBottomY}`);
    console.log(`   Each circle: ${circleTargetWidth}x${Math.floor(circleTargetHeight)}`);

    // Prepare composite operations
    const compositeOps = [];

    for (let i = 0; i < circles.length; i++) {
        // Resize circle to target size
        const resizedCircle = await sharp(circles[i].buffer)
            .resize(circleTargetWidth, Math.floor(circleTargetHeight), { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .png()
            .toBuffer();

        const yPos = targetTopY + (i * circleTargetHeight);
        const xPos = targetCenterX - (circleTargetWidth / 2);

        compositeOps.push({
            input: resizedCircle,
            top: Math.floor(yPos),
            left: Math.floor(xPos),
            blend: 'multiply' // White becomes transparent, black becomes ink
        });
    }

    // Create the composite
    const compositeBuffer = await sharp(baseBuffer)
        .composite(compositeOps)
        .png()
        .toBuffer();

    // Save the result
    const outputPath = path.join(OUTPUT_DIR, 'composite_result.png');
    fs.writeFileSync(outputPath, compositeBuffer);
    console.log(`   ✅ Composite saved to: ${outputPath}`);

    return { outputPath, compositeBuffer };
}

async function runLightBake(compositeDataUrl) {
    /**
     * Run a light AI bake to add skin texture while preserving geometry.
     */
    console.log('\n🔥 Running light AI bake (Approach B1: 0.15 strength)...');

    const body = {
        mode: "image_to_image",
        inputPrompt: "hyperrealistic photo of woman's back, tattoo on spine, black ink embedded in skin, natural skin texture, pores, realistic lighting",
        negativePrompt: "sticker, flat, cartoon, drawing, harsh edges, plastic skin",
        sourceImageUrl: compositeDataUrl,
        strength: 0.15, // Very light - preserve geometry
        sessionId: null,
        engine: "fal",
        falModel: "fal-ai/flux/dev",
        guidanceScale: 4.0,
        steps: 25
    };

    try {
        const response = await fetch(`${BASE_URL}/api/projects/${PROJECT_ID}/generations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return { success: true, id: data.id };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('🎯 Tattoo Placement Test: Approach E - Per-Circle Sectioning');
    console.log('============================================================\n');

    try {
        // Step 1: Analyze the design
        const designInfo = await analyzeDesign();

        // Step 2: Section into 8 circles
        const circles = await sectionCircles(designInfo);

        // Step 3: Analyze reference for placement
        const placement = await analyzeReference();

        // Step 4: Composite onto base
        const { outputPath, compositeBuffer } = await compositeOntoBase(circles, placement);

        // Step 5: Run light AI bake
        const compositeDataUrl = `data:image/png;base64,${compositeBuffer.toString('base64')}`;
        const bakeResult = await runLightBake(compositeDataUrl);

        console.log('\n============================================================');
        console.log('📊 Results:');
        console.log(`   Composite (pure digital): ${outputPath}`);
        if (bakeResult.success) {
            console.log(`   AI Bake job queued: ${bakeResult.id}`);
        } else {
            console.log(`   AI Bake failed: ${bakeResult.error}`);
        }
        console.log('\n✅ Approach E complete. Compare the composite vs the baked result.');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main();
