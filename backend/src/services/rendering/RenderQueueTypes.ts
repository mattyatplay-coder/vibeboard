/**
 * Multi-Pass Render Queue Types
 *
 * Defines the quality tiers and render pass configurations for the
 * draft-to-master workflow that saves money during iteration.
 *
 * Philosophy:
 * - Draft pass: Fast, cheap models for blocking and timing
 * - Review pass: Mid-quality for client review
 * - Master pass: Final quality for delivery
 */

export type RenderQuality = 'draft' | 'review' | 'master';
export type RenderPassStatus =
  | 'pending'
  | 'queued'
  | 'generating'
  | 'complete'
  | 'failed'
  | 'skipped';

/**
 * Model presets for each quality tier
 * Maps quality levels to recommended models
 */
export interface QualityPreset {
  id: string;
  name: string;
  quality: RenderQuality;
  description: string;

  // Model recommendations
  imageModel: string;
  videoModel: string;

  // Estimated costs (USD per generation)
  imageCost: number;
  videoCost: number;

  // Generation parameters
  inferenceSteps?: number;
  guidanceScale?: number;

  // Expected generation time (seconds)
  estimatedTimeImage: number;
  estimatedTimeVideo: number;
}

export const QUALITY_PRESETS: Record<RenderQuality, QualityPreset> = {
  draft: {
    id: 'draft',
    name: 'Draft',
    quality: 'draft',
    description: 'Fast & cheap for blocking. Low resolution, quick iteration.',
    imageModel: 'fal-ai/flux/schnell',
    videoModel: 'fal-ai/ltx-video',
    imageCost: 0.002,
    videoCost: 0.03,
    inferenceSteps: 4,
    estimatedTimeImage: 3,
    estimatedTimeVideo: 15,
  },
  review: {
    id: 'review',
    name: 'Review',
    quality: 'review',
    description: 'Client-ready preview quality. Good detail, moderate cost.',
    imageModel: 'fal-ai/flux/dev',
    videoModel: 'fal-ai/wan-t2v',
    imageCost: 0.01,
    videoCost: 0.08,
    inferenceSteps: 28,
    estimatedTimeImage: 8,
    estimatedTimeVideo: 45,
  },
  master: {
    id: 'master',
    name: 'Master',
    quality: 'master',
    description: 'Final delivery quality. Maximum fidelity, highest cost.',
    imageModel: 'fal-ai/flux-pro',
    videoModel: 'fal-ai/kling-video/v2.1/master/text-to-video',
    imageCost: 0.05,
    videoCost: 0.25,
    inferenceSteps: 50,
    guidanceScale: 7.5,
    estimatedTimeImage: 15,
    estimatedTimeVideo: 120,
  },
};

/**
 * REFINEMENT C: Watermark Configuration
 * Professional dailies-style metadata burn-in for Draft/Review passes
 */
export interface WatermarkConfig {
  enabled: boolean;
  showSeed: boolean;
  showShotNumber: boolean;
  showQuality: boolean;
  showTimecode: boolean;
  position: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-left' | 'top-right';
  opacity: number; // 0.0 - 1.0
  fontSize: 'small' | 'medium' | 'large';
}

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  enabled: false,
  showSeed: true,
  showShotNumber: true,
  showQuality: true,
  showTimecode: false,
  position: 'bottom-left',
  opacity: 0.7,
  fontSize: 'small',
};

/**
 * Build watermark text from pass metadata
 */
export function buildWatermarkText(
  pass: { quality: RenderQuality; orderIndex: number; lockedSeed?: number; resultSeed?: number },
  config: WatermarkConfig
): string {
  const parts: string[] = [];

  if (config.showQuality) {
    parts.push(pass.quality.toUpperCase());
  }

  if (config.showShotNumber) {
    parts.push(`SHOT: ${String(pass.orderIndex + 1).padStart(2, '0')}`);
  }

  if (config.showSeed) {
    const seed = pass.resultSeed || pass.lockedSeed;
    if (seed) {
      parts.push(`SEED: ${seed}`);
    }
  }

  if (config.showTimecode) {
    const now = new Date();
    parts.push(now.toISOString().slice(11, 19)); // HH:MM:SS
  }

  return parts.join(' | ');
}

