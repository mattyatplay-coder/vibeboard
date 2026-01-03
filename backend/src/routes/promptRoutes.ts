/**
 * Prompt Enhancement API Routes
 *
 * Endpoints for intelligent prompt generation and LoRA management
 *
 * P0 SECURITY: LLM-powered routes require authentication
 * - /enhance, /quick-enhance, /parse-script use LLM ($)
 * - Read-only routes (model guides, LoRA lists) are auth-optional
 */

import { Router, Request, Response } from 'express';
import {
  promptEnhancer,
  PromptEnhancementRequest,
  ElementReference,
  LoRAReference,
} from '../services/prompts/PromptEnhancer';
import { loraRegistry } from '../services/prompts/LoRARegistry';
import { getModelGuide, MODEL_PROMPTING_GUIDES } from '../services/prompts/ModelPromptGuides';
import { LLMService } from '../services/LLMService';
import { withAuth, withDevAuth, requireGenerationQuota } from '../middleware/auth';

const router = Router();

// Use dev auth in development, real auth in production
const authMiddleware = process.env.NODE_ENV === 'production' ? withAuth : withDevAuth;
const quotaMiddleware =
  process.env.NODE_ENV === 'production'
    ? requireGenerationQuota
    : (_req: any, _res: any, next: any) => next();

/**
 * POST /api/prompts/enhance
 *
 * Enhance a user prompt for a specific model with LoRA and element integration
 * EXPENSIVE: Uses LLM for prompt enhancement ($)
 */
