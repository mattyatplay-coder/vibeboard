import { getModelGuide, ModelPromptGuide, NEGATIVE_PROMPT_TEMPLATES } from './ModelPromptGuides';
import OpenAI from 'openai';

/**
 * PromptEnhancer Service
 * 
 * Intelligent prompt enhancement that:
 * 1. Analyzes the target model's prompting guide
 * 2. Extracts and properly places LoRA trigger words
 * 3. Maintains character/element consistency through reference weighting
 * 4. Rewrites prompts using LLM to match model-specific syntax
 */

export interface LoRAReference {
    id: string;
    name: string;
    triggerWords: string[];
    strength: number;           // 0.0 - 1.0
    type: 'character' | 'style' | 'concept' | 'clothing' | 'pose';
    activationText?: string;    // Full activation phrase
}

export interface ElementReference {
    id: string;
    name: string;
    type: 'character' | 'prop' | 'location' | 'style';
    description: string;
    imageUrl?: string;
    consistencyWeight: number;  // How important is consistency (0.5 - 1.5)
    attributes: {
        physicalFeatures?: string[];    // "brown hair", "blue eyes"
        clothing?: string[];            // "red dress", "leather jacket"
        accessories?: string[];         // "glasses", "watch"
        personality?: string[];         // "confident", "mysterious"
    };
    associatedLoRAs?: LoRAReference[];
}

export interface PromptEnhancementRequest {
    originalPrompt: string;
    modelId: string;
    generationType: 'image' | 'video';

    // Character/Element References
    elements?: ElementReference[];
    primaryCharacter?: ElementReference;  // Main focus character

    // LoRA Models
    loras?: LoRAReference[];

    // Style Preferences
    style?: string;
    mood?: string;

    // Camera/Composition (for video)
    cameraMovement?: string;
    cameraAngle?: string;

    // Settings
    enhancementLevel: 'minimal' | 'balanced' | 'aggressive';
    preserveOriginalIntent: boolean;
    addQualityBoosters: boolean;
    addNegativePrompt: boolean;

    // Consistency Priority (0-1, higher = more emphasis on consistency)
    consistencyPriority: number;
}

export interface EnhancedPrompt {
    prompt: string;
    negativePrompt?: string;

    // Breakdown of what was added
    components: {
        triggerWords: string[];
        characterDescription: string;
        qualityBoosters: string[];
        styleElements: string[];
        consistencyKeywords: string[];
    };

    // Recommendations
    recommendations: {
        cfgScale?: number;
        steps?: number;
        sampler?: string;
        scheduler?: string;
        loras?: string[];
    };

    // Analysis
    analysis: {
        modelUsed: string;
        syntaxStyle: string;
        characterConsistencyScore: number;  // 0-100
        promptComplexity: number;           // Token estimate
    };
}

export class PromptEnhancer {
    private openai: OpenAI;
    private useLocalLLM: boolean;

    constructor() {
        // Try OpenAI first, fall back to other options
        const apiKey = process.env.OPENAI_API_KEY || '';
        this.openai = new OpenAI({ apiKey });
        this.useLocalLLM = !apiKey;

        if (this.useLocalLLM) {
            console.log('PromptEnhancer: No OpenAI key, using rule-based enhancement');
        }
    }