/**
 * Shot Recipe - Complete reproducible generation settings
 * This is the "locked" creative recipe that must stay consistent across passes
 */
export interface ShotRecipe {
  // Core prompt
  prompt: string;
  negativePrompt?: string;

  // Visual Settings (must be inherited exactly)
  lensKit?: {
    lensId: string | null; // e.g., 'storyteller-35'
    isAnamorphic: boolean;
    effects: string[]; // e.g., ['lens-flare', 'vignette']
  };

  lightingSetup?: {
    presetId?: string;
    lights: Array<{
      type: string;
      x: number;
      y: number;
      intensity: number;
      colorTemp: number;
      softness: number;
    }>;
    promptModifier: string; // The generated lighting prompt
  };

  cinematicTags?: {
    camera?: string;
    lens?: string;
    filmStock?: string;
    colorGrade?: string;
    lighting?: string;
    motion?: string;
    mood?: string;
  };

  // LoRAs with exact strengths
  loras?: Array<{
    id: string;
    path: string;
    strength: number;
    triggerWord?: string;
  }>;

  // Character References
  elementReferences?: string[]; // Element IDs for IP-Adapter
  elementStrength?: number; // 0-1

  // Frame References
  firstFrameUrl?: string;
  lastFrameUrl?: string;

  // Technical Settings
  aspectRatio: string;
  duration: number; // seconds
  seed?: number; // CRITICAL: Lock this for consistency
  guidanceScale?: number;
  inferenceSteps?: number;
  sampler?: string;
  scheduler?: string;
}

/**
 * A single render pass for a shot
 */
export interface RenderPass {
  id: string;
  shotId: string; // SceneChainSegment ID
  sceneChainId: string;
  quality: RenderQuality;
  orderIndex: number; // Order within the shot's passes

  // === PARENT-CHILD MAPPING ===
  parentPassId?: string; // The draft pass this was upgraded from
  childPassIds: string[]; // Higher-quality passes derived from this

  // === LOCKED RECIPE (inherited from parent or original) ===
  recipe: ShotRecipe;

  // === SEED LOCK ===
  // When upgrading draft→master, lock the seed from draft output
  lockedSeed?: number; // Seed to use for deterministic upgrade
  seedSource?: 'random' | 'inherited' | 'user';

  // Model override (uses preset if not specified)
  modelOverride?: string;

  // Output
  status: RenderPassStatus;
  outputUrl?: string;
  thumbnailUrl?: string;
  generationId?: string; // Link to Generation record

  // Metadata from generation result
  resultSeed?: number; // Actual seed used (for inheritance)
  resultMetadata?: {
    model: string;
    provider: string;
    inferenceTime: number;
    resolution?: string;
  };

  // Cost tracking
  actualCost?: number;
  inferenceTime?: number; // milliseconds

  // Errors
  failureReason?: string;
  retryCount: number;

  // Timestamps
  queuedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Version stack for a shot - shows all quality passes
 */
export interface ShotVersionStack {
  shotId: string;
  shotName: string;

  versions: Array<{
    passId: string;
    quality: RenderQuality;
    status: RenderPassStatus;
    outputUrl?: string;
    thumbnailUrl?: string;
    seed?: number;
    model: string;
    cost?: number;
    createdAt: Date;
  }>;

  // Currently displayed version
  activeVersion: RenderQuality;

  // The locked recipe shared by all versions
  recipe: ShotRecipe;

  // Upgrade available?
  canUpgrade: boolean;
  nextUpgradeQuality?: RenderQuality;
  upgradeCost?: number;
}

/**
 * Render job - groups all passes for a scene chain
 */
export interface RenderJob {
  id: string;
  sceneChainId: string;
  projectId: string;
  name: string;

