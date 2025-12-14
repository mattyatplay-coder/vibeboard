import { LoRA } from '../types/promptWizardTypes';

interface PromptAnalysis {
    hasCharacter: boolean;
    characterType: string[];
    style: string[];
    subject: string[];
}

interface ExtendedLoRA extends LoRA {
    category: 'character' | 'style' | 'concept' | 'effect';
    keywords: string[]; // What this LoRA is trained on
    weight: number;
}

export function intelligentLoRAApplication(
    prompt: string,
    availableLoRAs: ExtendedLoRA[]
): {
    applicableLoRAs: ExtendedLoRA[];
    enhancedPrompt: string;
} {
    // 1. Analyze prompt to understand what user wants
    const promptAnalysis = analyzePrompt(prompt);

    // 2. Find relevant LoRAs
    const applicableLoRAs = availableLoRAs.filter(lora =>
        isLoRARelevant(lora, promptAnalysis)
    );

    // 3. Build enhanced prompt with correct trigger words
    let enhancedPrompt = prompt;

    for (const lora of applicableLoRAs) {
        // Only apply if trigger word not already present
        if (!prompt.includes(lora.triggerWord)) {
            enhancedPrompt = insertTriggerWord(
                enhancedPrompt,
                lora.triggerWord,
                lora.category
            );
        }
    }

    return { applicableLoRAs, enhancedPrompt };
}

function analyzePrompt(prompt: string): PromptAnalysis {
    const lowerPrompt = prompt.toLowerCase();

    return {
        hasCharacter: /person|man|woman|character|face/.test(lowerPrompt),
        characterType: extractCharacterType(lowerPrompt),
        style: extractStyle(lowerPrompt),
        subject: extractSubject(lowerPrompt),
    };
}

function extractCharacterType(prompt: string): string[] {
    const types = ['man', 'woman', 'boy', 'girl', 'cyborg', 'robot', 'alien', 'turtle'];
    return types.filter(t => prompt.includes(t));
}

function extractStyle(prompt: string): string[] {
    const styles = ['anime', 'realistic', '3d', 'pixar', 'cinematic', 'painting', 'sketch'];
    return styles.filter(s => prompt.includes(s));
}

function extractSubject(prompt: string): string[] {
    // Simplified subject extraction
    return prompt.split(' ').filter(w => w.length > 3);
}

function isLoRARelevant(lora: ExtendedLoRA, analysis: PromptAnalysis): boolean {
    // Category-specific relevance checks
    switch (lora.category) {
        case 'character':
            // Only apply character LoRAs if prompt has a character
            // AND the character matches the LoRA's trained character
            return analysis.hasCharacter &&
                lora.keywords.some(kw =>
                    analysis.characterType.includes(kw)
                );

        case 'style':
            // Apply style LoRAs if style matches
            return lora.keywords.some(kw =>
                analysis.style.includes(kw)
            );

        case 'concept':
            // Apply concept LoRAs if subject matches
            return lora.keywords.some(kw =>
                analysis.subject.includes(kw)
            );

        default:
            return false;
    }
}

function insertTriggerWord(
    prompt: string,
    triggerWord: string,
    category: ExtendedLoRA['category']
): string {
    // Insert trigger word at appropriate position
    switch (category) {
        case 'character':
            // Insert at beginning
            return `${triggerWord}, ${prompt}`;

        case 'style':
            // Insert before last comma or at end
            const lastComma = prompt.lastIndexOf(',');
            if (lastComma > 0) {
                return `${prompt.slice(0, lastComma)}, ${triggerWord}${prompt.slice(lastComma)}`;
            }
            return `${prompt}, ${triggerWord}`;

        default:
            return `${prompt}, ${triggerWord}`;
    }
}
