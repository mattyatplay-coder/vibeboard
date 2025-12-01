export interface PromptComponents {
    basePrompt: string;
    shotType?: string | null;
    cameraAngle?: string | null;
    lighting?: string | null;
    location?: string | null;
    style?: string | null;
    keywords?: string[];
}

export class PromptBuilder {
    static build(components: PromptComponents): string {
        const parts: string[] = [];

        // 1. Style Prefix (optional, but sets the tone)
        if (components.style) {
            parts.push(`${components.style} style`);
        }

        // 2. Shot Type & Camera Angle
        const cameraParts = [];
        if (components.shotType) cameraParts.push(components.shotType);
        if (components.cameraAngle) cameraParts.push(components.cameraAngle);

        if (cameraParts.length > 0) {
            parts.push(`${cameraParts.join(", ")} shot of`);
        }

        // 3. Base Prompt (The core subject)
        parts.push(components.basePrompt);

        // 4. Location/Setting
        if (components.location) {
            parts.push(`in ${components.location}`);
        }

        // 5. Lighting & Atmosphere
        if (components.lighting) {
            parts.push(`${components.lighting} lighting`);
        }

        // 6. Additional Keywords/Quality Boosters
        if (components.keywords && components.keywords.length > 0) {
            parts.push(components.keywords.join(", "));
        }

        // 7. Default Quality Boosters (if not present)
        const qualityBoosters = ["highly detailed", "8k", "cinematic composition", "masterpiece"];
        parts.push(...qualityBoosters);

        return parts.join(", ");
    }

    static buildNegative(negativePrompt?: string): string {
        const defaults = ["blurry", "low quality", "distorted", "watermark", "text", "bad anatomy"];
        if (negativePrompt) {
            return `${negativePrompt}, ${defaults.join(", ")}`;
        }
        return defaults.join(", ");
    }
}