router.post('/enhance', authMiddleware, quotaMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      customNegativePrompt,
      modelId,
      generationType = 'image',
      videoModelId, // For frame prompts: the video model that will consume this frame
      elements = [],
      primaryCharacterId,
      loraIds = [],
      loras: requestLoras = [], // Accept full LoRA objects from frontend
      style,
      mood,
      cameraMovement,
      cameraAngle,
      enhancementLevel = 'balanced',
      preserveOriginalIntent = true,
      addQualityBoosters = true,
      addNegativePrompt = true,
      consistencyPriority = 0.7,
      image, // Single legacy image
      images = [], // Array of images (preferred)
      props = [], // Prop Bin items for object consistency
      lightingPrompt, // Virtual Gaffer lighting setup
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!modelId) {
      return res.status(400).json({ error: 'Model ID is required' });
    }

    // Build LoRA references - prefer full objects from request, fallback to registry
    const loras: LoRAReference[] = [];

    // First, use LoRAs passed directly from frontend (has triggerWord from DB)
    if (requestLoras && requestLoras.length > 0) {
      for (const reqLora of requestLoras) {
        // Handle both 'triggerWord' (DB format) and 'triggerWords' (array format)
        const triggerWords =
          reqLora.triggerWords || (reqLora.triggerWord ? [reqLora.triggerWord] : []);

        loras.push({
          id: reqLora.id,
          name: reqLora.name,
          triggerWords,
          strength: reqLora.strength || 1.0,
          type: (reqLora.type || reqLora.category || 'concept') as any,
          activationText: triggerWords[0] || undefined,
          noTrigger: reqLora.noTrigger || reqLora.name?.toLowerCase().includes('notrigger'),
        });
      }
    }

    // Fallback: resolve from KnowledgeBase (DB) if no direct LoRAs provided
    if (loras.length === 0 && loraIds.length > 0) {
      const { KnowledgeBaseService } = require('../services/knowledge/KnowledgeBaseService');
      const kb = KnowledgeBaseService.getInstance();

      for (const loraId of loraIds) {
        // Try KnowledgeBase first (DB)
        const kbLora = await kb.getLoRAById(loraId);

        if (kbLora) {
          loras.push({
            id: kbLora.id,
            name: kbLora.name,
            triggerWords: kbLora.triggerWords,
            strength: 0.8, // Default strength
            type: 'concept' as any, // Default type from KB
            activationText: kbLora.triggerWords[0],
          });
        } else {
          // Fallback to static registry if KB fails
          const lora = loraRegistry.get(loraId);
          if (lora) {
            loras.push({
              id: lora.id,
              name: lora.name,
              triggerWords: lora.triggerWords,
              strength: lora.recommendedStrength,
              type: lora.type as any,
              activationText: lora.activationText,
            });
          }
        }
      }
    }

    console.log(
      '[Enhance] Received LoRAs:',
      JSON.stringify(
        loras.map(l => ({
          name: l.name,
          triggerWords: l.triggerWords,
          type: l.type,
          noTrigger: l.noTrigger,
        })),
        null,
        2
      )
    );

    // Find primary character from elements
    const primaryCharacter = primaryCharacterId
      ? elements.find((e: ElementReference) => e.id === primaryCharacterId)
      : elements.find((e: ElementReference) => e.type === 'character');

    // Normalize images to array
    const resolvedImages = images && images.length > 0 ? images : image ? [image] : [];
    console.log(
      `[PromptEnhance] Received ${resolvedImages.length} images:`,
      resolvedImages
        .slice(0, 3)
        .map((url: string) => url?.substring(0, 100) + (url?.length > 100 ? '...' : ''))
    );

    // Log props and lighting
    if (props && props.length > 0) {
      console.log(
        `[PromptEnhance] Received ${props.length} props:`,
        props.map((p: any) => p.name)
      );
    }
    if (lightingPrompt) {
      console.log(`[PromptEnhance] Received lighting prompt:`, lightingPrompt.substring(0, 100));
    }

    // Build enhancement request
    const request: PromptEnhancementRequest = {
      originalPrompt: prompt,
      modelId,
      generationType,
      videoModelId, // For frame prompts: the video model that will consume this frame
      elements,
      primaryCharacter,
      loras,
      style,
      mood,
      cameraMovement,
      cameraAngle,
      enhancementLevel,
      preserveOriginalIntent,
      addQualityBoosters,
      addNegativePrompt,
      consistencyPriority,
      customNegativePrompt, // Pass the custom negative prompt
      images: resolvedImages,
      props, // Prop Bin items for object consistency
      lightingPrompt, // Virtual Gaffer lighting setup
    };

    // Enhance the prompt
    const result = await promptEnhancer.enhance(request);

    res.json({
      success: true,
      prompt: result.prompt,
      negativePrompt: result.negativePrompt,
      triggerDetections: result.triggerDetections, // Include for UI transparency
      components: result.components,
      recommendations: result.recommendations,
      analysis: result.analysis,
    });
  } catch (error: any) {
    console.error('Prompt enhancement failed:', error);
    res.status(500).json({
      error: 'Enhancement failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/prompts/quick-enhance
 *
 * Quick enhancement with minimal options
 * EXPENSIVE: Uses LLM for prompt enhancement ($)
 */
router.post(
  '/quick-enhance',
  authMiddleware,
  quotaMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { prompt, modelId, loraIds = [] } = req.body;

      if (!prompt || !modelId) {
        return res.status(400).json({ error: 'Prompt and modelId are required' });
      }

      // Resolve LoRAs
      const loras: LoRAReference[] = loraIds
        .map((id: string) => {
          const lora = loraRegistry.get(id);
          if (lora) {
            return {
              id: lora.id,
              name: lora.name,
              triggerWords: lora.triggerWords,
              strength: lora.recommendedStrength,
              type: lora.type as any,
            };
          }
          return null;
        })
        .filter(Boolean);

      const enhanced = await promptEnhancer.quickEnhance(prompt, modelId, loras);

      res.json({
        success: true,
        original: prompt,
        enhanced,
      });
    } catch (error: any) {
      console.error('Quick enhancement failed:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/prompts/models
 *
 * Get all available model guides
 */
router.get('/models', (req: Request, res: Response) => {
  const type = req.query.type as 'image' | 'video' | undefined;

  let guides = Object.values(MODEL_PROMPTING_GUIDES);

  if (type) {
    guides = guides.filter(g => g.type === type || g.type === 'both');
  }

  res.json({
    models: guides.map(g => ({
      id: g.id,
      name: g.name,
      provider: g.provider,
      type: g.type,
      syntaxStyle: g.syntax.style,
      maxLength: g.syntax.maxLength,
      supportsWeights: !!g.syntax.weightSyntax,
      supportsNegative: !!g.syntax.negativePrefix,
      qualityBoosters: g.qualityBoosters.slice(0, 5),
      template: g.template,
    })),
  });
});

/**
 * GET /api/prompts/models/:id
 *
 * Get specific model guide details
 */
router.get('/models/:id', (req: Request, res: Response) => {
  const guide = getModelGuide(req.params.id);

  if (!guide) {
    return res.status(404).json({ error: 'Model guide not found' });
  }

  res.json(guide);
});

/**
 * GET /api/prompts/loras
 *
 * List registered LoRAs - now searches database first (project + global), then falls back to registry
 */
router.get('/loras', async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const search = req.query.search as string | undefined;
  const projectId = req.query.projectId as string | undefined;
  const baseModel = req.query.baseModel as string | undefined;

  try {
    // First, search the database (project + global LoRAs)
    const { KnowledgeBaseService } = require('../services/knowledge/KnowledgeBaseService');
    const kb = KnowledgeBaseService.getInstance();

    const dbLoras = await kb.searchLoRAs({
      query: search,
      projectId,
      baseModel,
      category: type,
      limit: 50,
    });

    // Convert to response format
    const dbResults = dbLoras.map((l: any) => ({
      id: l.id,
      name: l.name,
      type: l.category || 'concept',
      baseModel: l.baseModel,
      triggerWords: l.triggerWords,
      activationText: l.triggerWords[0],
      recommendedStrength: l.strength || 0.8,
      thumbnailUrl: l.imageUrl,
      useCount: 0,
      source: l.source, // 'project' or 'global'
    }));

    // If database has results, return them
    if (dbResults.length > 0) {
      return res.json({ loras: dbResults, source: 'database' });
    }

    // Fallback to static registry if no database results
    let loras;
    if (search) {
      loras = loraRegistry.search(search, type as any);
    } else {
      loras = loraRegistry.getAll(type as any);
    }

    res.json({
      loras: loras.map(l => ({
        id: l.id,
        name: l.name,
        version: l.version,
        type: l.type,
        baseModel: l.baseModel,
        triggerWords: l.triggerWords,
        activationText: l.activationText,
        recommendedStrength: l.recommendedStrength,
        thumbnailUrl: l.thumbnailUrl,
        useCount: l.useCount,
        source: 'registry',
      })),
      source: 'registry',
    });
  } catch (error) {
    console.error('LoRA search failed:', error);
    // Fallback to registry on error
    let loras;
    if (search) {
      loras = loraRegistry.search(search, type as any);
    } else {
      loras = loraRegistry.getAll(type as any);
    }

    res.json({
      loras: loras.map(l => ({
        id: l.id,
        name: l.name,
        version: l.version,
        type: l.type,
        baseModel: l.baseModel,
        triggerWords: l.triggerWords,
        activationText: l.activationText,
        recommendedStrength: l.recommendedStrength,
        thumbnailUrl: l.thumbnailUrl,
        useCount: l.useCount,
        source: 'registry',
      })),
      source: 'registry',
    });
  }
});

/**
 * POST /api/prompts/loras/match-suggestions
 *
 * Match AI-suggested LoRA styles to actual installed LoRAs
 * This is called after prompt enhancement to find local LoRAs that match the AI recommendations
 */
router.post('/loras/match-suggestions', async (req: Request, res: Response) => {
  try {
    const { suggestions, projectId, baseModel, limit = 3 } = req.body;

    if (!suggestions || !Array.isArray(suggestions)) {
      return res.status(400).json({ error: 'suggestions array is required' });
    }

    const { KnowledgeBaseService } = require('../services/knowledge/KnowledgeBaseService');
    const kb = KnowledgeBaseService.getInstance();

    const results = await kb.matchLoRAsToSuggestions(suggestions, {
      projectId,
      baseModel,
      limit,
    });

    // Format results: show which suggestions have local matches
    const formattedResults = results.map((result: any) => ({
      suggestion: result.suggestion,
      hasLocalMatches: result.matches.length > 0,
      localMatches: result.matches.map((m: any) => ({
        id: m.id,
        name: m.name,
        baseModel: m.baseModel,
        triggerWords: m.triggerWords,
        thumbnailUrl: m.imageUrl,
        source: m.source,
      })),
      // Provide CivitAI search link as fallback
      civitaiSearchUrl: `https://civitai.com/search/models?query=${encodeURIComponent(result.suggestion)}&types=LORA`,
    }));

    res.json({
      matches: formattedResults,
      totalSuggestions: suggestions.length,
      suggestionsWithLocalMatches: formattedResults.filter((r: any) => r.hasLocalMatches).length,
    });
  } catch (error: any) {
    console.error('LoRA suggestion matching failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/prompts/loras/register
 *
 * Register a new LoRA with its trigger words
 */
router.post('/loras/register', (req: Request, res: Response) => {
  try {
    const {
      id,
      name,
      triggerWords,
      activationText,
      type = 'concept',
      baseModel = 'sdxl',
      recommendedStrength = 0.7,
      characterAttributes,
    } = req.body;

    if (!id || !name || !triggerWords?.length) {
      return res.status(400).json({
        error: 'id, name, and triggerWords are required',
      });
    }

    loraRegistry.register({
      id,
      name,
      version: '1.0',
      triggerWords,
      activationText: activationText || triggerWords[0],
      type,
      baseModel,
      recommendedStrength,
      strengthRange: [
        Math.max(0.3, recommendedStrength - 0.3),
        Math.min(1.2, recommendedStrength + 0.3),
      ],
      characterAttributes,
      useCount: 0,
    });

    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/prompts/loras/search-civitai
 *
 * Search Civitai for LoRAs
 */
router.get('/loras/search-civitai', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const baseModel = req.query.baseModel as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }

    const results = await loraRegistry.searchCivitai(query, {
      baseModel,
      limit,
    });

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/prompts/loras/civitai/:id
 *
 * Fetch LoRA details from Civitai
 */
router.get('/loras/civitai/:id', async (req: Request, res: Response) => {
  try {
    const lora = await loraRegistry.fetchFromCivitai(req.params.id);

    if (!lora) {
      return res.status(404).json({ error: 'LoRA not found on Civitai' });
    }

    res.json(lora);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/prompts/loras/import
 *
 * Import LoRA from file path
 */
router.post('/loras/import', (req: Request, res: Response) => {
  try {
    const { filePath, type, baseModel } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }

    const lora = loraRegistry.importFromPath(filePath, { type, baseModel });

    res.json({ success: true, lora });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/prompts/analyze
 *
 * Analyze a prompt without enhancing it
 */
router.post('/analyze', (req: Request, res: Response) => {
  try {
    const { prompt, modelId } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const guide = getModelGuide(modelId || 'flux-dev');

    // Count tokens (rough estimate)
    const tokenEstimate = Math.ceil(prompt.length / 4);

    // Check for quality terms
    const hasQualityTerms =
      guide?.qualityBoosters.some(b => prompt.toLowerCase().includes(b.toLowerCase())) || false;

    // Check for potential trigger words
    const potentialTriggers = prompt.match(/\b[a-z]+x[a-z]*\b/gi) || [];

    // Check prompt structure
    const hasWeights = /\([^)]+:\d+\.?\d*\)/.test(prompt);
    const hasNegative =
      prompt.toLowerCase().includes('negative') || prompt.includes('##') || prompt.includes('--no');

    res.json({
      analysis: {
        length: prompt.length,
        tokenEstimate,
        hasQualityTerms,
        hasWeights,
        hasNegative,
        potentialTriggers,
        modelCompatibility: {
          model: guide?.id || 'unknown',
          syntaxStyle: guide?.syntax.style || 'natural',
          withinMaxLength: guide?.syntax.maxLength ? prompt.length <= guide.syntax.maxLength : true,
          maxLength: guide?.syntax.maxLength,
        },
      },
      suggestions: generateSuggestions(prompt, guide),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function for analysis endpoint
function generateSuggestions(prompt: string, guide: any): string[] {
  const suggestions: string[] = [];

  if (!guide) return suggestions;

  // Length check
  if (guide.syntax.maxLength && prompt.length > guide.syntax.maxLength) {
    suggestions.push(
      `Prompt is ${prompt.length - guide.syntax.maxLength} characters over the recommended ${guide.syntax.maxLength} limit`
    );
  }

  // Quality terms suggestion
  if (!guide.qualityBoosters.some((b: string) => prompt.toLowerCase().includes(b.toLowerCase()))) {
    suggestions.push(
      `Consider adding quality terms like: ${guide.qualityBoosters.slice(0, 3).join(', ')}`
    );
  }

  // Weight syntax suggestion for models that support it
  if (guide.syntax.weightSyntax && !prompt.includes(':')) {
    suggestions.push(
      `This model supports emphasis weights using ${guide.syntax.weightSyntax} syntax`
    );
  }

  // Consistency suggestion
  if (guide.characterHandling.consistencyKeywords.length > 0) {
    const hasConsistency = guide.characterHandling.consistencyKeywords.some((k: string) =>
      prompt.toLowerCase().includes(k.toLowerCase())
    );
    if (!hasConsistency) {
      suggestions.push(
        `For character consistency, consider adding: ${guide.characterHandling.consistencyKeywords[0]}`
      );
    }
  }

  return suggestions;
}

// Parse Screenplay Script
// EXPENSIVE: Uses LLM for script parsing ($)
router.post('/parse-script', authMiddleware, quotaMiddleware, async (req, res) => {
  try {
    const { script } = req.body;
    if (!script) {
      return res.status(400).json({ error: 'Script text is required' });
    }

    const prompt = `
        You are an expert AI screenplay parser and video direction assistant. 
        Your task is to analyze the provided screenplay text and extract structured prompts for a 3-stage video generation pipeline.
        
        The pipeline consists of:
        1. **Visual Prompt (Reference to Video)**: Describes the subject, setting, lighting, and style for generating the initial coherent character/scene video. Focus on visual details.
        2. **Motion Prompt (One-to-All)**: Describes the camera movement, character action, and overall motion dynamics. Focus on verbs and movement.
        3. **Audio/Dialogue Prompt (Sync Lips)**: Extracts the dialogue to be spoken. If there are multiple characters, prioritize the main speaker or combine them if they are in the same shot.
        
        Input Script:
        """
        ${script}
        """
        
        Output JSON format:
        {
            "visual": "Detailed visual description...",
            "motion": "Specific motion and camera instruction...",
            "audio": "Exact dialogue text..."
        }
        
        Return ONLY valid JSON. Do not include markdown formatting or explanations.
        `;

    try {
      const llmService = new LLMService('ollama'); // Default to Ollama for now, can be configurable
      const response = await llmService.generate({
        prompt: prompt,
        systemPrompt:
          'You are a specialized JSON-preprocessor. You output purely structured JSON data extracted from screenplay text.',
        temperature: 0.2, // Lower temperature for more deterministic/structured output
      });

      // Clean up response if it contains markdown code blocks
      let cleanResponse = response.content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleanResponse);

      res.json({
        visual: parsed.visual || 'A cinematic scene based on the script.',
        motion: parsed.motion || 'Subtle cinematic movement.',
        audio: parsed.audio || '',
      });
    } catch (llmError) {
      console.error('LLM Parsing Failed:', llmError);
      // Fallback if LLM fails
      res.json({
        visual: script.slice(0, 200),
        motion: 'Cinematic motion',
        audio: '',
      });
    }
  } catch (error) {
    console.error('Error parsing script:', error);
    res.status(500).json({ error: 'Failed to parse script' });
  }
});

export default router;
