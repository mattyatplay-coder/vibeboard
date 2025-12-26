/**
 * ScriptAnalyzer - Analyzes scripts to extract voice, style, and storytelling patterns
 *
 * Uses LLM to:
 * - Extract character traits and archetypes
 * - Identify dialogue patterns and voice
 * - Map emotional beats and pacing
 * - Learn genre conventions from examples
 * - Generate prompts that match the analyzed style
 */

import { LLMService } from '../LLMService';
import {
    PIXAR_STORYTELLING_RULES,
    GENRE_GUIDES,
    DIRECTOR_STYLES,
    CINEMATOGRAPHER_STYLES,
    getGenreGuide,
    getDirectorStyle,
    buildStylePrefix,
    getPixarRulesForSituation
} from './GenreStyleGuide';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface ScriptAnalysis {
    title: string;
    genre: string;
    subGenres: string[];
    analyzedAt: string;

    // Voice & Tone
    narrativeVoice: {
        perspective: string;  // First person, third limited, omniscient
        tone: string[];       // Whimsical, dark, hopeful, etc.
        pacing: string;       // Fast, slow, varied
        dialogueStyle: string; // Witty, naturalistic, stylized, etc.
    };

    // Character Patterns
    characterPatterns: {
        archetypes: string[];
        relationshipDynamics: string[];
        growthPatterns: string[];
        dialogueQuirks: string[];
    };

    // Story Structure
    storyStructure: {
        actBreakdown: string[];
        emotionalBeats: string[];
        conflictTypes: string[];
        resolutionStyle: string;
    };

    // Visual Suggestions
    visualSuggestions: {
        colorPalette: string[];
        lightingMoods: string[];
        cameraStyles: string[];
        environmentTypes: string[];
    };

    // Signature Elements
    signatureElements: {
        recurringThemes: string[];
        symbolism: string[];
        catchphrases: string[];
        visualMotifs: string[];
    };

    // Prompt Templates
    promptTemplates: {
        characterIntro: string;
        actionSequence: string;
        emotionalMoment: string;
        comedyBeat: string;
        climax: string;
    };

    // Raw excerpts for reference
    sampleExcerpts: string[];
}

export interface StoryGenerationRequest {
    concept: string;
    targetGenre: string;
    scriptStyleReference?: string;  // Script title to match style
    directorStyle?: string;
    cinematographerStyle?: string;
    targetLength: 'short' | 'medium' | 'feature';
    includePixarRules?: boolean;
    customConstraints?: string[];
}

export interface GeneratedStoryOutline {
    title: string;
    logline: string;
    genre: string;
    styleInfluences: string[];
    acts: ActOutline[];
    characters: CharacterOutline[];
    visualGuide: VisualGuide;
    pixarRulesApplied: string[];
}

export interface ActOutline {
    actNumber: number;
    title: string;
    emotionalTone: string;
    scenes: SceneOutline[];
}

export interface SceneOutline {
    sceneNumber: number;
    location: string;
    timeOfDay: string;
    description: string;
    emotionalBeat: string;
    characters: string[];
    visualStyle: string;
}

export interface CharacterOutline {
    name: string;
    archetype: string;
    description: string;
    arc: string;
    relationships: string[];
    visualDescription: string;
    dialogueStyle: string;
}

