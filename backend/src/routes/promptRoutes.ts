/**
 * Prompt Enhancement API Routes
 * 
 * Endpoints for intelligent prompt generation and LoRA management
 */

import { Router, Request, Response } from 'express';
import { promptEnhancer, PromptEnhancementRequest, ElementReference, LoRAReference } from '../services/prompts/PromptEnhancer';
import { loraRegistry } from '../services/prompts/LoRARegistry';
import { getModelGuide, MODEL_PROMPTING_GUIDES } from '../services/prompts/ModelPromptGuides';

const router = Router();

/**
 * POST /api/prompts/enhance
 * 
 * Enhance a user prompt for a specific model with LoRA and element integration
 */
router.post('/enhance', async (req: Request, res: Response) => {
    try {
        const {
            prompt,
            modelId,
            generationType = 'image',
            elements = [],
            primaryCharacterId,
            loraIds = [],
            style,
            mood,
            cameraMovement,
            cameraAngle,
            enhancementLevel = 'balanced',
            preserveOriginalIntent = true,
            addQualityBoosters = true,
            addNegativePrompt = true,
            consistencyPriority = 0.7
        } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        if (!modelId) {
            return res.status(400).json({ error: 'Model ID is required' });
        }

        // Resolve LoRAs from registry
        const loras: LoRAReference[] = [];
        for (const loraId of loraIds) {
            const lora = loraRegistry.get(loraId);
            if (lora) {
                loras.push({
                    id: lora.id,
                    name: lora.name,
                    triggerWords: lora.triggerWords,
                    strength: lora.recommendedStrength,
                    type: lora.type as any,
                    activationText: lora.activationText
                });
                // Record usage
                loraRegistry.recordUsage(loraId);
            }
        }

        // Find primary character from elements
        const primaryCharacter = primaryCharacterId
            ? elements.find((e: ElementReference) => e.id === primaryCharacterId)
            : elements.find((e: ElementReference) => e.type === 'character');

        // Build enhancement request
        const request: PromptEnhancementRequest = {
            originalPrompt: prompt,
            modelId,
            generationType,
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
            consistencyPriority
        };

        // Enhance the prompt
        const result = await promptEnhancer.enhance(request);

        res.json({
            success: true,
            prompt: result.prompt,
            negativePrompt: result.negativePrompt,
            components: result.components,
            recommendations: result.recommendations,
            analysis: result.analysis
        });

    } catch (error: any) {
        console.error('Prompt enhancement failed:', error);
        res.status(500).json({
            error: 'Enhancement failed',
            message: error.message
        });
    }
});

/**
 * POST /api/prompts/quick-enhance
 * 
 * Quick enhancement with minimal options
 */
router.post('/quick-enhance', async (req: Request, res: Response) => {
    try {
        const { prompt, modelId, loraIds = [] } = req.body;

        if (!prompt || !modelId) {
            return res.status(400).json({ error: 'Prompt and modelId are required' });
        }

        // Resolve LoRAs
        const loras: LoRAReference[] = loraIds.map((id: string) => {
            const lora = loraRegistry.get(id);
            if (lora) {
                return {
                    id: lora.id,
                    name: lora.name,
                    triggerWords: lora.triggerWords,
                    strength: lora.recommendedStrength,
                    type: lora.type as any
                };
            }
            return null;
        }).filter(Boolean);

        const enhanced = await promptEnhancer.quickEnhance(prompt, modelId, loras);

        res.json({
            success: true,
            original: prompt,
            enhanced
        });

    } catch (error: any) {
        console.error('Quick enhancement failed:', error);
        res.status(500).json({ error: error.message });
    }
});

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
            template: g.template
        }))
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
 * List registered LoRAs
 */
router.get('/loras', (req: Request, res: Response) => {
    const type = req.query.type as string | undefined;
    const search = req.query.search as string | undefined;

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
            useCount: l.useCount
        }))
    });
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
            characterAttributes
        } = req.body;

        if (!id || !name || !triggerWords?.length) {
            return res.status(400).json({
                error: 'id, name, and triggerWords are required'
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
            strengthRange: [Math.max(0.3, recommendedStrength - 0.3), Math.min(1.2, recommendedStrength + 0.3)],
            characterAttributes,
            useCount: 0
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
            limit
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
        const hasQualityTerms = guide?.qualityBoosters.some(b =>
            prompt.toLowerCase().includes(b.toLowerCase())
        ) || false;

        // Check for potential trigger words
        const potentialTriggers = prompt.match(/\b[a-z]+x[a-z]*\b/gi) || [];

        // Check prompt structure
        const hasWeights = /\([^)]+:\d+\.?\d*\)/.test(prompt);
        const hasNegative = prompt.toLowerCase().includes('negative') ||
            prompt.includes('##') ||
            prompt.includes('--no');

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
                    withinMaxLength: guide?.syntax.maxLength
                        ? prompt.length <= guide.syntax.maxLength
                        : true,
                    maxLength: guide?.syntax.maxLength
                }
            },
            suggestions: generateSuggestions(prompt, guide)
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
        suggestions.push(`Prompt is ${prompt.length - guide.syntax.maxLength} characters over the recommended ${guide.syntax.maxLength} limit`);
    }

    // Quality terms suggestion
    if (!guide.qualityBoosters.some((b: string) => prompt.toLowerCase().includes(b.toLowerCase()))) {
        suggestions.push(`Consider adding quality terms like: ${guide.qualityBoosters.slice(0, 3).join(', ')}`);
    }

    // Weight syntax suggestion for models that support it
    if (guide.syntax.weightSyntax && !prompt.includes(':')) {
        suggestions.push(`This model supports emphasis weights using ${guide.syntax.weightSyntax} syntax`);
    }

    // Consistency suggestion
    if (guide.characterHandling.consistencyKeywords.length > 0) {
        const hasConsistency = guide.characterHandling.consistencyKeywords.some((k: string) =>
            prompt.toLowerCase().includes(k.toLowerCase())
        );
        if (!hasConsistency) {
            suggestions.push(`For character consistency, consider adding: ${guide.characterHandling.consistencyKeywords[0]}`);
        }
    }

    return suggestions;
}

export default router;