    /**
     * Main enhancement method
     */
    async enhance(request: PromptEnhancementRequest): Promise<EnhancedPrompt> {
        // Get the model's prompting guide
        const guide = getModelGuide(request.modelId);

        if (!guide) {
            console.warn(`No guide found for model ${request.modelId}, using defaults`);
        }

        // Extract all trigger words from LoRAs
        const triggerWords = this.extractTriggerWords(request.loras || []);

        // Build character description from elements
        const characterDescription = this.buildCharacterDescription(
            request.elements || [],
            request.primaryCharacter,
            request.consistencyPriority
        );

        // Build consistency keywords
        const consistencyKeywords = this.buildConsistencyKeywords(
            guide,
            request.elements || [],
            request.consistencyPriority
        );

        let llmResult: any = null;
        let enhancedPromptText: string;

        if (!this.useLocalLLM && request.enhancementLevel !== 'minimal') {
            console.log('Enhancing with LLM for model:', request.modelId);
            const result = await this.enhanceWithLLM(
                request,
                guide,
                triggerWords,
                characterDescription,
                consistencyKeywords
            );

            if (typeof result === 'object') {
                llmResult = result;
                enhancedPromptText = result.prompt;
            } else {
                enhancedPromptText = result;
            }
        } else {
            console.log('Enhancing with Rules for model:', request.modelId);
            enhancedPromptText = this.enhanceWithRules(
                request,
                guide,
                triggerWords,
                characterDescription,
                consistencyKeywords
            );
        }
        console.log('Enhanced prompt result:', enhancedPromptText);

        // Build quality boosters if requested
        const qualityBoosters = request.addQualityBoosters
            ? this.selectQualityBoosters(guide, request.enhancementLevel)
            : [];

        // Add quality boosters to prompt if not already included by LLM
        if (qualityBoosters.length > 0 && !this.containsQualityTerms(enhancedPromptText, qualityBoosters)) {
            enhancedPromptText = this.appendQualityBoosters(enhancedPromptText, qualityBoosters, guide);
        }

        // Build negative prompt
        const negativePrompt = request.addNegativePrompt
            ? (llmResult?.negativePrompt || this.buildNegativePrompt(guide, request.modelId))
            : undefined;

        // Build recommendations (merge LLM and rules, preferring LLM)
        const ruleRecommendations = this.buildRecommendations(guide);
        const recommendations = {
            ...ruleRecommendations,
            ...(llmResult?.recommendations || {})
        };

        // Calculate consistency score
        const consistencyScore = this.calculateConsistencyScore(
            enhancedPromptText,
            triggerWords,
            characterDescription,
            consistencyKeywords
        );

        return {
            prompt: enhancedPromptText,
            negativePrompt,
            components: llmResult?.components || {
                triggerWords,
                characterDescription,
                qualityBoosters,
                styleElements: request.style ? [request.style] : [],
                consistencyKeywords
            },
            recommendations,
            analysis: llmResult?.analysis || {
                modelUsed: guide?.id || 'default',
                syntaxStyle: guide?.syntax.style || 'natural',
                characterConsistencyScore: consistencyScore,
                promptComplexity: this.estimateTokens(enhancedPromptText)
            }
        };
    }

    /**
     * Extract trigger words from LoRAs, ordered by strength
     */
    private extractTriggerWords(loras: LoRAReference[]): string[] {
        const triggers: string[] = [];

        // Sort by strength (highest first) and type (character first)
        const sorted = [...loras].sort((a, b) => {
            // Character LoRAs always come first
            if (a.type === 'character' && b.type !== 'character') return -1;
            if (b.type === 'character' && a.type !== 'character') return 1;
            // Then sort by strength
            return b.strength - a.strength;
        });

        for (const lora of sorted) {
            // Use activation text if available, otherwise trigger words
            if (lora.activationText) {
                triggers.push(lora.activationText);
            } else {
                triggers.push(...lora.triggerWords);
            }
        }

        return triggers;
    }

    /**
     * Build comprehensive character description from elements
     */
    private buildCharacterDescription(
        elements: ElementReference[],
        primaryCharacter?: ElementReference,
        consistencyPriority: number = 0.7
    ): string {
        const descriptions: string[] = [];

        // Handle primary character first with extra emphasis
        if (primaryCharacter) {
            const charDesc = this.buildSingleElementDescription(
                primaryCharacter,
                1.0 + (consistencyPriority * 0.5) // Smoother boost: 1.0 to 1.5 range
            );
            descriptions.push(charDesc);
        }

        // Add other character elements
        const otherCharacters = elements.filter(
            e => e.type === 'character' && e.id !== primaryCharacter?.id
        );

        for (const char of otherCharacters) {
            descriptions.push(this.buildSingleElementDescription(char, consistencyPriority));
        }

        return descriptions.join(', ');
    }

