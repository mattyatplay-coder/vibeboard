import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { GenerationService } from '../GenerationService';
import { GenerationOptions } from '../generators/GenerationProvider';
import * as fal from '@fal-ai/serverless-client';

// Pose Preset Types
export type PosePresetKey =
  | 'universal'
  | 'swimwear'
  | 'casual'
  | 'formal'
  | 'fantasy'
  | 'anime'
  | 'cartoon';

export interface PosePreset {
  name: string;
  description: string;
  stylePrefix?: string; // Added to all prompts for style consistency
  poses: string[];
}

// Custom preset interface (from database or passed in)
export interface CustomPosePresetData {
  name: string;
  description?: string;
  stylePrefix?: string;
  poses: string[];
}

// Pose Presets - clothing/style-aware pose sets
export const POSE_PRESETS: Record<PosePresetKey, PosePreset> = {
  universal: {
    name: 'Universal',
    description: 'Works with any character type - no clothing-specific poses',
    poses: [
      // Core angles (essential for LoRA)
      'front view, facing camera directly, standing straight with arms at sides',
      "three-quarter view, body angled toward camera's left side, standing",
      "three-quarter view, body angled toward camera's right side, standing",
      'side profile, nose pointing toward left edge of frame, standing',
      'side profile, nose pointing toward right edge of frame, standing',
      'back view looking over shoulder at camera',

      // Different framings
      'close-up portrait, head and shoulders only, cropped at chest, no body visible below shoulders',
      'medium shot cropped at waist, upper body only, no legs visible, relaxed pose',
      'full body shot, standing confidently',

      // Expression variations
      'smiling warmly, friendly expression, front view',
      'serious expression, focused look, front view',
      'looking up thoughtfully, head tilted back slightly',

      // Universal action poses (no pockets, no clothing-dependent actions)
      'arms crossed confidently, standing, front view',
      'one hand on hip, casual confident pose',
      'arms relaxed at sides, weight shifted to one leg, relaxed stance',
      'walking pose, caught mid-stride, three-quarter view',
      'sitting casually, three-quarter view',

      // Dynamic poses
      'pointing forward with index finger, front view',
      'waving hand in greeting, front view',
      'hand on chin, thinking pose, three-quarter view',
    ],
  },

  swimwear: {
    name: 'Swimwear / Minimal Clothing',
    description: 'Bikinis, underwear, shirtless - no pocket or heavy clothing poses',
    poses: [
      // Core angles
      'front view, facing camera directly, standing straight with arms at sides',
      "three-quarter view, body angled toward camera's left side, standing",
      "three-quarter view, body angled toward camera's right side, standing",
      'side profile, nose pointing toward left edge of frame, standing',
      'side profile, nose pointing toward right edge of frame, standing',
      'back view looking over shoulder at camera',

      // Framings
      'close-up portrait, head and shoulders only, cropped at chest, no body visible below shoulders',
      'medium shot cropped at waist, upper body only, no legs visible',
      'full body shot, standing confidently',

      // Expressions
      'smiling warmly, friendly expression, front view',
      'serious expression, confident look, front view',
      'looking away thoughtfully, candid moment',

      // Swimwear-appropriate poses
      'arms crossed confidently, standing, front view',
      'one hand on hip, casual confident pose',
      'both hands on hips, power pose, front view',
      'arms relaxed at sides, weight shifted, relaxed stance',
      'walking pose, caught mid-stride, three-quarter view',

      // Beach/pool appropriate
      'hand running through hair, candid pose',
      'arms stretched overhead, stretching pose',
      'sitting casually, three-quarter view',
    ],
  },

  casual: {
    name: 'Casual Clothing',
    description: 'T-shirts, jeans, dresses - includes pockets and everyday poses',
    poses: [
      // Core angles
      'front view, facing camera directly, standing straight with arms at sides',
      "three-quarter view, body angled toward camera's left side, standing",
      "three-quarter view, body angled toward camera's right side, standing",
      'side profile, nose pointing toward left edge of frame, standing',
      'side profile, nose pointing toward right edge of frame, standing',
      'back view looking over shoulder at camera',

      // Framings
      'close-up portrait, head and shoulders only, cropped at chest, no body visible below shoulders',
      'medium shot cropped at waist, upper body only, no legs visible, relaxed pose',
      'full body shot, standing confidently',

      // Expressions
      'smiling warmly, friendly expression, front view',
      'serious expression, focused look, front view',
      'laughing naturally, candid expression',

      // Casual poses (includes pockets)
      'arms crossed confidently, standing, front view',
      'one hand on hip, casual confident pose',
      'hands in pockets, relaxed stance',
      'thumbs hooked in pockets, casual stance',
      'walking pose, caught mid-stride, three-quarter view',
      'sitting casually, three-quarter view',
      'leaning against wall, casual pose, three-quarter view',

      // Dynamic
      'waving hand in greeting, front view',
      'hand on chin, thinking pose, three-quarter view',
    ],
  },

  formal: {
    name: 'Formal / Business',
    description: 'Suits, professional attire - dignified poses',
    poses: [
      // Core angles
      'front view, facing camera directly, standing straight with arms at sides',
      "three-quarter view, body angled toward camera's left side, standing",
      "three-quarter view, body angled toward camera's right side, standing",
      'side profile, nose pointing toward left edge of frame, standing',
      'side profile, nose pointing toward right edge of frame, standing',

      // Framings
      'close-up portrait, head and shoulders only, cropped at chest, professional headshot',
      'medium shot cropped at waist, upper body only, professional pose',
      'full body shot, standing confidently, professional stance',

      // Professional expressions
      'confident smile, professional expression, front view',
      'serious expression, authoritative look, front view',
      'slight smile, approachable professional expression',

      // Business poses
      'arms crossed confidently, standing, front view',
      'hands clasped in front, professional stance',
      'one hand adjusting tie or collar, professional gesture',
      'hands in suit pockets, confident business pose',
      'sitting in chair, professional pose, three-quarter view',
      'standing with briefcase or folder, professional',

      // Presentation poses
      'gesturing while speaking, presentation pose',
      'hand extended for handshake, welcoming pose',
    ],
  },

  fantasy: {
    name: 'Fantasy / Armor',
    description: 'Knights, warriors, fantasy characters - heroic and combat poses',
    poses: [
      // Core angles
      'front view, facing camera directly, standing heroically',
      "three-quarter view, body angled toward camera's left side, battle stance",
      "three-quarter view, body angled toward camera's right side, alert pose",
      'side profile, nose pointing toward left edge of frame, vigilant stance',
      'side profile, nose pointing toward right edge of frame, looking into distance',
      'back view looking over shoulder at camera, cape flowing',

      // Framings
      'close-up portrait, head and shoulders only, cropped at chest, intense expression',
      'medium shot cropped at waist, upper body armor visible',
      'full body shot, heroic stance, weapon ready',

      // Fantasy expressions
      'determined expression, steely gaze, front view',
      'battle cry expression, fierce look, front view',
      'stoic expression, noble bearing, front view',

      // Combat/heroic poses
      'arms crossed over chest, imposing stance',
      'hand resting on sword hilt, ready stance',
      'defensive stance, shield raised',
      'attack pose, weapon drawn, dynamic angle',
      'kneeling pose, one knee down, respectful',
      'standing victorious, weapon raised',

      // Dynamic fantasy
      'casting spell pose, hands glowing with energy',
      'looking at magical artifact, examining pose',
      'walking through mystical environment, adventurer pose',
    ],
  },

  anime: {
    name: 'Anime Character',
    description: '2D anime style - exaggerated expressions and dynamic poses',
    stylePrefix: 'anime style, 2D illustration',
    poses: [
      // Core angles
      'front view, facing camera directly, standing with confident anime pose',
      "three-quarter view, body angled toward camera's left side, dynamic stance",
      "three-quarter view, body angled toward camera's right side, action ready",
      'side profile, nose pointing toward left edge of frame, wind in hair',
      'side profile, nose pointing toward right edge of frame, dramatic profile',
      'back view looking over shoulder at camera, hair flowing',

      // Framings
      'close-up portrait, head and shoulders only, cropped at chest, expressive eyes',
      'medium shot cropped at waist, upper body only, dynamic pose',
      'full body shot, iconic anime stance',

      // Anime expressions (exaggerated)
      'big cheerful smile, sparkly eyes, happy expression, front view',
      'determined expression, intense eyes, serious anime look',
      'surprised expression, wide eyes, shocked anime reaction',
      'blushing shyly, embarrassed anime expression',

      // Anime poses
      'peace sign near face, cute pose, front view',
      'fist pump, excited victory pose',
      'arms crossed, tsundere pose, looking away',
      'hands on hips, confident protagonist pose',
      'running pose, dynamic motion lines implied',
      'jumping pose, mid-air, excited',

      // Action anime
      'battle stance, ready to fight',
      'pointing dramatically, accusation pose',
      'hand reaching toward camera, dramatic reach',
    ],
  },

  cartoon: {
    name: 'Cartoon / Mascot',
    description: 'Chibi, mascots, simplified characters - big expressions, simple poses',
    stylePrefix: 'cartoon style, mascot character',
    poses: [
      // Core angles (simpler for cartoon)
      'front view, facing camera directly, standing with arms at sides',
      'three-quarter view, body angled slightly, friendly stance',
      'side profile, simple silhouette pose',

      // Framings
      'close-up portrait, head and shoulders only, big expressive face',
      'medium shot, upper body visible, cute pose',
      'full body shot, simple standing pose',

      // Big cartoon expressions
      'huge smile, very happy expression, front view',
      'surprised face, big round eyes, shocked expression',
      'sad expression, puppy dog eyes, front view',
      'angry expression, puffed cheeks, front view',
      'winking, playful expression, front view',

      // Simple cartoon poses
      'waving hello, friendly wave, front view',
      'thumbs up, encouraging pose, front view',
      'arms spread wide, welcoming pose',
      'jumping for joy, excited pose',
      'sitting cutely, three-quarter view',
      'sleeping pose, peaceful expression',

      // Mascot poses
      'dancing pose, happy movement',
      'pointing at something, directing attention',
      'shrugging, confused pose',
    ],
  },
};

