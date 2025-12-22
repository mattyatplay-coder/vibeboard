import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR =
  '/Users/matthenrichmacbook/.gemini/antigravity/brain/5984830a-acdb-4d0a-8835-323b1c56bd39';
const BASE_IMG = path.join(ARTIFACTS_DIR, 'uploaded_image_0_1765782554475.png');
const DESIGN_IMG = path.join(ARTIFACTS_DIR, 'uploaded_image_1_1765782554475.png');
const OUTPUT_DIR = path.resolve(__dirname, '../../tests/output/tattoo');

// A4 R60 Alignment Constants (from verify step)
// Base: 495x1022, Design: 644x1024 (Scaled to ~40% width -> 198px)
// R60 meant we shifted it Right by 60px from center.
// We need to replicate that placement exactly.

async function runAdvancedComposite() {
  console.log('Starting Approach G: Advanced Composite (Photoshop Sim)...');

  // 1. Setup - Recreate the "Placed" Tattoo Layer in memory (R60)
  const baseMeta = await sharp(BASE_IMG).metadata();
  const designMeta = await sharp(DESIGN_IMG).metadata();

  const targetWidth = Math.round((baseMeta.width || 1024) * 0.4);
  const xOff = 60; // Right 60

  // Placement coordinates
  const leftPos = Math.round((baseMeta.width! - targetWidth) / 2) + xOff;
  const topPos = Math.round(
    (baseMeta.height! - Math.round(designMeta.height! * (targetWidth / designMeta.width!))) / 2
  );

  const resizedDesign = await sharp(DESIGN_IMG).resize(targetWidth).toBuffer();

  // Create a full-size blank canvas with just the tattoo placed on it
  // This represents the "Tattoo Layer" in Photoshop
  const tattooLayer = await sharp({
    create: {
      width: baseMeta.width!,
      height: baseMeta.height!,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: resizedDesign,
        left: leftPos,
        top: topPos,
        blend: 'over',
      },
    ])
    .png()
    .toBuffer();

  // --- G1: Ink Spread & Fade (Blur + Opacity) ---
  // Photoshop: Gaussian Blur 1px, Opacity 85%, Multiply

  const g1_blur = await sharp(tattooLayer)
    .blur(0.8) // Slight ink spread
    .ensureAlpha(0.85) // 85% opacity
    .toBuffer();

  await sharp(BASE_IMG)
    .composite([
      {
        input: g1_blur,
        blend: 'multiply',
      },
    ])
    .toFile(path.join(OUTPUT_DIR, 'G1_blur_fade.png'));
  console.log('-> Saved G1_blur_fade.png');

  // --- G2: Texture Overlay (Simulate High Pass) ---
  // Idea: Take Base Image -> Grayscale -> High Contrast -> Overlay ON TOP of Tattoo Layer
  // Then composite that whole stack onto the base.

  // 1. Extract texture from base (Grayscale)
  // We only need the texture where the tattoo is.
  const textureMap = await sharp(BASE_IMG)
    .grayscale()
    // Increase contrast to pop the skin pores/highlights? Sharp doesn't have easy contrast/levels.
    // We can approximate by normalizing or linear?
    // Let's just use the grayscale base for now as "Hard Light" or "Overlay" source.
    .toBuffer();

  // 2. Composite: Tattoo Layer (Bottom) + Texture Map (Top, Overlay)
  // IMPORTANT: The texture map needs to be clipped TO the tattoo.
  // `mode: dest-in` handles masking.

  // Actually, simpler:
  // Base Image (Background)
  // + Tattoo Layer (Multiple)
  // + Base Image (Again, Grayscale, overlay mode, Masked to Tattoo Alpha)

  // Let's make the "Textured Tattoo Layer"
  // Take Tattoo Layer -> Composite [ TextureMap using 'overlay' ] -> ERROR: this affects transparent areas?
  // We need to mask the texture map to the tattoo alpha.

  const maskedTexture = await sharp(textureMap)
    .composite([
      {
        input: tattooLayer,
        blend: 'dest-in', // Keep texture only where tattoo exists
      },
    ])
    .toBuffer();

  // Now adding color tint (Green/Blue) for "Old Ink" look? User mentioned green tint.
  // Let's simulate that by tinting the tattoo layer itself before compositing.
  const tintedTattoo = await sharp(tattooLayer)
    .tint({ r: 40, g: 60, b: 50 }) // Dark Greenish Gray? Tint replaces non-alpha.
    // Actually tint might be too strong color replacement.
    // Let's stick to black for now, focusing on texture.
    .toBuffer();

  // Final Stack for G2:
  // 1. Base
  // 2. Tattoo (Blurred, Opacity 0.9, Multiply)
  // 3. Masked Texture (Overlay, Opacity 0.5?) -> Adds skin highlights ON TOP of black ink

  const g2_texture = await sharp(BASE_IMG)
    .composite([
      { input: g1_blur, blend: 'multiply' }, // The Ink
      { input: maskedTexture, blend: 'overlay' }, // The Skin Texture popping through
    ])
    .toFile(path.join(OUTPUT_DIR, 'G2_texture_overlay.png'));
  console.log('-> Saved G2_texture_overlay.png');

  // --- G3: "Blend If" Simulation (Luminance Masking) ---
  // If skin is very bright (highlights), tattoo should be almost invisible.
  // We can use the textureMap (luminance) as an alpha mask for the tattoo.
  // Ideally: Alpha = OriginalAlpha * (1 - Luminance)  <-- approximate Blend If

  // Sharp `arithmetic` operations? Or just use `dest-in` with an inverted luminance map?
  // Let's try: Invert Base Grayscale -> Use as mask?
  // If pixel is White (Highlight) -> Inverted is Black (Transparent) -> Tattoo hidden.

  // 1. Create Luminance Mask
  const luminanceMask = await sharp(BASE_IMG)
    .grayscale()
    .negate() // Invert: White(High) becomes Black(Transp)
    // Adjust gamma to make midtones solid, only highlights transparent?
    .gamma(2.2)
    .toBuffer();

  // 2. Apply this mask to the Tattoo Layer
  const blendIfTattoo = await sharp(g1_blur) // Start with the blurred/faded version
    .composite([
      {
        input: luminanceMask,
        blend: 'dest-in',
      },
    ])
    .toBuffer();

  const g3_blend_if = await sharp(BASE_IMG)
    .composite([{ input: blendIfTattoo, blend: 'multiply' }])
    .toFile(path.join(OUTPUT_DIR, 'G3_blend_if_sim.png'));
  console.log('-> Saved G3_blend_if_sim.png');

  console.log('Test G Complete.');
}

runAdvancedComposite().catch(console.error);