    /**
     * Build description for a single element
     */
    private buildSingleElementDescription(
        element: ElementReference,
        weight: number
    ): string {
        const parts: string[] = [];

        // Add physical features with weight
        if (element.attributes?.physicalFeatures?.length) {
            const features = element.attributes.physicalFeatures.join(', ');
            // Always apply weight if priority is decent (>0.5), scaling from 1.0 to 1.5
            if (weight > 1.05) {
                parts.push(`(${features}:${weight.toFixed(2)})`);
            } else {
                parts.push(features);
            }
        }

        // Add clothing
        if (element.attributes?.clothing?.length) {
            parts.push(`wearing ${element.attributes.clothing.join(' and ')}`);
        }

        // Add accessories
        if (element.attributes?.accessories?.length) {
            parts.push(`with ${element.attributes.accessories.join(', ')}`);
        }

        // Add base description
        if (element.description) {
            parts.push(element.description);
        }

        return parts.join(', ');
    }

    /**
     * Build consistency keywords based on model guide and elements
     */
    private buildConsistencyKeywords(
        guide: ModelPromptGuide | null,
        elements: ElementReference[],
        priority: number
    ): string[] {
        const keywords: string[] = [];

        // Add model-specific consistency keywords
        if (guide?.characterHandling.consistencyKeywords) {
            // Select keywords based on priority
            const numKeywords = Math.ceil(
                guide.characterHandling.consistencyKeywords.length * priority
            );
            keywords.push(...guide.characterHandling.consistencyKeywords.slice(0, numKeywords));
        }

        // Add element-specific consistency phrases
        for (const element of elements) {
            if (element.type === 'character' && element.consistencyWeight > 1.0) {
                keywords.push(`same ${element.name}`);
                keywords.push('identical features');
            }
        }

        // Add general consistency keywords with graduated thresholds
        if (priority > 0.6) {
            keywords.push('maintaining consistent appearance');
        }
        if (priority > 0.8) {
            keywords.push('same character throughout');
        }
        if (priority > 0.9) {
            keywords.push('identical facial features');
        }

        return [...new Set(keywords)]; // Remove duplicates
    }

