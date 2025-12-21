import { Tag } from '../types/promptWizardTypes';

export type SceneType = 'action' | 'portrait' | 'landscape' | 'static' | 'general';

export function inferSceneType(tags: Tag[], prompt: string): SceneType {
    const lowerPrompt = prompt.toLowerCase();

    // Check for action/motion
    const hasActionTags = tags.some(t => t.category === 'energy' || t.category === 'shots');
    const actionKeywords = ['run', 'walk', 'dance', 'fight', 'chase', 'flying', 'moving', 'fast'];
    if (hasActionTags || actionKeywords.some(kw => lowerPrompt.includes(kw))) {
        return 'action';
    }

    // Check for portrait/character
    const characterKeywords = ['portrait', 'face', 'person', 'man', 'woman', 'close up', 'closeup'];
    if (characterKeywords.some(kw => lowerPrompt.includes(kw))) {
        return 'portrait';
    }

    // Check for landscape/environment
    const landscapeKeywords = ['landscape', 'scenery', 'mountain', 'ocean', 'city', 'forest', 'sky', 'wide shot'];
    if (landscapeKeywords.some(kw => lowerPrompt.includes(kw))) {
        return 'landscape';
    }

    // Check for static
    const staticKeywords = ['still', 'static', 'painting', 'photo', 'image'];
    if (staticKeywords.some(kw => lowerPrompt.includes(kw))) {
        return 'static';
    }

    return 'general';
}
