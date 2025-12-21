
import { PrismaClient } from '@prisma/client';
import { MODEL_PROMPTING_GUIDES } from '../prompts/ModelPromptGuides';

const prisma = new PrismaClient();

export interface ModelContext {
    id: string;
    name: string;
    provider: string;
    type: 'image' | 'video';
    syntaxStyle: string;
    capabilities: string[];
}

export interface LoRAContext {
    id: string;
    name: string;
    baseModel: string;
    triggerWords: string[]; // Actual trigger words
    tagDefinitions: string[]; // Descriptive tags (e.g. "red dress - clothing")
    description?: string;
    category?: string;
    imageUrl?: string;
    strength?: number;
    source?: 'project' | 'global';
}

export class KnowledgeBaseService {
    private static instance: KnowledgeBaseService;

    private constructor() { }

    public static getInstance(): KnowledgeBaseService {
        if (!KnowledgeBaseService.instance) {
            KnowledgeBaseService.instance = new KnowledgeBaseService();
        }
        return KnowledgeBaseService.instance;
    }

    /**
     * Get a global context summary of ALL available resources.
     * Useful for system prompts to let the LLM know what tools it has.
     */
    async getGlobalContext(): Promise<string> {
        const models = await this.getModels();
        const loras = await this.getLoRAs();

        let context = `AVAILABLE RESOURCES (You can use these in your generations):\n\n`;

        context += `MODELS:\n`;
        models.forEach(m => {
            context += `- ${m.name} (${m.id}): ${m.type.toUpperCase()} model. Style: ${m.syntaxStyle}.\n`;
        });

        context += `\nLORAS (Custom Styles/Characters):\n`;
        loras.forEach(l => {
            const triggers = l.triggerWords.length > 0 ? `Triggers: [${l.triggerWords.join(', ')}]` : 'No explicit trigger';
            context += `- ${l.name} (${l.baseModel}): ${triggers}. ${l.description ? `Desc: ${l.description.substring(0, 50)}...` : ''}\n`;
        });

        return context;
    }

    /**
     * Get detailed context for a specific model (for Prompt Builder)
     */
    async getModelContext(modelId: string): Promise<string> {
        const guide = MODEL_PROMPTING_GUIDES[modelId];
        if (!guide) return "";

        return `MODEL GUIDE (${guide.name}):
        - Syntax: ${guide.syntax.style}
        - Triggers Placement: ${guide.characterHandling.triggerWordPlacement}
        - Quality Boosters: ${guide.qualityBoosters.join(', ')}
        - Recommended Config: Steps ${guide.recommendedSettings.steps?.join('-')}, CFG ${guide.recommendedSettings.cfgScale?.join('-')}
        `;
    }

    /**
     * Get a specific LoRA by ID
     */
    async getLoRAById(id: string): Promise<LoRAContext | null> {
        try {
            const lora = await prisma.loRA.findUnique({
                where: { id },
                include: { globalLoRA: true }
            });

            if (!lora) return null;

            return this.mapLoRAToContext(lora, 'project');
        } catch (e) {
            console.error(`KnowledgeBase: Failed to fetch LoRA ${id}`, e);
            return null;
        }
    }

    /**
     * Search for LoRAs matching a query across project and global LoRAs
     * Prioritizes exact matches, then partial matches, sorted by usage
     */
    async searchLoRAs(options: {
        query?: string;
        projectId?: string;
        baseModel?: string;
        category?: string;
        limit?: number;
    }): Promise<LoRAContext[]> {
        const { query, projectId, baseModel, category, limit = 20 } = options;
        const results: LoRAContext[] = [];
        const lowerQuery = query?.toLowerCase() || '';

        try {
            // 1. Search project-specific LoRAs first (if projectId provided)
            if (projectId) {
                const projectLoras = await prisma.loRA.findMany({
                    where: {
                        projectId,
                        ...(baseModel ? { baseModel: { contains: baseModel } } : {}),
                        ...(category ? { category } : {}),
                    },
                    include: { globalLoRA: true },
                    orderBy: { updatedAt: 'desc' }
                });

                for (const lora of projectLoras) {
                    const mapped = this.mapLoRAToContext(lora, 'project');
                    if (this.matchesQuery(mapped, lowerQuery)) {
                        results.push(mapped);
                    }
                }
            }

            // 2. Search global LoRAs
            const globalLoras = await prisma.globalLoRA.findMany({
                where: {
                    ...(baseModel ? { baseModel: { contains: baseModel } } : {}),
                    ...(category ? { category } : {}),
                },
                orderBy: { usageCount: 'desc' }
            });

            for (const lora of globalLoras) {
                // Skip if already in results (project LoRA takes priority)
                if (results.some(r => r.name.toLowerCase() === lora.name.toLowerCase())) {
                    continue;
                }
                const mapped = this.mapGlobalLoRAToContext(lora);
                if (this.matchesQuery(mapped, lowerQuery)) {
                    results.push(mapped);
                }
            }

            // Sort: exact name matches first, then partial matches
            results.sort((a, b) => {
                const aExact = a.name.toLowerCase() === lowerQuery;
                const bExact = b.name.toLowerCase() === lowerQuery;
                if (aExact && !bExact) return -1;
                if (bExact && !aExact) return 1;
                // Project LoRAs before global
                if (a.source === 'project' && b.source === 'global') return -1;
                if (b.source === 'project' && a.source === 'global') return 1;
                return 0;
            });

            return results.slice(0, limit);
        } catch (e) {
            console.error("KnowledgeBase: Failed to search LoRAs", e);
            return [];
        }
    }