export interface VisualGuide {
    overallStyle: string;
    colorPalette: string[];
    lightingApproach: string;
    cameraStyle: string;
    promptPrefix: string;
    negativePrompt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCRIPT LIBRARY PATHS
// ═══════════════════════════════════════════════════════════════════════════

const SCRIPT_LIBRARY_BASE = '/Volumes/Samsung.SSD.990.PRO.2TB/vibeboard backup/Script Library';
const ANALYSIS_CACHE_PATH = '/Volumes/Samsung.SSD.990.PRO.2TB/vibeboard backup/Script Library/_analyses';

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class ScriptAnalyzer {
    private llmService: LLMService;
    private analysisCache: Map<string, ScriptAnalysis> = new Map();
    private matureContent: boolean;

    /**
     * @param matureContent - When true, uses Dolphin (uncensored) for mature/NSFW content.
     *                        When false (default), uses Claude for family-friendly content.
     */
    constructor(matureContent: boolean = false) {
        this.matureContent = matureContent;

        // Claude for family-friendly, Dolphin for mature content
        const provider = matureContent ? 'dolphin' : 'claude';
        this.llmService = new LLMService(provider);

        console.log(`[ScriptAnalyzer] Initialized with ${provider} (matureContent: ${matureContent})`);
        this.loadCachedAnalyses();
    }

    /**
     * Create a new instance with different content mode
     */
    static withMatureContent(mature: boolean): ScriptAnalyzer {
        return new ScriptAnalyzer(mature);
    }

    /**
     * Load previously cached script analyses
     */
    private loadCachedAnalyses(): void {
        try {
            if (fs.existsSync(ANALYSIS_CACHE_PATH)) {
                const files = fs.readdirSync(ANALYSIS_CACHE_PATH);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const content = fs.readFileSync(path.join(ANALYSIS_CACHE_PATH, file), 'utf-8');
                        const analysis = JSON.parse(content) as ScriptAnalysis;
                        this.analysisCache.set(analysis.title.toLowerCase(), analysis);
                    }
                }
                const provider = this.matureContent ? 'Dolphin' : 'Claude';
                console.log(`[ScriptAnalyzer] Loaded ${this.analysisCache.size} cached analyses (using ${provider})`);
            }
        } catch (error) {
            console.warn('[ScriptAnalyzer] Failed to load cached analyses:', error);
        }
    }

    /**
     * Save analysis to cache
     */
    private saveAnalysisToCache(analysis: ScriptAnalysis): void {
        try {
            if (!fs.existsSync(ANALYSIS_CACHE_PATH)) {
                fs.mkdirSync(ANALYSIS_CACHE_PATH, { recursive: true });
            }
            const filename = analysis.title.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.json';
            fs.writeFileSync(
                path.join(ANALYSIS_CACHE_PATH, filename),
                JSON.stringify(analysis, null, 2)
            );
            this.analysisCache.set(analysis.title.toLowerCase(), analysis);
            console.log(`[ScriptAnalyzer] Saved analysis for "${analysis.title}"`);
        } catch (error) {
            console.error('[ScriptAnalyzer] Failed to save analysis:', error);
        }
    }

    /**
     * Get cached analysis or return undefined
     */
    getAnalysis(title: string): ScriptAnalysis | undefined {
        return this.analysisCache.get(title.toLowerCase());
    }

    /**
     * List all available scripts in the library
     */
    async listAvailableScripts(): Promise<{ genre: string; scripts: string[] }[]> {
        const results: { genre: string; scripts: string[] }[] = [];

        try {
            const genres = fs.readdirSync(SCRIPT_LIBRARY_BASE);
            for (const genre of genres) {
                if (genre.startsWith('_') || genre.startsWith('.')) continue;

                const genrePath = path.join(SCRIPT_LIBRARY_BASE, genre);
                if (fs.statSync(genrePath).isDirectory()) {
                    const scripts = fs.readdirSync(genrePath)
                        .filter(f => !f.startsWith('.') && (f.endsWith('.pdf') || f.endsWith('.txt') || f.endsWith('.rtf')));
                    if (scripts.length > 0) {
                        results.push({ genre, scripts });
                    }
                }
            }
        } catch (error) {
            console.error('[ScriptAnalyzer] Failed to list scripts:', error);
        }

        return results;
    }

    /**
     * Analyze a script to extract voice, style, and patterns
     * Note: For PDFs, content needs to be extracted first
     */
    async analyzeScript(
        scriptContent: string,
        title: string,
        genre: string
    ): Promise<ScriptAnalysis> {
        console.log(`[ScriptAnalyzer] Analyzing script: ${title}`);

        // Check cache first
        const cached = this.getAnalysis(title);
        if (cached) {
            console.log(`[ScriptAnalyzer] Returning cached analysis for "${title}"`);
            return cached;
        }

        // Truncate content if too long (keep beginning, middle sample, and end)
        const maxLength = 30000;
        let analysisContent = scriptContent;
        if (scriptContent.length > maxLength) {
            const third = Math.floor(maxLength / 3);
            const start = scriptContent.slice(0, third);
            const middle = scriptContent.slice(
                Math.floor(scriptContent.length / 2) - third / 2,
                Math.floor(scriptContent.length / 2) + third / 2
            );
            const end = scriptContent.slice(-third);
            analysisContent = `[START OF SCRIPT]\n${start}\n\n[MIDDLE OF SCRIPT]\n${middle}\n\n[END OF SCRIPT]\n${end}`;
        }

        const systemPrompt = `You are an expert screenplay analyst and story consultant. Analyze the provided script excerpt and extract detailed patterns about its storytelling voice, style, character archetypes, and visual suggestions.

Return your analysis as a JSON object with this structure:
{
    "narrativeVoice": {
        "perspective": "string describing POV approach",
        "tone": ["array", "of", "tone", "descriptors"],
        "pacing": "description of pacing",
        "dialogueStyle": "description of dialogue approach"
    },
    "characterPatterns": {
        "archetypes": ["character archetypes present"],
        "relationshipDynamics": ["how characters relate"],
        "growthPatterns": ["how characters change"],
        "dialogueQuirks": ["distinctive speech patterns"]
    },
    "storyStructure": {
        "actBreakdown": ["brief description of each act's focus"],
        "emotionalBeats": ["key emotional moments"],
        "conflictTypes": ["types of conflict used"],
        "resolutionStyle": "how conflicts resolve"
    },
    "visualSuggestions": {
        "colorPalette": ["suggested colors for this style"],
        "lightingMoods": ["lighting approaches"],
        "cameraStyles": ["camera work suggestions"],
        "environmentTypes": ["typical environments"]
    },
    "signatureElements": {
        "recurringThemes": ["themes that repeat"],
        "symbolism": ["symbols used"],
        "catchphrases": ["memorable lines or patterns"],
        "visualMotifs": ["repeating visual elements"]
    },
    "promptTemplates": {
        "characterIntro": "template for introducing characters in this style",
        "actionSequence": "template for action scenes",
        "emotionalMoment": "template for emotional beats",
        "comedyBeat": "template for comedy if applicable",
        "climax": "template for climactic moments"
    },
    "sampleExcerpts": ["3-5 short representative excerpts from the script"]
}`;

        const response = await this.llmService.generate({
            prompt: `Analyze this ${genre} screenplay titled "${title}":\n\n${analysisContent}`,
            systemPrompt,
            temperature: 0.3,
            maxTokens: 4000
        });

        try {
            let jsonStr = response.content;
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            }

            const parsed = JSON.parse(jsonStr.trim());

            const analysis: ScriptAnalysis = {
                title,
                genre,
                subGenres: [], // Could be extracted from filename patterns
                analyzedAt: new Date().toISOString(),
                ...parsed
            };

            // Save to cache
            this.saveAnalysisToCache(analysis);

            return analysis;
        } catch (error) {
            console.error('[ScriptAnalyzer] Failed to parse analysis:', error);
            throw new Error('Failed to analyze script');
        }
    }

    /**
     * Generate a story outline using learned patterns
     */
    async generateStoryOutline(request: StoryGenerationRequest): Promise<GeneratedStoryOutline> {
        console.log(`[ScriptAnalyzer] Generating story outline for: ${request.concept}`);

        // Gather style influences
        const styleContext: string[] = [];
        let scriptAnalysis: ScriptAnalysis | undefined;

        // Get script style reference if provided
        if (request.scriptStyleReference) {
            scriptAnalysis = this.getAnalysis(request.scriptStyleReference);
            if (scriptAnalysis) {
                styleContext.push(`\nSTYLE REFERENCE FROM "${scriptAnalysis.title}":`);
                styleContext.push(`Tone: ${scriptAnalysis.narrativeVoice.tone.join(', ')}`);
                styleContext.push(`Dialogue Style: ${scriptAnalysis.narrativeVoice.dialogueStyle}`);
                styleContext.push(`Pacing: ${scriptAnalysis.narrativeVoice.pacing}`);
                styleContext.push(`Character Archetypes: ${scriptAnalysis.characterPatterns.archetypes.join(', ')}`);
                styleContext.push(`Themes: ${scriptAnalysis.signatureElements.recurringThemes.join(', ')}`);
            }
        }

        // Get genre guide
        const genreGuide = getGenreGuide(request.targetGenre);
        if (genreGuide) {
            styleContext.push(`\nGENRE CONVENTIONS (${request.targetGenre}):`);
            styleContext.push(`Storytelling: ${genreGuide.storytellingConventions.slice(0, 3).join(', ')}`);
            styleContext.push(`Visual Tropes: ${genreGuide.visualTropes.slice(0, 3).join(', ')}`);
            styleContext.push(`Archetypes: ${genreGuide.archetypes.join(', ')}`);
        }

        // Get director style
        let directorStyle;
        if (request.directorStyle) {
            directorStyle = getDirectorStyle(request.directorStyle);
            if (directorStyle) {
                styleContext.push(`\nDIRECTOR STYLE (${directorStyle.name}):`);
                styleContext.push(`Visual Signature: ${directorStyle.visualSignature.slice(0, 3).join(', ')}`);
                styleContext.push(`Color Palette: ${directorStyle.colorPalette.slice(0, 5).join(', ')}`);
                styleContext.push(`Mood: ${directorStyle.moodKeywords.join(', ')}`);
            }
        }

        // Build Pixar rules context if requested
        let pixarContext = '';
        const appliedRules: string[] = [];
        if (request.includePixarRules !== false) {
            const relevantRules = getPixarRulesForSituation(request.concept);
            pixarContext = `\nPIXAR STORYTELLING RULES TO APPLY:`;
            for (const rule of relevantRules.slice(0, 5)) {
                pixarContext += `\n- Rule ${rule.rule}: ${rule.title} - ${rule.description}`;
                appliedRules.push(`Rule ${rule.rule}: ${rule.title}`);
            }
        }

        // Determine structure based on length
        const lengthGuidance = {
            'short': '3 acts, 5-10 scenes total, ~10-15 minutes runtime',
            'medium': '3 acts, 15-25 scenes total, ~30-45 minutes runtime',
            'feature': '3 acts, 40-60 scenes total, ~90-120 minutes runtime'
        }[request.targetLength];

        const systemPrompt = `You are a master storyteller combining the craft of Pixar with classic Hollywood structure.
Generate a detailed story outline that:
1. Has a clear emotional through-line
2. Features memorable, flawed characters
3. Follows genre conventions while subverting expectations
4. Includes visual storytelling elements

${styleContext.join('\n')}
${pixarContext}

${request.customConstraints ? `\nADDITIONAL CONSTRAINTS:\n${request.customConstraints.join('\n')}` : ''}

Return a JSON object with this structure:
{
    "title": "Creative title",
    "logline": "One sentence pitch",
    "acts": [
        {
            "actNumber": 1,
            "title": "Act title",
            "emotionalTone": "Primary emotion",
            "scenes": [
                {
                    "sceneNumber": 1,
                    "location": "INT/EXT. LOCATION",
                    "timeOfDay": "DAY/NIGHT/etc",
                    "description": "What happens",
                    "emotionalBeat": "Emotional function",
                    "characters": ["Character names"],
                    "visualStyle": "Visual approach for this scene"
                }
            ]
        }
    ],
    "characters": [
        {
            "name": "Character Name",
            "archetype": "Their archetype",
            "description": "Physical/personality description",
            "arc": "Their journey",
            "relationships": ["Relationship descriptions"],
            "visualDescription": "How to depict them visually",
            "dialogueStyle": "How they speak"
        }
    ],
    "visualGuide": {
        "overallStyle": "Visual approach",
        "colorPalette": ["Colors to use"],
        "lightingApproach": "How to light",
        "cameraStyle": "Camera work description",
        "promptPrefix": "Prefix for all prompts",
        "negativePrompt": "What to avoid"
    }
}`;

        const response = await this.llmService.generate({
            prompt: `Create a ${request.targetLength} ${request.targetGenre} story outline for this concept:\n\n"${request.concept}"\n\nTarget structure: ${lengthGuidance}`,
            systemPrompt,
            temperature: 0.8,
            maxTokens: 8000
        });

        try {
            let jsonStr = response.content;
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            }

            const parsed = JSON.parse(jsonStr.trim());

            // Build style prefix from all influences
            const styleInfluences: string[] = [];
            if (scriptAnalysis) styleInfluences.push(scriptAnalysis.title);
            if (directorStyle) styleInfluences.push(directorStyle.name);
            if (genreGuide) styleInfluences.push(genreGuide.genre);

            // Enhance visual guide with director/cinematographer styles
            if (parsed.visualGuide) {
                const stylePrefix = buildStylePrefix(
                    request.targetGenre,
                    request.directorStyle,
                    request.cinematographerStyle
                );
                parsed.visualGuide.promptPrefix = stylePrefix + ' ' + (parsed.visualGuide.promptPrefix || '');
            }

            const outline: GeneratedStoryOutline = {
                genre: request.targetGenre,
                styleInfluences,
                pixarRulesApplied: appliedRules,
                ...parsed
            };

            return outline;
        } catch (error) {
            console.error('[ScriptAnalyzer] Failed to parse outline:', error);
            throw new Error('Failed to generate story outline');
        }
    }

    /**
     * Generate prompts for a scene in the style of an analyzed script
     */
    async generateScenePrompts(
        scene: SceneOutline,
        visualGuide: VisualGuide,
        scriptStyle?: string
    ): Promise<{
        firstFramePrompt: string;
        lastFramePrompt: string;
        videoPrompt: string;
        negativePrompt: string;
    }> {
        let styleContext = '';
        if (scriptStyle) {
            const analysis = this.getAnalysis(scriptStyle);
            if (analysis?.promptTemplates) {
                styleContext = `\nMatch the visual style from "${analysis.title}":
- Colors: ${analysis.visualSuggestions.colorPalette.join(', ')}
- Lighting: ${analysis.visualSuggestions.lightingMoods.join(', ')}
- Camera: ${analysis.visualSuggestions.cameraStyles.join(', ')}`;
            }
        }

        const systemPrompt = `You are a storyboard artist creating detailed prompts for AI image and video generation.

For this scene, create:
1. FIRST FRAME: The opening moment of the scene
2. LAST FRAME: The closing moment of the scene
3. VIDEO PROMPT: The motion/action between frames

Visual Style Guide:
${visualGuide.overallStyle}
Colors: ${visualGuide.colorPalette.join(', ')}
Lighting: ${visualGuide.lightingApproach}
Camera: ${visualGuide.cameraStyle}
${styleContext}

Return JSON:
{
    "firstFramePrompt": "detailed image prompt for opening",
    "lastFramePrompt": "detailed image prompt for closing",
    "videoPrompt": "motion description for video generation"
}`;

        const response = await this.llmService.generate({
            prompt: `Generate prompts for this scene:
Location: ${scene.location} - ${scene.timeOfDay}
Description: ${scene.description}
Emotional Beat: ${scene.emotionalBeat}
Characters: ${scene.characters.join(', ')}
Visual Style: ${scene.visualStyle}`,
            systemPrompt,
            temperature: 0.7,
            maxTokens: 2000
        });

        try {
            let jsonStr = response.content;
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            }

            const parsed = JSON.parse(jsonStr.trim());

            // Prepend style prefix
            const prefix = visualGuide.promptPrefix || '';

            return {
                firstFramePrompt: `${prefix} ${parsed.firstFramePrompt}`.trim(),
                lastFramePrompt: `${prefix} ${parsed.lastFramePrompt}`.trim(),
                videoPrompt: `${prefix} ${parsed.videoPrompt}`.trim(),
                negativePrompt: visualGuide.negativePrompt || 'low quality, blurry, distorted'
            };
        } catch (error) {
            console.error('[ScriptAnalyzer] Failed to generate scene prompts:', error);
            throw new Error('Failed to generate scene prompts');
        }
    }

    /**
     * Get all cached analyses
     */
    getAllAnalyses(): ScriptAnalysis[] {
        return Array.from(this.analysisCache.values());
    }

    /**
     * Get visual style recommendation based on genre and preferences
     */
    getVisualStyleRecommendation(genre: string): {
        directors: string[];
        cinematographers: string[];
        colorPalette: string[];
        promptPrefix: string;
    } {
        const genreGuide = getGenreGuide(genre);
        if (!genreGuide) {
            return {
                directors: [],
                cinematographers: [],
                colorPalette: [],
                promptPrefix: ''
            };
        }

        const directors = genreGuide.suggestedDirectors.map(d => {
            const style = getDirectorStyle(d);
            return style?.name || d;
        });

        const cinematographers = genreGuide.suggestedCinematographers.map(c => {
            const style = CINEMATOGRAPHER_STYLES[c];
            return style?.name || c;
        });

        return {
            directors,
            cinematographers,
            colorPalette: genreGuide.colorPalette,
            promptPrefix: genreGuide.promptPrefix
        };
    }
}

// Singleton instances (one for each content mode)
let familyFriendlyInstance: ScriptAnalyzer | null = null;
let matureContentInstance: ScriptAnalyzer | null = null;

/**
 * Get ScriptAnalyzer instance
 * @param matureContent - When true, returns instance using Dolphin (uncensored).
 *                        When false (default), returns instance using Claude.
 */
export function getScriptAnalyzer(matureContent: boolean = false): ScriptAnalyzer {
    if (matureContent) {
        if (!matureContentInstance) {
            matureContentInstance = new ScriptAnalyzer(true);
        }
        return matureContentInstance;
    } else {
        if (!familyFriendlyInstance) {
            familyFriendlyInstance = new ScriptAnalyzer(false);
        }
        return familyFriendlyInstance;
    }
}

export default ScriptAnalyzer;
