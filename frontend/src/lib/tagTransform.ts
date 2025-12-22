import { Tag } from '../types/promptWizardTypes';

export function tagsToPromptAdditions(tags: Tag[]): string[] {
  return tags.map(tag => {
    // Use promptKeyword if available, otherwise use name
    return tag.promptKeyword || tag.name.toLowerCase();
  });
}

export function tagsToPromptElements(tags: Tag[]): {
  camera: string[];
  lighting: string[];
  mood: string[];
  style: string[];
  other: string[];
} {
  const elements = {
    camera: [] as string[],
    lighting: [] as string[],
    mood: [] as string[],
    style: [] as string[],
    other: [] as string[],
  };

  tags.forEach(tag => {
    const text = tag.promptKeyword || tag.name.toLowerCase();
    switch (tag.category) {
      case 'shots':
      case 'camera':
        elements.camera.push(text);
        break;
      case 'lighting':
        elements.lighting.push(text);
        break;
      case 'mood':
        elements.mood.push(text);
        break;
      case 'style':
        elements.style.push(text);
        break;
      default:
        elements.other.push(text);
    }
  });

  return elements;
}