    /**
     * Enhance prompt using LLM (GPT-4o-mini for speed/cost)
     */
    private async enhanceWithLLM(
        request: PromptEnhancementRequest,
        guide: ModelPromptGuide | null,
        triggerWords: string[],
        characterDescription: string,
        consistencyKeywords: string[]
    ): Promise<any> {
        const systemPrompt = this.buildLLMSystemPrompt(guide, request.generationType);

        const userPrompt = this.buildLLMUserPrompt(
            request,
            triggerWords,
            characterDescription,
            consistencyKeywords
        );

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 1000, // Increased for JSON
                temperature: 0.7,
                response_format: { type: "json_object" } // Force JSON mode
            });

            const content = response.choices[0]?.message?.content?.trim();
            if (content && content.toLowerCase() !== 'undefined') {
                try {
                    return JSON.parse(content);
                } catch (e) {
                    console.warn("Failed to parse LLM JSON response, returning raw string", e);
                    return content;
                }
            }

            return this.enhanceWithRules(request, guide, triggerWords, characterDescription, consistencyKeywords);

        } catch (error) {
            console.error('LLM enhancement failed, falling back to rules:', error);
            return this.enhanceWithRules(request, guide, triggerWords, characterDescription, consistencyKeywords);
        }
    }

    /**
     * Refine prompt based on generated image feedback (Vision)
     */
    async refinePrompt(
        originalPrompt: string,
        generatedImageUrl: string,
        feedback?: string
    ): Promise<EnhancedPrompt> {
        if (this.useLocalLLM) {
            throw new Error("Smart Refine requires OpenAI API key for Vision capabilities");
        }

        const systemPrompt = `You are an expert AI art director. Your goal is to analyze a generated image and the original prompt to improve the next generation.
        
        Compare the IMAGE to the PROMPT.
        Identify:
        1. What is missing?
        2. What is incorrect (wrong color, style, composition)?
        3. How to fix it (adjust prompt, weights, CFG, etc.)

        4. Move negative constraints (e.g. "no tattoos", "remove tattoos") to the 'negativePrompt' field.
        5. If the user asks to REMOVE something, replace it with the opposite in the positive prompt (e.g. "remove tattoos" -> "smooth skin").

        ${feedback ? `USER FEEDBACK: "${feedback}" - Prioritize this request.` : ''}

        Output a JSON object with the refined prompt and settings.`;

        const userPrompt = `ORIGINAL PROMPT: "${originalPrompt}"`;

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o', // Use GPT-4o for Vision
                messages: [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: userPrompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: generatedImageUrl,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1000,
                response_format: { type: "json_object" }
            });

            const content = response.choices[0]?.message?.content;
            if (!content) throw new Error("No response from Vision model");

            const result = JSON.parse(content);

            // Map result to EnhancedPrompt structure
            // (Simplified mapping for now, assuming LLM follows structure)
            return {
                prompt: result.prompt || originalPrompt,
                recommendations: result.recommendations || {},
                components: result.components || {
                    triggerWords: [],
                    characterDescription: "",
                    qualityBoosters: [],
                    styleElements: [],
                    consistencyKeywords: []
                },
                analysis: {
                    modelUsed: "refinement",
                    syntaxStyle: "optimized",
                    characterConsistencyScore: 0,
                    promptComplexity: 0
                }
            };

        } catch (error) {
            console.error("Smart Refine failed:", error);
            throw error;
        }
    }

    /**
     * Build system prompt for LLM enhancement
     */
    private buildLLMSystemPrompt(
        guide: ModelPromptGuide | null,
        type: 'image' | 'video'
    ): string {
        const basePrompt = `You are an expert AI prompt engineer specializing in ${type} generation. Your task is to rewrite user prompts to maximize quality and character consistency.

CRITICAL RULES:
1. ALWAYS place trigger words (like "ohwx_woman") at the VERY START of the prompt
2. Character consistency is the TOP PRIORITY - include detailed physical descriptions
3. Keep the user's original intent but enhance with proper syntax
4. Output ONLY the enhanced prompt, no explanations
5. Move negative constraints (e.g. "no tattoos", "without blur", "remove tattoos") to the 'negativePrompt' field.
6. If the user asks to REMOVE something, replace it with the opposite in the positive prompt (e.g. "remove tattoos" -> "smooth skin", "remove clouds" -> "clear sky").

`;

        if (!guide) {
            return basePrompt + `Use natural language with commas as separators. Focus on clear, detailed descriptions.`;
        }

        let guideInstructions = `
MODEL: ${guide.name}
SYNTAX STYLE: ${guide.syntax.style}
SEPARATOR: "${guide.syntax.separator}"
MAX LENGTH: ~${guide.syntax.maxLength} characters

`;

        // Add weight syntax if supported
        if (guide.syntax.weightSyntax) {
            guideInstructions += `WEIGHT SYNTAX: ${guide.syntax.weightSyntax} (use for emphasis on important features)
`;
        }

        // Add character handling instructions
        guideInstructions += `
CHARACTER HANDLING:
- Trigger word placement: ${guide.characterHandling.triggerWordPlacement}
- Subject placement priority: ${guide.characterHandling.placementPriority}
- Pose description style: ${guide.characterHandling.poseDescriptionStyle}

TEMPLATE STRUCTURE:
${guide.template}

`;

        // Add quality boosters
        if (guide.qualityBoosters.length > 0) {
            guideInstructions += `QUALITY TERMS TO INCLUDE: ${guide.qualityBoosters.slice(0, 5).join(', ')}
`;
        }

        // Add example
        if (guide.examples.length > 0) {
            const example = guide.examples[0];
            guideInstructions += `
EXAMPLE:
Input: "${example.input}"
Output: "${example.output}"
`;
        }

        return basePrompt + guideInstructions;
    }

    /**
     * Build user prompt for LLM
     */
    private buildLLMUserPrompt(
        request: PromptEnhancementRequest,
        triggerWords: string[],
        characterDescription: string,
        consistencyKeywords: string[]
    ): string {
        let prompt = `ORIGINAL PROMPT: "${request.originalPrompt}"

`;

        if (triggerWords.length > 0) {
            prompt += `LORA TRIGGER WORDS (MUST include at start): ${triggerWords.join(', ')}

`;
        }

        if (characterDescription) {
            prompt += `CHARACTER DETAILS (MUST include for consistency): ${characterDescription}

`;
        }

        if (consistencyKeywords.length > 0) {
            prompt += `CONSISTENCY KEYWORDS (include naturally): ${consistencyKeywords.join(', ')}

`;
        }

        if (request.style) {
            prompt += `STYLE: ${request.style}
`;
        }

        if (request.mood) {
            prompt += `MOOD: ${request.mood}
`;
        }

        if (request.generationType === 'video') {
            if (request.cameraMovement) {
                prompt += `CAMERA MOVEMENT: ${request.cameraMovement}
`;
            }
            if (request.cameraAngle) {
                prompt += `CAMERA ANGLE: ${request.cameraAngle}
`;
            }
        }

        prompt += `
CONSISTENCY PRIORITY: ${(request.consistencyPriority * 100).toFixed(0)}% (${request.consistencyPriority > 0.7 ? 'HIGH' : 'NORMAL'})

Please analyze the request and model capabilities to provide:
1. The enhanced prompt
2. Recommended settings (CFG, Steps, Sampler, Scheduler)
3. Recommended LoRA styles (if applicable, e.g. "cinematic", "detail_slider", "anime_outline")

Output ONLY valid JSON in this format:
{
  "prompt": "enhanced prompt text",
  "negativePrompt": "negative prompt text",
  "components": {
    "triggerWords": ["word1"],
    "characterDescription": "desc",
    "qualityBoosters": ["4k"],
    "styleElements": ["style"],
    "consistencyKeywords": ["key"]
  },
  "recommendations": {
    "cfgScale": 7.0,
    "steps": 30,
    "sampler": "euler_a",
    "scheduler": "normal",
    "loras": ["lora_name"]
  },
  "analysis": {
    "modelUsed": "model_id",
    "syntaxStyle": "natural",
    "characterConsistencyScore": 85,
    "promptComplexity": 100
  }
}`;

        return prompt;
    }

    /**
     * Rule-based enhancement (fallback when LLM unavailable)
     */
    private enhanceWithRules(
        request: PromptEnhancementRequest,
        guide: ModelPromptGuide | null,
        triggerWords: string[],
        characterDescription: string,
        consistencyKeywords: string[]
    ): string {
        const parts: string[] = [];
        const sep = guide?.syntax.separator || ', ';

        // 1. Start with trigger words (always first for consistency)
        if (triggerWords.length > 0) {
            parts.push(triggerWords.join(' '));
        }

        // 2. Add consistency keywords for high priority
        if (request.consistencyPriority > 0.7 && consistencyKeywords.length > 0) {
            parts.push(consistencyKeywords[0]); // Most important one
        }

        // 3. Add character description
        if (characterDescription) {
            parts.push(characterDescription);
        }

        // 4. Add original prompt (cleaned)
        const cleanedOriginal = this.cleanOriginalPrompt(request.originalPrompt, triggerWords);
        if (cleanedOriginal && cleanedOriginal !== 'undefined') {
            parts.push(cleanedOriginal);
        }

        // 5. Add style
        if (request.style && request.style !== 'undefined') {
            parts.push(request.style);
        }

        // 6. Add mood
        if (request.mood && request.mood !== 'undefined') {
            parts.push(`${request.mood} atmosphere`);
        }

        // 7. Add camera info for video
        if (request.generationType === 'video') {
            if (request.cameraMovement && request.cameraMovement !== 'undefined') {
                // Check if model uses bracket syntax (Hailuo)
                if (guide?.id === 'hailuo-director') {
                    // Prepend camera command
                    parts.unshift(`[${request.cameraMovement}]`);
                } else {
                    parts.push(request.cameraMovement);
                }
            }
            if (request.cameraAngle && request.cameraAngle !== 'undefined') {
                parts.push(request.cameraAngle);
            }
        }

        // 8. Add remaining consistency keywords
        if (consistencyKeywords.length > 1) {
            parts.push(consistencyKeywords.slice(1, 3).join(sep));
        }

        const result = parts.filter(p => Boolean(p) && p.toLowerCase() !== 'undefined').join(sep);
        return result || request.originalPrompt; // Fallback to original if empty
    }

    /**
     * Remove trigger words from original prompt to avoid duplication
     */
    private cleanOriginalPrompt(original: string, triggerWords: string[]): string {
        if (!original || original === 'undefined') return '';

        let cleaned = original;

        for (const trigger of triggerWords) {
            // Remove trigger word (case insensitive)
            const regex = new RegExp(trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            cleaned = cleaned.replace(regex, '');
        }

        // Clean up extra commas and spaces
        cleaned = cleaned
            .replace(/,\s*,/g, ',')
            .replace(/^\s*,\s*/, '')
            .replace(/\s*,\s*$/, '')
            .trim();

        return cleaned;
    }

    /**
     * Select quality boosters based on enhancement level
     */
    private selectQualityBoosters(
        guide: ModelPromptGuide | null,
        level: 'minimal' | 'balanced' | 'aggressive'
    ): string[] {
        const allBoosters = guide?.qualityBoosters || [
            'high quality', 'detailed', 'sharp focus'
        ];

        switch (level) {
            case 'minimal':
                return allBoosters.slice(0, 2);
            case 'balanced':
                return allBoosters.slice(0, 4);
            case 'aggressive':
                return allBoosters.slice(0, 6);
            default:
                return allBoosters.slice(0, 3);
        }
    }

    /**
     * Check if prompt already contains quality terms
     */
    private containsQualityTerms(prompt: string, boosters: string[]): boolean {
        const lowerPrompt = prompt.toLowerCase();
        return boosters.some(b => lowerPrompt.includes(b.toLowerCase()));
    }

    /**
     * Append quality boosters to prompt
     */
    private appendQualityBoosters(
        prompt: string,
        boosters: string[],
        guide: ModelPromptGuide | null
    ): string {
        const sep = guide?.syntax.separator || ', ';
        return prompt + sep + boosters.join(sep);
    }

    /**
     * Build negative prompt from template
     */
    private buildNegativePrompt(
        guide: ModelPromptGuide | null,
        modelId: string
    ): string | undefined {
        // Only for models that support negative prompts
        if (!guide?.syntax.negativePrefix) {
            return undefined;
        }

        // Get template or build default
        const template = NEGATIVE_PROMPT_TEMPLATES[modelId] ||
            NEGATIVE_PROMPT_TEMPLATES['sdxl'] || // Default fallback
            'low quality, blurry, bad anatomy, deformed';

        return template;
    }

    /**
     * Build generation recommendations
     */
    private buildRecommendations(guide: ModelPromptGuide | null): EnhancedPrompt['recommendations'] {
        if (!guide?.recommendedSettings) {
            return {};
        }

        const settings = guide.recommendedSettings;

        return {
            cfgScale: settings.cfgScale
                ? (settings.cfgScale[0] + settings.cfgScale[1]) / 2
                : undefined,
            steps: settings.steps
                ? Math.round((settings.steps[0] + settings.steps[1]) / 2)
                : undefined,
            sampler: settings.sampler?.[0]
        };
    }

    /**
     * Calculate consistency score
     */
    private calculateConsistencyScore(
        prompt: string,
        triggerWords: string[],
        characterDescription: string,
        consistencyKeywords: string[]
    ): number {
        let score = 50; // Base score
        const lowerPrompt = prompt.toLowerCase();

        // +20 points if all trigger words present
        const triggerCount = triggerWords.filter(t =>
            lowerPrompt.includes(t.toLowerCase())
        ).length;
        score += (triggerCount / Math.max(triggerWords.length, 1)) * 20;

        // +15 points for character description elements
        const descWords = characterDescription.toLowerCase().split(/[\s,]+/);
        const descMatches = descWords.filter(w =>
            w.length > 3 && lowerPrompt.includes(w)
        ).length;
        score += Math.min((descMatches / Math.max(descWords.length, 1)) * 15, 15);

        // +15 points for consistency keywords
        const keywordMatches = consistencyKeywords.filter(k =>
            lowerPrompt.includes(k.toLowerCase())
        ).length;
        score += (keywordMatches / Math.max(consistencyKeywords.length, 1)) * 15;

        return Math.min(Math.round(score), 100);
    }

    /**
     * Estimate token count
     */
    private estimateTokens(text: string): number {
        // Rough estimate: ~4 chars per token for English
        return Math.ceil(text.length / 4);
    }

    /**
     * Quick enhance for simple use cases
     */
    async quickEnhance(
        prompt: string,
        modelId: string,
        loras?: LoRAReference[]
    ): Promise<string> {
        const result = await this.enhance({
            originalPrompt: prompt,
            modelId,
            generationType: 'image',
            loras,
            enhancementLevel: 'balanced',
            preserveOriginalIntent: true,
            addQualityBoosters: true,
            addNegativePrompt: false,
            consistencyPriority: 0.7
        });

        return result.prompt;
    }
}

// Export singleton instance
export const promptEnhancer = new PromptEnhancer();