  // Configuration
  targetQualities: RenderQuality[]; // Which passes to render
  activeQuality: RenderQuality; // Current pass being rendered

  // REFINEMENT C: Watermark configuration for dailies-style burn-in
  watermarkConfig: WatermarkConfig;

  // Progress
  totalPasses: number;
  completedPasses: number;
  failedPasses: number;

  // Cost tracking
  estimatedCost: number;
  actualCost: number;

  // Status
  status: 'pending' | 'rendering' | 'paused' | 'complete' | 'failed';

  // Output
  passes: RenderPass[];

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cost estimate for a render job
 */
export interface RenderCostEstimate {
  quality: RenderQuality;
  shotCount: number;
  isVideo: boolean;

  perShotCost: number;
  totalCost: number;
  estimatedTime: number; // seconds

  modelUsed: string;
}

/**
 * Summary of all passes for a shot
 */
export interface ShotRenderSummary {
  shotId: string;
  shotName: string;

  passes: {
    quality: RenderQuality;
    status: RenderPassStatus;
    outputUrl?: string;
    cost?: number;
  }[];

  // Best available output (highest quality complete)
  bestOutputUrl?: string;
  bestOutputQuality?: RenderQuality;

  totalCost: number;
}

/**
 * Compare pass outputs for A/B review
 */
export interface PassComparison {
  shotId: string;
  shotName: string;
  passA: {
    passId: string;
    quality: RenderQuality;
    outputUrl: string;
    thumbnailUrl?: string;
    cost: number;
    seed?: number;
    model: string;
  };
  passB: {
    passId: string;
    quality: RenderQuality;
    outputUrl: string;
    thumbnailUrl?: string;
    cost: number;
    seed?: number;
    model: string;
  };
  costDifference: number;
  qualityUpgrade: string; // e.g., "draft → master"
}

/**
 * Queue priority for render passes
 */
export const RENDER_PRIORITY: Record<RenderQuality, number> = {
  draft: 1, // Highest priority - fast feedback
  review: 2,
  master: 3, // Lowest priority - can wait
};

/**
 * Get the recommended model for a quality + type combination
 */
export function getModelForQuality(quality: RenderQuality, isVideo: boolean): string {
  const preset = QUALITY_PRESETS[quality];
  return isVideo ? preset.videoModel : preset.imageModel;
}

/**
 * Calculate cost estimate for a render job
 */
export function estimateCost(
  quality: RenderQuality,
  shotCount: number,
  isVideo: boolean
): RenderCostEstimate {
  const preset = QUALITY_PRESETS[quality];
  const perShotCost = isVideo ? preset.videoCost : preset.imageCost;
  const estimatedTime = isVideo ? preset.estimatedTimeVideo : preset.estimatedTimeImage;

  return {
    quality,
    shotCount,
    isVideo,
    perShotCost,
    totalCost: perShotCost * shotCount,
    estimatedTime: estimatedTime * shotCount,
    modelUsed: isVideo ? preset.videoModel : preset.imageModel,
  };
}

/**
 * Calculate savings from using draft instead of master
 */
export function calculateSavings(
  shotCount: number,
  isVideo: boolean,
  draftIterations: number = 3
): { draftCost: number; masterCost: number; savings: number; savingsPercent: number } {
  const draftEst = estimateCost('draft', shotCount * draftIterations, isVideo);
  const masterEst = estimateCost('master', shotCount, isVideo);

  // What it would cost to iterate at master quality
  const iterateAtMasterCost = masterEst.totalCost * draftIterations;

  // What it costs with draft iteration + final master
  const actualCost = draftEst.totalCost + masterEst.totalCost;

  const savings = iterateAtMasterCost - actualCost;
  const savingsPercent = (savings / iterateAtMasterCost) * 100;

  return {
    draftCost: draftEst.totalCost,
    masterCost: masterEst.totalCost,
    savings,
    savingsPercent,
  };
}
