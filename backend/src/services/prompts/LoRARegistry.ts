/**
 * LoRA Registry Service
 * 
 * Manages LoRA models, their trigger words, and metadata.
 * Can pull from Civitai API or local database.
 */

import axios from 'axios';

export interface LoRAModel {
    id: string;
    name: string;
    version: string;
    
    // Trigger words
    triggerWords: string[];
    activationText?: string;     // Full activation phrase
    trainedWords?: string[];     // Additional trained concepts
    
    // Categorization
    type: 'character' | 'style' | 'concept' | 'clothing' | 'pose' | 'background' | 'effect';
    baseModel: 'sd15' | 'sdxl' | 'flux' | 'pony' | 'sd3';
    
    // Metadata
    description?: string;
    thumbnailUrl?: string;
    civitaiId?: string;
    civitaiVersionId?: string;
    
    // Recommended settings
    recommendedStrength: number;   // 0.0 - 1.0
    strengthRange: [number, number];
    
    // Character-specific (for consistency)
    characterAttributes?: {
        gender?: 'male' | 'female' | 'other';
        hairColor?: string;
        hairStyle?: string;
        eyeColor?: string;
        age?: string;
        ethnicity?: string;
        bodyType?: string;
        distinguishingFeatures?: string[];
    };
    
    // Usage tracking
    lastUsed?: Date;
    useCount: number;
}

export interface LoRASearchResult {
    loras: LoRAModel[];
    total: number;
    source: 'local' | 'civitai';
}