// Legacy export for backwards compatibility
const POSE_PROMPTS = POSE_PRESETS.universal.poses;

export class DatasetGeneratorService {
  private generationService: GenerationService;

  constructor() {
    this.generationService = new GenerationService('fal');
  }

  /**
   * Get available preset keys for UI
   */
  static getPresetOptions(): { key: PosePresetKey; name: string; description: string }[] {
    return Object.entries(POSE_PRESETS).map(([key, preset]) => ({
      key: key as PosePresetKey,
      name: preset.name,
      description: preset.description,
    }));
  }

  /**
   * Upload local file to Fal Storage
   */
  private async uploadToFalResult(filePath: string): Promise<string> {
    try {
      console.log(`[DatasetGenerator] Uploading source to Fal: ${filePath}`);
      const fileBuffer = fs.readFileSync(filePath);
      const blob = new Blob([fileBuffer]);
      const url = await fal.storage.upload(blob);
      return url;
    } catch (error) {
      console.error('Fal upload failed:', error);
      throw new Error('Failed to upload source image to Fal');
    }
  }

  /**
   * Generate a synthetic dataset from a single source image
   * Uses Flux 2 Max for character consistency with pose variation
   *
   * @param presetKeyOrCustom - Either a built-in preset key or a custom preset object
   */
  async generateVariations(
    sourceImage: string, // Local file path or URL
    triggerWord: string,
    basePrompt: string = 'a person',
    projectId: string,
    jobId: string,
    characterDescription?: string,
    presetKeyOrCustom: PosePresetKey | CustomPosePresetData = 'universal'
  ): Promise<{ count: number; outputDir: string }> {
    console.log(`[DatasetGenerator] Starting generation for Job ${jobId}...`);

    // Get the pose preset - either built-in or custom
    let preset: PosePreset | CustomPosePresetData;
    let presetName: string;

    if (typeof presetKeyOrCustom === 'string') {
      // Built-in preset by key
      preset = POSE_PRESETS[presetKeyOrCustom] || POSE_PRESETS.universal;
      presetName = preset.name;
      console.log(`[DatasetGenerator] Using built-in preset: ${presetKeyOrCustom}`);
    } else {
      // Custom preset object passed directly
      preset = presetKeyOrCustom;
      presetName = preset.name || 'Custom';
      console.log(
        `[DatasetGenerator] Using custom preset: ${presetName} (${preset.poses.length} poses)`
      );
    }

    const poses = preset.poses;
    const stylePrefix = preset.stylePrefix || '';

    // 1. Setup Output Directory
    const outputDir = path.resolve(__dirname, `../../../datasets/synthetic_${jobId}`);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 2. Prepare Source Image URL
    let sourceUrl = sourceImage;
    if (!sourceImage.startsWith('http')) {
      if (fs.existsSync(sourceImage)) {
        sourceUrl = await this.uploadToFalResult(sourceImage);
        console.log(`[DatasetGenerator] Source uploaded: ${sourceUrl}`);
      } else {
        throw new Error(`Source image not found at ${sourceImage}`);
      }
    }

    // 3. Prepare Description for captions
    let descriptionToUse = characterDescription || '';
    descriptionToUse = descriptionToUse.replace(/@[Ii]mage\d+[,\s]*/g, '').trim();

    if (!descriptionToUse) {
      try {
        console.log(`[DatasetGenerator] 🔍 No description provided, analyzing source image...`);
        // Enhanced analysis prompt that detects style
        const analysisPrompt =
          'Describe this character briefly: art style (realistic, anime, cartoon, 3D render), hair color, hair style, facial hair, clothing, accessories. Be specific about colors and style. Do not describe background.';
        const autoCaption = await this.generationService.analyzeImage(sourceUrl, analysisPrompt);
        console.log(`[DatasetGenerator] 🤖 Auto-Caption: "${autoCaption.substring(0, 150)}"`);
        descriptionToUse = autoCaption;
      } catch (err) {
        console.warn(
          `[DatasetGenerator] Warning: Auto-captioning failed, using trigger word only.`,
          err
        );
        descriptionToUse = 'character';
      }
    } else {
      console.log(
        `[DatasetGenerator] 📝 Using user-provided description: "${descriptionToUse.substring(0, 100)}..."`
      );
    }

    // Add style prefix if present
    if (stylePrefix) {
      descriptionToUse = `${stylePrefix}, ${descriptionToUse}`;
    }

    // 4. Generate pose variations using Flux 2 Max
    let generatedCount = 0;
    const totalPoses = poses.length;

    console.log(
      `[DatasetGenerator] ⚡ Using Flux 2 Max for ${totalPoses} pose variations (${presetName} preset)...`
    );

    for (let i = 0; i < totalPoses; i++) {
      const posePrompt = poses[i];

      // Build prompt: simple, direct format that worked in testing
      // Format: [description], [pose], white background
      const fullPrompt = `${descriptionToUse}, ${posePrompt}, white background`;

      // Determine aspect ratio based on framing type
      // Close-ups need square, medium shots need 3:4, full body needs 9:16
      const isCloseUp =
        posePrompt.includes('close-up') || posePrompt.includes('head and shoulders');
      const isMediumShot =
        posePrompt.includes('medium shot') || posePrompt.includes('cropped at waist');
      const aspectRatio = isCloseUp ? '1:1' : isMediumShot ? '3:4' : '9:16';

      console.log(
        `[DatasetGenerator] Generating ${i + 1}/${totalPoses}: "${posePrompt}" (${aspectRatio})`
      );

      try {
        // Use Flux 2 Max edit endpoint
        const result: any = await fal.subscribe('fal-ai/flux-2-max/edit', {
          input: {
            prompt: fullPrompt,
            image_urls: [sourceUrl], // Reference image for character consistency
            aspect_ratio: aspectRatio,
            num_images: 1,
            output_format: 'png',
            safety_tolerance: 5,
          },
          logs: true,
        });

        if (result.images && result.images.length > 0) {
          const imageUrl = result.images[0].url;
          const poseName = posePrompt.split(',')[0].replace(/\s+/g, '_');
          const filename = `gen_${String(generatedCount).padStart(2, '0')}_${poseName}.png`;
          const filePath = path.join(outputDir, filename);

          // Save caption for LoRA training
          // Format: trigger_word, clean character description (no pose info)
          const captionPath = path.join(outputDir, filename.replace('.png', '.txt'));
          const caption = `${triggerWord}, ${descriptionToUse}`;
          fs.writeFileSync(captionPath, caption);

          await this.downloadImage(imageUrl, filePath);
          generatedCount++;
          console.log(`   ✅ Saved: ${filename}`);
        } else {
          console.error(`   ❌ Failed: No output images`);
        }
      } catch (err: any) {
        console.error(`   ❌ Error for pose "${posePrompt}": ${err.message}`);
      }

      // Small delay between requests to avoid rate limiting
      if (i < totalPoses - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(
      `[DatasetGenerator] ✅ Complete. Generated ${generatedCount}/${totalPoses} images.`
    );
    return { count: generatedCount, outputDir };
  }

  private async downloadImage(url: string, outputPath: string): Promise<void> {
    const writer = fs.createWriteStream(outputPath);
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }
}

export const datasetGenerator = new DatasetGeneratorService();
