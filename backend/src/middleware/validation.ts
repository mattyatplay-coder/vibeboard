import { z, ZodError, ZodIssue } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Helper to format Zod errors for API response
 */
function formatZodErrors(issues: ZodIssue[]) {
  return issues.map((issue: ZodIssue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * Zod Validation Middleware Factory
 * Creates Express middleware that validates request body against a Zod schema
 */
export function validateBody<T extends z.ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.body);
      req.body = parsed; // Replace with validated/transformed data
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodErrors(error.issues);
        console.error('[Validation Error]', JSON.stringify(formattedErrors, null, 2));
        console.error('[Validation Error] Request body:', JSON.stringify(req.body, null, 2));
        return res.status(400).json({
          error: 'Validation failed',
          details: formattedErrors,
        });
      }
      next(error);
    }
  };
}

/**
 * Validates query parameters
 */
export function validateQuery<T extends z.ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.query);
      req.query = parsed as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: formatZodErrors(error.issues),
        });
      }
      next(error);
    }
  };
}

/**
 * Validates route parameters
 */
export function validateParams<T extends z.ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.params);
      req.params = parsed as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Invalid route parameters',
          details: formatZodErrors(error.issues),
        });
      }
      next(error);
    }
  };
}

// =============================================================================
// Common Schema Components (Reusable)
// =============================================================================

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// =============================================================================
// Generation Schemas
// =============================================================================

export const createGenerationSchema = z
  .object({
    // P0 Security: Hard caps on expensive text fields to prevent abuse
    inputPrompt: z
      .string()
      .min(1, 'Prompt is required')
      .max(2000, 'Prompt too long (max 2000 chars)'),
    negativePrompt: z.string().max(2000, 'Negative prompt too long (max 2000 chars)').optional(),

    // Model selection
    falModel: z.string().max(200).optional(),
    engine: z.string().max(100).optional(),
    mode: z.enum(['text_to_image', 'image_to_image', 'text_to_video', 'image_to_video']).optional(),

    // Generation parameters - P0 Security: Hard caps on expensive parameters
    aspectRatio: z
      .string()
      .regex(/^[\d.]+:[\d.]+$/, 'Aspect ratio must be in format "W:H" (e.g., 16:9, 2.35:1)')
      .optional()
      .nullable(),
    variations: z
      .number()
      .int()
      .min(1)
      .max(8, 'Maximum 8 variations allowed')
      .optional()
      .nullable(),
    duration: z.number().min(1).max(60, 'Maximum 60 seconds allowed').optional().nullable(),

    // Advanced parameters - P0 Security: Caps on compute-intensive params
    seed: z.number().int().optional().nullable(),
    guidanceScale: z.number().min(1).max(30).optional().nullable(),
    inferenceSteps: z
      .number()
      .int()
      .min(1)
      .max(50, 'Maximum 50 inference steps allowed')
      .optional()
      .nullable(),

    // Style parameters
    shotType: z.string().max(100).optional().nullable(),
    cameraAngle: z.string().max(100).optional().nullable(),
    lighting: z.string().max(100).optional().nullable(),
    location: z.string().max(200).optional().nullable(),

    // References - P0 Security: Limit array sizes
    usedLoras: z.array(z.any()).max(5, 'Maximum 5 LoRAs allowed').optional(),
    sourceElementIds: z.array(z.string()).max(7, 'Maximum 7 element references allowed').optional(),
    imageUrls: z.array(z.string().url()).max(7, 'Maximum 7 image URLs allowed').optional(),
    elementReferences: z
      .array(z.string().url())
      .max(7, 'Maximum 7 element references allowed')
      .optional(),
    tags: z.union([z.string(), z.array(z.string()).max(20, 'Maximum 20 tags allowed')]).optional(),

    // Audio for avatar models
    audioUrl: z.string().url().optional().nullable().or(z.literal('')),
  })
  .passthrough(); // Allow additional fields for flexibility