    /**
     * Match LoRAs against AI-suggested style descriptions
     * Returns LoRAs that match the suggested styles (e.g., "photo-realistic portrait")
     */
    async matchLoRAsToSuggestions(
        suggestions: string[],
        options: { projectId?: string; baseModel?: string; limit?: number }
    ): Promise<{ suggestion: string; matches: LoRAContext[] }[]> {
        const results: { suggestion: string; matches: LoRAContext[] }[] = [];

        for (const suggestion of suggestions) {
            const matches = await this.searchLoRAs({
                query: suggestion,
                projectId: options.projectId,
                baseModel: options.baseModel,
                limit: options.limit || 3
            });
            results.push({ suggestion, matches });
        }

        return results;
    }

    /**
     * Get all LoRAs for a project (for the LoRA picker/library)
     */
    async getProjectLoRAs(projectId: string): Promise<LoRAContext[]> {
        try {
            const loras = await prisma.loRA.findMany({
                where: { projectId },
                include: { globalLoRA: true },
                orderBy: { updatedAt: 'desc' }
            });

            return loras.map(l => this.mapLoRAToContext(l, 'project'));
        } catch (e) {
            console.error("KnowledgeBase: Failed to fetch project LoRAs", e);
            return [];
        }
    }

    /**
     * Get all global LoRAs (shared library)
     */
    async getGlobalLoRAs(options?: { baseModel?: string; category?: string; limit?: number }): Promise<LoRAContext[]> {
        try {
            const loras = await prisma.globalLoRA.findMany({
                where: {
                    ...(options?.baseModel ? { baseModel: { contains: options.baseModel } } : {}),
                    ...(options?.category ? { category: options.category } : {}),
                },
                orderBy: { usageCount: 'desc' },
                take: options?.limit
            });

            return loras.map(l => this.mapGlobalLoRAToContext(l));
        } catch (e) {
            console.error("KnowledgeBase: Failed to fetch global LoRAs", e);
            return [];
        }
    }

    /**
     * Check if a LoRA matches a search query
     */
    private matchesQuery(lora: LoRAContext, query: string): boolean {
        if (!query) return true;

        const searchTerms = query.split(/\s+/).filter(t => t.length > 1);
        const loraText = [
            lora.name,
            lora.description || '',
            lora.category || '',
            ...lora.triggerWords,
            ...lora.tagDefinitions
        ].join(' ').toLowerCase();

        // Match if ALL search terms are found (AND logic)
        return searchTerms.every(term => loraText.includes(term));
    }

    /**
     * Map GlobalLoRA to LoRAContext
     */
    private mapGlobalLoRAToContext(lora: any): LoRAContext {
        let triggerWords: string[] = [];
        if (lora.triggerWord) {
            triggerWords = [lora.triggerWord];
        }

        return {
            id: lora.id,
            name: lora.name,
            baseModel: lora.baseModel,
            triggerWords,
            tagDefinitions: [],
            description: lora.description || undefined,
            category: lora.category || undefined,
            imageUrl: lora.imageUrl || undefined,
            strength: lora.strength || 1.0,
            source: 'global'
        };
    }

    private getModels(): ModelContext[] {
        return Object.values(MODEL_PROMPTING_GUIDES).map(g => ({
            id: g.id,
            name: g.name,
            provider: g.provider,
            type: g.type as 'image' | 'video',
            syntaxStyle: g.syntax.style,
            capabilities: g.qualityBoosters
        }));
    }

    private async getLoRAs(): Promise<LoRAContext[]> {
        try {
            // Fetch all LoRAs, including global details for description
            const loras = await prisma.loRA.findMany({
                include: { globalLoRA: true }
            });

            return loras.map(l => this.mapLoRAToContext(l));
        } catch (e) {
            console.error("KnowledgeBase: Failed to fetch LoRAs", e);
            return [];
        }
    }

    private mapLoRAToContext(lora: any, source: 'project' | 'global' = 'project'): LoRAContext {
        let triggerWords: string[] = [];

        // Parse triggerWords if JSON string, or use singular triggerWord
        if (lora.triggerWords) {
            try {
                const parsed = JSON.parse(lora.triggerWords);
                if (Array.isArray(parsed)) triggerWords = parsed;
            } catch (e) {
                // If not valid JSON, maybe it's just a string?
                triggerWords = [lora.triggerWords];
            }
        } else if (lora.triggerWord) {
            triggerWords = [lora.triggerWord];
        }

        // Try to get description from globalLoRA if available
        const description = lora.globalLoRA?.description || undefined;

        return {
            id: lora.id,
            name: lora.name,
            baseModel: lora.baseModel,
            triggerWords,
            tagDefinitions: [],
            description,
            category: lora.category || undefined,
            imageUrl: lora.imageUrl || undefined,
            strength: lora.strength || 1.0,
            source
        };
    }
}
