/**
 * VibeBoard Shared API Types
 * ==========================
 *
 * This file defines the API contract between frontend and backend.
 * Both sides should import from this file to ensure type safety.
 *
 * RULES:
 * 1. Only add optional fields (fieldName?: type) - never remove or make required
 * 2. When changing an API, add new fields first, then update consumers
 * 3. Document breaking changes in the version history at the bottom
 */

// =============================================================================
// COMMON TYPES
// =============================================================================

export type ModelCapability =
  | 'text-to-image'
  | 'image-editing'
  | 'text-to-video'
  | 'image-to-video'
  | 'video-editing'
  | 'avatar';

export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type ElementType = 'character' | 'prop' | 'location' | 'style' | 'other';

// =============================================================================
// API REQUEST TYPES
// =============================================================================

/**
 * Request to create a new generation
 * POST /api/projects/:projectId/generations
 */
export interface CreateGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  model: string;
  provider?: string;

  // Dimensions
  width?: number;
  height?: number;
  aspectRatio?: string;

  // Video-specific
  duration?: string; // e.g., "5s", "10s"
  fps?: number;

  // Generation parameters
  seed?: number;
  cfgScale?: number;
  steps?: number;
  sampler?: string;
  scheduler?: string;

  // References
  imageUrl?: string; // For I2V
  elementIds?: string[]; // Element references
  loraIds?: string[]; // LoRA references

  // Advanced
  controlNet?: ControlNetConfig;
  ipAdapter?: IPAdapterConfig;
  workflow?: string; // ComfyUI workflow JSON
}

export interface ControlNetConfig {
  type: 'depth' | 'canny' | 'pose' | 'normal';
  strength?: number;
  imageUrl?: string;
}

export interface IPAdapterConfig {
  imageUrl: string;
  strength?: number;
  type?: 'face' | 'style' | 'composition';
}

/**
 * Request to create a new element
 * POST /api/projects/:projectId/elements
 */
export interface CreateElementRequest {
  name: string;
  type: ElementType;
  description?: string;
  tags?: string[];
  sessionId?: string;
}

/**
 * Request to update an element
 * PUT /api/projects/:projectId/elements/:elementId
 */
export interface UpdateElementRequest {
  name?: string;
  type?: ElementType;
  description?: string;
  tags?: string[];
}

/**
 * Request to create a training job
 * POST /api/training/jobs
 */
export interface CreateTrainingJobRequest {
  name: string;
  triggerWord: string;
  baseModel?: string;
  provider?: 'fal' | 'replicate';
  steps?: number;
  learningRate?: number;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Generation object
 * GET /api/projects/:projectId/generations/:generationId
 */
export interface Generation {
  id: string;
  projectId: string;
  sessionId?: string;

  // Input
  prompt: string;
  negativePrompt?: string;
  model: string;
  provider: string;

  // Output
  status: GenerationStatus;
  outputUrl?: string;
  thumbnailUrl?: string;
  error?: string;

  // Metadata
  width?: number;
  height?: number;
  duration?: string;
  seed?: number;

  // Timestamps
  createdAt: string;
  startedAt?: string;
  completedAt?: string;

  // Cost tracking
  cost?: number;
  processingTime?: number;
}

/**
 * Element object
 * GET /api/projects/:projectId/elements/:elementId
 */
export interface Element {
  id: string;
  projectId: string;
  sessionId?: string;

  name: string;
  type: ElementType;
  description?: string;
  tags: string[];

  // Media
  url: string;
  thumbnailUrl?: string;
  fileType: 'image' | 'video';

  // Views (for character turnarounds)
  views?: ElementView[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface ElementView {
  id: string;
  angle: string; // e.g., "front", "side", "back"
  imageUrl: string;
}

/**
 * Project object
 * GET /api/projects/:projectId
 */
export interface Project {
  id: string;
  name: string;
  description?: string;

  // Counts
  elementCount?: number;
  generationCount?: number;
  sceneCount?: number;

  // Settings
  defaultModel?: string;
  defaultAspectRatio?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Session object
 */
export interface Session {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  createdAt: string;
}

/**
 * Scene object
 */
export interface Scene {
  id: string;
  projectId: string;
  name: string;
  order: number;
  shots: Shot[];
  createdAt: string;
}

export interface Shot {
  id: string;
  sceneId: string;
  generationId?: string;
  order: number;
  prompt?: string;
  notes?: string;
}

/**
 * LoRA object
 */
export interface LoRA {
  id: string;
  projectId?: string; // null for global LoRAs
  name: string;
  triggerWord: string;
  type: 'character' | 'style' | 'concept';
  weight: number;

  // Source
  source: 'civitai' | 'custom' | 'trained';
  sourceId?: string; // Civitai model ID
  sourceUrl?: string;

  // Training
  trainingJobId?: string;
  baseModel?: string;

  createdAt: string;
}

/**
 * Training job object
 */
export interface TrainingJob {
  id: string;
  name: string;
  status: 'pending' | 'preparing' | 'training' | 'completed' | 'failed';

  triggerWord: string;
  baseModel: string;
  provider: 'fal' | 'replicate';

  // Progress
  progress?: number;
  currentStep?: number;
  totalSteps?: number;

  // Result
  loraUrl?: string;
  loraId?: string;
  error?: string;

  // Timestamps
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// =============================================================================
// MODEL REGISTRY TYPES
// =============================================================================

/**
 * Model information for the model selector
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  capability: ModelCapability;
  desc?: string;
  cost?: string;
  type: 'image' | 'video';
  tier?: 'fast' | 'quality' | 'pro';
  supportedDurations?: string[]; // e.g., ['5s', '10s']
  supportedAspectRatios?: string[]; // e.g., ['16:9', '9:16', '1:1']
  maxResolution?: number;
  supportsLoRA?: boolean;
}

// =============================================================================
// VERSION HISTORY
// =============================================================================
/**
 * Version History:
 *
 * v1.0.0 (2024-12-18)
 * - Initial shared types definition
 * - Core request/response types
 * - Model registry types with supportedDurations
 */
