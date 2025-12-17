
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

            return this.mapLoRAToContext(lora);
        } catch (e) {
            console.error(`KnowledgeBase: Failed to fetch LoRA ${id}`, e);
            return null;
        }
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

    private mapLoRAToContext(lora: any): LoRAContext {
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
            description
        };
    }
}