// Common trigger word patterns to extract from model descriptions
const TRIGGER_PATTERNS = [
    /trigger(?:\s+word)?s?:\s*["\']?([^"'\n,]+)["\']?/gi,
    /activation(?:\s+word)?s?:\s*["\']?([^"'\n,]+)["\']?/gi,
    /use\s+["\']([^"']+)["\']\s+(?:to\s+)?activate/gi,
    /trained\s+on\s+["\']([^"']+)["\']/gi,
];

export class LoRARegistry {
    private localRegistry: Map<string, LoRAModel> = new Map();
    private civitaiCache: Map<string, LoRAModel> = new Map();
    private cacheExpiry: number = 1000 * 60 * 60; // 1 hour
    
    constructor() {
        this.loadBuiltInTriggers();
    }
    
    /**
     * Register a LoRA with its trigger words
     */
    register(lora: LoRAModel): void {
        this.localRegistry.set(lora.id, {
            ...lora,
            useCount: lora.useCount || 0
        });
    }
    
    /**
     * Get LoRA by ID
     */
    get(id: string): LoRAModel | undefined {
        return this.localRegistry.get(id) || this.civitaiCache.get(id);
    }
    
    /**
     * Search for LoRAs by name or trigger word
     */
    search(query: string, type?: LoRAModel['type']): LoRAModel[] {
        const results: LoRAModel[] = [];
        const lowerQuery = query.toLowerCase();
        
        for (const lora of this.localRegistry.values()) {
            if (type && lora.type !== type) continue;
            
            const nameMatch = lora.name.toLowerCase().includes(lowerQuery);
            const triggerMatch = lora.triggerWords.some(t => 
                t.toLowerCase().includes(lowerQuery)
            );
            
            if (nameMatch || triggerMatch) {
                results.push(lora);
            }
        }
        
        return results.sort((a, b) => b.useCount - a.useCount);
    }
    
    /**
     * Get all registered LoRAs
     */
    getAll(type?: LoRAModel['type']): LoRAModel[] {
        let loras = Array.from(this.localRegistry.values());
        
        if (type) {
            loras = loras.filter(l => l.type === type);
        }
        
        return loras.sort((a, b) => b.useCount - a.useCount);
    }
    
    /**
     * Fetch LoRA info from Civitai by model ID
     */
    async fetchFromCivitai(modelId: string): Promise<LoRAModel | null> {
        // Check cache first
        const cached = this.civitaiCache.get(`civitai-${modelId}`);
        if (cached) {
            return cached;
        }
        
        try {
            const response = await axios.get(
                `https://civitai.com/api/v1/models/${modelId}`,
                { timeout: 10000 }
            );
            
            const model = response.data;
            const latestVersion = model.modelVersions?.[0];
            
            if (!latestVersion) {
                return null;
            }
            
            // Extract trigger words
            const triggerWords = this.extractTriggerWords(
                latestVersion.trainedWords || [],
                model.description || '',
                latestVersion.description || ''
            );
            
            // Determine LoRA type
            const type = this.inferLoRAType(model.tags || [], model.name);
            
            // Build character attributes if it's a character LoRA
            const characterAttributes = type === 'character' 
                ? this.extractCharacterAttributes(model.description || '', model.tags || [])
                : undefined;
            
            const lora: LoRAModel = {
                id: `civitai-${modelId}-${latestVersion.id}`,
                name: model.name,
                version: latestVersion.name,
                triggerWords,
                activationText: triggerWords.length > 0 ? triggerWords[0] : undefined,
                trainedWords: latestVersion.trainedWords || [],
                type,
                baseModel: this.mapBaseModel(latestVersion.baseModel),
                description: model.description,
                thumbnailUrl: latestVersion.images?.[0]?.url,
                civitaiId: modelId,
                civitaiVersionId: latestVersion.id.toString(),
                recommendedStrength: 0.7,
                strengthRange: [0.5, 1.0],
                characterAttributes,
                useCount: 0
            };
            
            // Cache it
            this.civitaiCache.set(`civitai-${modelId}`, lora);
            
            return lora;
            
        } catch (error) {
            console.error(`Failed to fetch LoRA ${modelId} from Civitai:`, error);
            return null;
        }
    }
    
    /**
     * Search Civitai for LoRAs
     */
    async searchCivitai(
        query: string, 
        options?: { 
            type?: string; 
            baseModel?: string;
            limit?: number;
        }
    ): Promise<LoRASearchResult> {
        try {
            const params = new URLSearchParams({
                query,
                types: 'LORA',
                limit: (options?.limit || 20).toString(),
                sort: 'Highest Rated'
            });
            
            if (options?.baseModel) {
                params.append('baseModels', options.baseModel);
            }
            
            const response = await axios.get(
                `https://civitai.com/api/v1/models?${params}`,
                { timeout: 15000 }
            );
            
            const loras: LoRAModel[] = [];
            
            for (const model of response.data.items || []) {
                const latestVersion = model.modelVersions?.[0];
                if (!latestVersion) continue;
                
                const triggerWords = this.extractTriggerWords(
                    latestVersion.trainedWords || [],
                    model.description || '',
                    latestVersion.description || ''
                );
                
                loras.push({
                    id: `civitai-${model.id}-${latestVersion.id}`,
                    name: model.name,
                    version: latestVersion.name,
                    triggerWords,
                    activationText: triggerWords[0],
                    trainedWords: latestVersion.trainedWords,
                    type: this.inferLoRAType(model.tags || [], model.name),
                    baseModel: this.mapBaseModel(latestVersion.baseModel),
                    description: model.description?.substring(0, 200),
                    thumbnailUrl: latestVersion.images?.[0]?.url,
                    civitaiId: model.id.toString(),
                    civitaiVersionId: latestVersion.id.toString(),
                    recommendedStrength: 0.7,
                    strengthRange: [0.5, 1.0],
                    useCount: 0
                });
            }
            
            return {
                loras,
                total: response.data.metadata?.totalItems || loras.length,
                source: 'civitai'
            };
            
        } catch (error) {
            console.error('Civitai search failed:', error);
            return { loras: [], total: 0, source: 'civitai' };
        }
    }
    
    /**
     * Extract trigger words from various sources
     */
    private extractTriggerWords(
        trainedWords: string[],
        modelDescription: string,
        versionDescription: string
    ): string[] {
        const triggers = new Set<string>();
        
        // Add explicitly listed trained words
        for (const word of trainedWords) {
            if (word && word.length > 1) {
                triggers.add(word.trim());
            }
        }
        
        // Extract from descriptions using patterns
        const fullText = `${modelDescription} ${versionDescription}`;
        
        for (const pattern of TRIGGER_PATTERNS) {
            const matches = fullText.matchAll(pattern);
            for (const match of matches) {
                if (match[1]) {
                    triggers.add(match[1].trim());
                }
            }
        }
        
        return Array.from(triggers);
    }
    
    /**
     * Infer LoRA type from tags and name
     */
    private inferLoRAType(tags: string[], name: string): LoRAModel['type'] {
        const lowerTags = tags.map(t => t.toLowerCase());
        const lowerName = name.toLowerCase();
        
        if (lowerTags.includes('character') || 
            lowerTags.includes('person') ||
            lowerName.includes('character') ||
            lowerName.includes('person')) {
            return 'character';
        }
        
        if (lowerTags.includes('style') || 
            lowerTags.includes('art style') ||
            lowerName.includes('style')) {
            return 'style';
        }
        
        if (lowerTags.includes('clothing') || 
            lowerTags.includes('outfit') ||
            lowerTags.includes('costume')) {
            return 'clothing';
        }
        
        if (lowerTags.includes('pose') || 
            lowerTags.includes('action')) {
            return 'pose';
        }
        
        if (lowerTags.includes('background') || 
            lowerTags.includes('environment')) {
            return 'background';
        }
        
        if (lowerTags.includes('effect') || 
            lowerTags.includes('lighting')) {
            return 'effect';
        }
        
        return 'concept';
    }
    
    /**
     * Map Civitai base model to our format
     */
    private mapBaseModel(civitaiBase: string): LoRAModel['baseModel'] {
        const lower = civitaiBase?.toLowerCase() || '';
        
        if (lower.includes('flux')) return 'flux';
        if (lower.includes('pony')) return 'pony';
        if (lower.includes('sd 3') || lower.includes('sd3')) return 'sd3';
        if (lower.includes('sdxl') || lower.includes('xl')) return 'sdxl';
        return 'sd15';
    }
    
    /**
     * Extract character attributes from description
     */
    private extractCharacterAttributes(
        description: string,
        tags: string[]
    ): LoRAModel['characterAttributes'] {
        const attrs: LoRAModel['characterAttributes'] = {};
        const lower = description.toLowerCase();
        
        // Gender detection
        if (lower.includes('female') || lower.includes('woman') || lower.includes('girl')) {
            attrs.gender = 'female';
        } else if (lower.includes('male') || lower.includes('man') || lower.includes('boy')) {
            attrs.gender = 'male';
        }
        
        // Hair color
        const hairColors = ['blonde', 'brunette', 'black hair', 'red hair', 'brown hair', 
            'white hair', 'silver hair', 'pink hair', 'blue hair', 'purple hair'];
        for (const color of hairColors) {
            if (lower.includes(color)) {
                attrs.hairColor = color.replace(' hair', '');
                break;
            }
        }
        
        // Eye color
        const eyeColors = ['blue eyes', 'green eyes', 'brown eyes', 'hazel eyes', 
            'amber eyes', 'red eyes', 'purple eyes'];
        for (const color of eyeColors) {
            if (lower.includes(color)) {
                attrs.eyeColor = color.replace(' eyes', '');
                break;
            }
        }
        
        return attrs;
    }
    
    /**
     * Load built-in common trigger word patterns
     */
    private loadBuiltInTriggers(): void {
        // Common format patterns users might use
        const commonPatterns: Partial<LoRAModel>[] = [
            {
                id: 'pattern-ohwx',
                name: 'OHWX Pattern',
                triggerWords: ['ohwx', 'ohwx woman', 'ohwx man', 'ohwx person'],
                type: 'character',
                baseModel: 'flux',
                description: 'Common Dreambooth trigger pattern for FLUX'
            },
            {
                id: 'pattern-sks',
                name: 'SKS Pattern',
                triggerWords: ['sks', 'sks person', 'sks style'],
                type: 'character',
                baseModel: 'sd15',
                description: 'Common Dreambooth trigger pattern for SD1.5'
            },
            {
                id: 'pattern-zwx',
                name: 'ZWX Pattern',
                triggerWords: ['zwx', 'zwx person'],
                type: 'character',
                baseModel: 'sdxl',
                description: 'Common Dreambooth trigger pattern for SDXL'
            }
        ];
        
        for (const pattern of commonPatterns) {
            this.register({
                ...pattern,
                version: '1.0',
                trainedWords: pattern.triggerWords,
                recommendedStrength: 0.8,
                strengthRange: [0.6, 1.0],
                useCount: 0
            } as LoRAModel);
        }
    }
    
    /**
     * Record LoRA usage (for sorting by popularity)
     */
    recordUsage(loraId: string): void {
        const lora = this.localRegistry.get(loraId);
        if (lora) {
            lora.useCount++;
            lora.lastUsed = new Date();
        }
    }
    
    /**
     * Import LoRA from file path (extracts trigger from filename patterns)
     */
    importFromPath(
        filePath: string, 
        options?: { 
            type?: LoRAModel['type'];
            baseModel?: LoRAModel['baseModel'];
        }
    ): LoRAModel {
        const fileName = filePath.split('/').pop() || filePath;
        const baseName = fileName.replace(/\.(safetensors|ckpt|pt)$/i, '');
        
        // Try to extract trigger word from common naming patterns
        // e.g., "character_name_v1.0" or "my_lora-trigger_word"
        const triggerWord = baseName
            .replace(/_v?\d+(\.\d+)?$/i, '') // Remove version
            .replace(/[-_]/g, ' ')
            .trim();
        
        const lora: LoRAModel = {
            id: `local-${baseName}`,
            name: baseName,
            version: '1.0',
            triggerWords: [triggerWord],
            activationText: triggerWord,
            type: options?.type || 'concept',
            baseModel: options?.baseModel || 'sdxl',
            recommendedStrength: 0.7,
            strengthRange: [0.5, 1.0],
            useCount: 0
        };
        
        this.register(lora);
        return lora;
    }
    
    /**
     * Bulk import LoRAs from directory
     */
    async bulkImportFromDirectory(
        dirPath: string,
        options?: { baseModel?: LoRAModel['baseModel'] }
    ): Promise<LoRAModel[]> {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const imported: LoRAModel[] = [];
        
        try {
            const files = await fs.readdir(dirPath);
            
            for (const file of files) {
                if (file.match(/\.(safetensors|ckpt|pt)$/i)) {
                    const lora = this.importFromPath(
                        path.join(dirPath, file),
                        options
                    );
                    imported.push(lora);
                }
            }
        } catch (error) {
            console.error('Failed to import LoRAs from directory:', error);
        }
        
        return imported;
    }
}

// Export singleton instance
export const loraRegistry = new LoRARegistry();