export const updateGenerationSchema = z
  .object({
    status: z.enum(['queued', 'running', 'processing', 'succeeded', 'failed']).optional(),
    outputs: z.array(z.any()).optional(),
    error: z.string().optional(),
    rating: z.number().int().min(1).max(5).optional(),
    isFavorite: z.boolean().optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .passthrough();

export const analyzeGenerationSchema = z.object({
  userFeedback: z.string().max(2000).optional(),
});

export const refineGenerationSchema = z.object({
  refinementType: z.enum(['fix_artifacts', 'enhance_quality', 'adjust_style', 'custom']).optional(),
  customInstructions: z.string().max(2000).optional(),
});

// =============================================================================
// Project Schemas
// =============================================================================

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200, 'Project name too long'),
  description: z.string().max(5000).optional(),
});

export const updateProjectSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
  })
  .passthrough();

// =============================================================================
// Element Schemas
// =============================================================================

export const createElementSchema = z
  .object({
    name: z.string().min(1).max(200),
    type: z.enum(['character', 'prop', 'location', 'style', 'other']).optional(),
    description: z.string().max(5000).optional(),
    fileUrl: z.string().url().optional(),
    thumbnail: z.string().url().optional(),
    tags: z.array(z.string()).optional(),
  })
  .passthrough();

// =============================================================================
// LoRA Schemas
// =============================================================================

export const createLoRASchema = z
  .object({
    name: z.string().min(1).max(200),
    triggerWord: z.string().max(100).optional(),
    baseModel: z.string().max(100).optional(),
    fileUrl: z.string().optional(),
    civitaiId: z.string().optional(),
    strength: z.number().min(0).max(2).optional(),
  })
  .passthrough();

// =============================================================================
// LLM/Prompt Schemas
// =============================================================================

export const llmChatSchema = z.object({
  // P0 Security: Hard caps on LLM prompts to prevent token abuse
  prompt: z.string().min(1).max(10000, 'Prompt too long (max 10000 chars)'),
  systemPrompt: z.string().max(5000, 'System prompt too long (max 5000 chars)').optional(),
  model: z.string().max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(8000, 'Maximum 8000 tokens allowed').optional(),
});

export const enhancePromptSchema = z.object({
  // P0 Security: Hard caps on prompt enhancement
  prompt: z.string().min(1).max(2000, 'Prompt too long (max 2000 chars)'),
  style: z.string().max(500).optional(),
  mood: z.string().max(500).optional(),
  loras: z.array(z.any()).max(5, 'Maximum 5 LoRAs allowed').optional(),
  characterReferences: z.array(z.any()).max(7, 'Maximum 7 character references').optional(),
});

// =============================================================================
// Training Schemas
// =============================================================================

export const createTrainingJobSchema = z
  .object({
    name: z.string().min(1).max(200),
    triggerWord: z.string().min(1).max(50),
    baseModel: z.string().max(100).optional(),
    // P0 Security: Training is expensive - cap steps to prevent abuse
    trainingSteps: z
      .number()
      .int()
      .min(100)
      .max(3000, 'Maximum 3000 training steps allowed')
      .optional(),
    learningRate: z.number().min(0.00001).max(0.01).optional(),
    // Dataset limits
    datasetSize: z.number().int().min(1).max(50, 'Maximum 50 images in dataset').optional(),
  })
  .passthrough();

// =============================================================================
// Scene Chain Schemas
// =============================================================================

export const createSceneChainSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export const createSegmentSchema = z
  .object({
    prompt: z.string().max(5000).optional(),
    duration: z.number().min(1).max(30).optional(),
    firstFrameUrl: z.string().url().optional(),
    lastFrameUrl: z.string().url().optional(),
  })
  .passthrough();

// =============================================================================
// Search Schemas
// =============================================================================

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  mode: z.enum(['reality', 'intent', 'both']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// =============================================================================
// Export Schemas
// =============================================================================

export const bakeExportSchema = z.object({
  sceneChainId: z.string().uuid(),
  format: z.enum(['mp4', 'prores', 'webm']).optional(),
  frameRate: z.number().int().min(24).max(60).optional(),
  includeEdl: z.boolean().optional(),
});

export const epkExportSchema = z.object({
  sceneChainId: z.string().uuid(),
  projectName: z.string().min(1).max(200),
  includeSettings: z.boolean().optional(),
});
