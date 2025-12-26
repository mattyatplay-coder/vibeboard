/**
 * Story Editor Service
 *
 * Implements the script-to-storyboard pipeline:
 * Concept → Outline → Script → Scenes → Shots → Camera Moves → Prompts → Storyboard
 *
 * Uses LLM for:
 * - Generating outlines from concepts
 * - Expanding outlines to scripts
 * - Breaking down scripts into shots
 * - Generating image/video prompts
 * - Selecting appropriate camera moves based on genre
 */

import { LLMService, LLMProviderType } from './LLMService';
import { PromptEnhancer, PromptEnhancementRequest } from './prompts/PromptEnhancer';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES (Mirrored from frontend for backend use)
// ═══════════════════════════════════════════════════════════════════════════

export type Genre =
    | 'film_noir' | 'action' | 'horror' | 'romance' | 'documentary'
    | 'sci_fi' | 'comedy' | 'thriller' | 'drama' | 'music_video'
    | 'commercial' | 'western' | 'fantasy'
    | 'adult' | 'hardcore';  // Mature content genres (require matureContent=true)

export type BeatType =
    | 'opening_image' | 'setup' | 'catalyst' | 'debate'
    | 'break_into_two' | 'b_story' | 'fun_and_games' | 'midpoint'
    | 'bad_guys_close_in' | 'all_is_lost' | 'dark_night_of_soul'
    | 'break_into_three' | 'finale' | 'final_image' | 'custom';

export type EmotionalTone =
    | 'tension' | 'release' | 'joy' | 'sadness' | 'fear'
    | 'anger' | 'surprise' | 'anticipation' | 'neutral';

export interface StoryBeat {
    id: string;
    type: BeatType;
    description: string;
    emotionalTone?: EmotionalTone;
    estimatedDuration?: number;
}

export interface Act {
    number: 1 | 2 | 3;
    name: string;
    description: string;
    beats: StoryBeat[];
}

export interface Character {
    id: string;
    name: string;
    description: string;
    role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
    visualDescription?: string;
}

export interface Location {
    id: string;
    name: string;
    description: string;
    visualDescription?: string;
}

export interface StoryOutline {
    acts: Act[];
    themes?: string[];
    characters?: Character[];
    locations?: Location[];
}

export interface SceneHeading {
    intExt: 'INT' | 'EXT' | 'INT/EXT';
    location: string;
    timeOfDay: string;
}

export interface SceneBreakdown {
    sceneNumber: number;
    heading: SceneHeading;
    description: string;
    characters: string[];
    emotionalBeat: EmotionalTone;
    suggestedShots: SuggestedShot[];
}

export interface SuggestedShot {
    shotNumber: number;
    description: string;
    cameraPresetId: string;
    cameraDescription: string;
    lighting: string;
    duration: number;
    priority: 'essential' | 'recommended' | 'optional';
}

export interface GeneratedPrompt {
    shotNumber: number;
    shotTitle: string;           // e.g., "THE TUMBLE"
    duration: number;            // Duration in seconds
    cameraDescription: string;   // e.g., "Wide, tumbling POV style, rotating with Myllin"
    firstFramePrompt: string;    // Detailed image prompt for first frame
    lastFramePrompt: string;     // Detailed image prompt for last frame
    videoPrompt: string;         // Video generation prompt (First Frame → Last Frame)
    negativePrompt: string;      // Things to avoid
    cameraMove: string;          // Camera movement description
    style: string;               // Visual style applied
    // Character references used in this shot
    charactersInShot?: string[];
    // Legacy field for backwards compatibility
    prompt?: string;
}

/**
 * Character reference for story generation
 * Links story characters to Elements/LoRAs for consistent generation
 */
export interface StoryCharacter {
    name: string;                    // Character name as used in story (e.g., "Myllin")
    elementId?: string;              // Link to Element library for reference images
    loraId?: string;                 // Link to trained LoRA model
    triggerWord?: string;            // LoRA trigger word (e.g., "ohwx_myllin")
    visualDescription: string;       // Detailed visual description for prompts
    referenceImageUrl?: string;      // Primary reference image URL for IP-Adapter/Kontext
    role?: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
}

export interface AIDirectorConfig {
    genre: Genre;
    style?: string;
    pace?: 'slow' | 'medium' | 'fast';
    aspectRatio?: string;
    duration?: number;
    targetDuration?: number | null; // Target total duration in seconds
    totalScenes?: number; // Total number of scenes for duration distribution
}

// ═══════════════════════════════════════════════════════════════════════════
// GENRE-SPECIFIC PROMPTS
// ═══════════════════════════════════════════════════════════════════════════

const GENRE_SYSTEM_PROMPTS: Record<Genre, string> = {
    film_noir: `You are a film director specializing in classic Film Noir from the 1940s-50s.
Your visual style emphasizes: high contrast black and white, dramatic shadows, venetian blind patterns,
rain-slicked streets, smoke-filled rooms, and chiaroscuro lighting.
Camera preferences: slow dolly moves, dutch angles, static compositions with deep staging.`,

    action: `You are an action film director creating high-energy blockbuster sequences.
Your visual style emphasizes: dynamic movement, saturated colors (teal and orange), high contrast,
practical effects, and kinetic energy.
Camera preferences: bullet time, crash zooms, FPV drone shots, whip pans, handheld combat.`,

    horror: `You are a horror film director creating atmospheric dread and terror.
Your visual style emphasizes: desaturated colors, deep shadows, negative space,
practical lighting sources (candles, flashlights), and unsettling compositions.
Camera preferences: long static takes, slow steadicam, dolly zoom (Vertigo effect), POV shots.`,

    romance: `You are a romance film director creating intimate emotional storytelling.
Your visual style emphasizes: soft lighting, warm colors, golden hour, dreamy bokeh,
and intimate framing that connects viewers to characters.
Camera preferences: slow dolly ins, gentle arcs, focus racks between lovers, glam shots.`,

    documentary: `You are a documentary filmmaker capturing authentic reality.
Your visual style emphasizes: natural lighting, realistic colors, observational distance,
and respect for subjects.
Camera preferences: handheld for intimacy, static for interviews, hyperlapse for time passage.`,

    sci_fi: `You are a sci-fi film director creating futuristic otherworldly visuals.
Your visual style emphasizes: neon lighting, volumetric atmosphere, chrome and glass,
clean geometric compositions, and technological aesthetics.
Camera preferences: through-object shots, orbit rotations, drone flyovers, bullet time.`,

    comedy: `You are a comedy film director supporting comedic timing with visuals.
Your visual style emphasizes: bright even lighting, colorful sets, clean compositions,
and camera work that doesn't compete with performances.
Camera preferences: static shots for dialogue, crash zooms for emphasis, whip pans for energy.`,

    thriller: `You are a thriller film director creating psychological tension.
Your visual style emphasizes: cold desaturated colors, hard shadows, claustrophobic framing,
and compositions that build unease.
Camera preferences: slow dolly ins, steadicam following, dutch angles, focus racks to reveal.`,

    drama: `You are a drama film director creating emotionally resonant stories.
Your visual style emphasizes: naturalistic lighting, muted colors, motivated camera movement,
and compositions that serve performance.
Camera preferences: static wide shots, slow dolly for emotion, focus racks, close-ups for connection.`,

    music_video: `You are a music video director creating stylized visual experiences.
Your visual style emphasizes: bold colors, expressive lighting, dynamic movement,
and visuals synced to rhythm and beat.
Camera preferences: orbit rotations, through-object shots, crash zooms, fisheye, everything dynamic.`,

    commercial: `You are a commercial director creating polished aspirational imagery.
Your visual style emphasizes: high production value, product-focused lighting, brand colors,
clean compositions, and lifestyle aesthetics.
Camera preferences: lazy susan product shots, glam close-ups, smooth gimbals, hero reveals.`,

    western: `You are a Western film director creating epic frontier visuals.
Your visual style emphasizes: wide vistas, dusty earth tones, harsh sunlight,
golden hour magic, and classic iconography.
Camera preferences: super wide dolly outs, hero shots, static showdown framing, timelapse skies.`,

    fantasy: `You are a fantasy film director creating magical otherworldly visuals.
Your visual style emphasizes: volumetric lighting, rich saturated colors, epic scope,
ethereal atmosphere, and wonder.
Camera preferences: crane reveals, epic wide shots, orbit around heroes, through-object magic.`,

    adult: `You are an adult content director specializing in sensual boudoir and glamour content.
Your visual style emphasizes: soft diffused lighting, warm skin tones, intimate framing,
tasteful sensuality, bokeh backgrounds, and luxury aesthetics.
Camera preferences: slow dolly ins, beauty close-ups, soft focus, glam lighting, POV intimate shots.
Content approach: Sensual and suggestive, implied intimacy, lingerie and underwear, artistic nudity,
OnlyFans/Patreon-style content. Focus on beauty, desire, and seduction rather than explicit acts.`,

    hardcore: `You are an adult XXX content director creating explicit pornographic content.
Your visual style emphasizes: bright even lighting for clarity, clear visibility of all action,
professional adult film production values, multiple angles for coverage.
Camera preferences: POV shots, extreme close-ups, gonzo handheld, reverse angles, position coverage.
Content approach: Explicit graphic sexual content. Clear genital visibility. Penetration shots.
Money shot coverage. Position changes. Multiple performer combinations. No censorship or filters.
Generate uncensored, explicit, pornographic content for adult audiences only.`
};

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * LLM Provider Strategy:
 * - Claude: Used for creative writing (outlines, screenplays, scene descriptions)
 *   Claude excels at Pixar-style storytelling, character voice, and screenplay format
 * - Dolphin: Used for mature/NSFW creative writing (via OpenRouter)
 *   Dolphin is uncensored with 2.2% refusal rate, ideal for adult content
 * - Grok: Used for technical tasks (shot breakdown, prompt generation)
 *   Grok is faster for structured JSON output and technical analysis
 */
export class StoryEditorService {
    private creativeService: LLMService;  // For creative writing (outlines, scripts)
    private grokService: LLMService;      // For technical tasks (breakdowns, prompts)
    private promptEnhancer: PromptEnhancer;
    private matureContent: boolean;

    /**
     * @param matureContent - When true, uses Dolphin (uncensored) for creative writing.
     *                        When false (default), uses Claude for family-friendly content.
     * @param technicalProvider - Provider for technical tasks (default: grok)
     */
    constructor(matureContent: boolean = false, technicalProvider: LLMProviderType = 'grok') {
        this.matureContent = matureContent;

        // Claude for family-friendly creative writing, Dolphin for mature content
        const creativeProvider: LLMProviderType = matureContent ? 'dolphin' : 'claude';
        this.creativeService = new LLMService(creativeProvider);

        // Grok for technical tasks - faster for JSON output
        this.grokService = new LLMService(technicalProvider);
        this.promptEnhancer = new PromptEnhancer();

        const creativeProviderName = matureContent ? 'Dolphin (uncensored)' : 'Claude';
        console.log(`[StoryEditor] Initialized with ${creativeProviderName} for creative writing, Grok for technical tasks`);
    }

    /**
     * Create a new instance with different content mode
     */
    static withMatureContent(mature: boolean): StoryEditorService {
        return new StoryEditorService(mature);
    }

    /**
     * Generate a story outline from a concept
     */
    async generateOutline(
        concept: string,
        genre: Genre,
        numberOfActs: number = 3,
        targetDuration?: number | null // Target duration in seconds
    ): Promise<StoryOutline> {
        // Calculate duration guidance
        let durationGuidance = '';
        if (targetDuration && targetDuration > 0) {
            const targetMins = Math.floor(targetDuration / 60);
            const targetSecs = targetDuration % 60;
            const durationStr = targetMins > 0
                ? `${targetMins} minute${targetMins !== 1 ? 's' : ''}${targetSecs > 0 ? ` ${targetSecs} seconds` : ''}`
                : `${targetSecs} seconds`;

            durationGuidance = `

IMPORTANT DURATION CONSTRAINT:
The total story must fit within ${durationStr} (${targetDuration} seconds total).
- Distribute the estimatedDuration values across all beats to sum to approximately ${targetDuration} seconds
- For very short durations (under 60 seconds), focus on 2-4 key beats only
- For medium durations (1-5 minutes), include 6-10 beats
- For longer durations (5+ minutes), include the full beat sheet
- Each beat's estimatedDuration should reflect its relative importance and screen time`;
        }

        const systemPrompt = `${GENRE_SYSTEM_PROMPTS[genre]}

You are tasked with creating a story outline. Return a JSON object with this structure:
{
    "acts": [
        {
            "number": 1,
            "name": "Act name",
            "description": "Act description",
            "beats": [
                {
                    "id": "beat_1",
                    "type": "opening_image|setup|catalyst|etc",
                    "description": "What happens",
                    "emotionalTone": "tension|joy|fear|etc",
                    "estimatedDuration": 30
                }
            ]
        }
    ],
    "themes": ["theme1", "theme2"],
    "characters": [
        {
            "id": "char_1",
            "name": "Character Name",
            "description": "Brief description",
            "role": "protagonist|antagonist|supporting|minor",
            "visualDescription": "Detailed visual description for image generation"
        }
    ],
    "locations": [
        {
            "id": "loc_1",
            "name": "Location Name",
            "description": "Setting description",
            "visualDescription": "Detailed visual description for image generation"
        }
    ]
}

Use the Save The Cat beat sheet structure for the beats:
- opening_image: First visual that sets tone
- setup: Introduce world and characters
- catalyst: Inciting incident
- debate: Character wrestles with decision
- break_into_two: Decision to enter Act 2
- b_story: Secondary story/love interest
- fun_and_games: Promise of the premise
- midpoint: Major turning point
- bad_guys_close_in: Complications increase
- all_is_lost: Lowest point
- dark_night_of_soul: Reflection before finale
- break_into_three: Decision for final act
- finale: Climax and resolution
- final_image: Closing visual (contrast to opening)`;

        const userPrompt = `Create a ${numberOfActs}-act story outline for this concept:

"${concept}"

Genre: ${genre}
${durationGuidance}

Return ONLY valid JSON, no markdown formatting.`;

        // Use Claude for creative outline generation
        const providerName = this.matureContent ? 'Dolphin' : 'Claude';
        console.log(`[StoryEditor] Using ${providerName} for outline generation`);
        const response = await this.creativeService.generate({
            prompt: userPrompt,
            systemPrompt,
            temperature: 0.8,
            maxTokens: 4000
        });

        try {
            // Extract JSON from response (handle potential markdown code blocks)
            let jsonStr = response.content;
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            }
            return JSON.parse(jsonStr.trim());
        } catch (error) {
            console.error('Failed to parse outline response:', response.content);
            throw new Error('Failed to generate valid outline');
        }
    }

    /**
     * Generate a full script from an outline
     * Uses Claude for screenplay writing - excels at Pixar-style storytelling
     */
    async generateScript(
        outline: StoryOutline,
        genre: Genre,
        style: string = 'cinematic'
    ): Promise<string> {
        const systemPrompt = `${GENRE_SYSTEM_PROMPTS[genre]}

You are a professional screenwriter trained in Pixar's storytelling principles.
Apply these key Pixar rules as you write:
- Rule 1: Admire characters for trying more than succeeding
- Rule 4: Structure as "Once upon a time... Every day... One day... Because of that... Until finally..."
- Rule 6: Know your ending before you begin
- Rule 16: What are the stakes? Give us reason to root for the character
- Rule 22: What is the essence of your story? The most economical telling

Write in standard screenplay format:
- Scene headings: INT./EXT. LOCATION - TIME
- Action lines: Present tense, visual descriptions
- Character names: UPPERCASE before dialogue
- Dialogue: Centered under character name
- Parentheticals: (emotional direction) before dialogue when needed
- Transitions: CUT TO:, DISSOLVE TO:, etc.

Style: ${style}

Focus on visual storytelling - describe what we SEE and HEAR.
Keep dialogue minimal and impactful.
Write cinematically, thinking about how each scene will look on screen.
Create emotional beats that resonate - show character growth through struggle.`;

        const outlineSummary = outline.acts.map(act =>
            `ACT ${act.number}: ${act.name}\n${act.beats.map(b =>
                `  - ${b.type}: ${b.description}`
            ).join('\n')}`
        ).join('\n\n');

        const characters = outline.characters?.map(c =>
            `${c.name} (${c.role}): ${c.description}`
        ).join('\n') || 'Characters to be developed';

        const locations = outline.locations?.map(l =>
            `${l.name}: ${l.description}`
        ).join('\n') || 'Locations to be developed';

        const userPrompt = `Write a screenplay based on this outline:

OUTLINE:
${outlineSummary}

CHARACTERS:
${characters}

LOCATIONS:
${locations}

THEMES: ${outline.themes?.join(', ') || 'To be developed'}

Write the full screenplay in standard format. Focus on visual storytelling for the ${genre} genre.
Apply Pixar storytelling principles to create emotional resonance.`;

        // Use Claude for screenplay writing - best at creative narrative
        const providerName = this.matureContent ? 'Dolphin' : 'Claude';
        console.log(`[StoryEditor] Using ${providerName} for screenplay generation`);
        const response = await this.creativeService.generate({
            prompt: userPrompt,
            systemPrompt,
            temperature: 0.7,
            maxTokens: 8000
        });

        return response.content;
    }

    /**
     * Parse script text into structured format
     */
    parseScript(scriptText: string): { scenes: SceneHeading[]; sceneTexts: string[] } {
        const scenes: SceneHeading[] = [];
        const sceneTexts: string[] = [];

        // Normalize line endings and remove excessive whitespace
        let normalizedText = scriptText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // Remove markdown bold formatting around scene headings (LLM often adds **INT.** or **EXT.**)
        normalizedText = normalizedText.replace(/\*\*(INT\.|EXT\.|INT\/EXT\.)/gi, '$1');
        normalizedText = normalizedText.replace(/(INT\.|EXT\.|INT\/EXT\.)[^\n]*\*\*/gi, (match) => match.replace(/\*\*/g, ''));

        // Log first 500 chars for debugging
        console.log('Script preview (first 500 chars):', normalizedText.slice(0, 500));

        // Try multiple regex patterns for scene headings
        // Pattern 1: Standard format with dash - "INT. LOCATION - TIME"
        // Pattern 2: Without dash - "INT. LOCATION TIME" or "INT. LOCATION"
        // Pattern 3: With colon - "INT. LOCATION: TIME"
        // Pattern 4: Scene marker format - "SCENE 1:" or "**SCENE 1**"

        let lastIndex = 0;
        let matchPositions: { index: number; intExt: string; location: string; timeOfDay: string }[] = [];

        // Try first pattern (most specific) - with dash/colon separator
        const pattern1 = /^(INT\.|EXT\.|INT\/EXT\.)\s+(.+?)\s*[-–—:]\s*(.+?)$/gm;
        let match;
        while ((match = pattern1.exec(normalizedText)) !== null) {
            matchPositions.push({
                index: match.index,
                intExt: match[1].replace('.', ''),
                location: match[2].trim(),
                timeOfDay: match[3].trim()
            });
        }

        // If no matches, try pattern without requiring time separator
        if (matchPositions.length === 0) {
            console.log('No scenes found with dash separator, trying without...');
            const pattern2 = /^(INT\.|EXT\.|INT\/EXT\.)\s+(.+?)(?:\s+(DAY|NIGHT|MORNING|EVENING|DUSK|DAWN|CONTINUOUS|LATER|SAME))?$/gim;
            while ((match = pattern2.exec(normalizedText)) !== null) {
                matchPositions.push({
                    index: match.index,
                    intExt: match[1].replace('.', ''),
                    location: (match[3] ? match[2].replace(new RegExp(match[3] + '$', 'i'), '').trim() : match[2]).trim(),
                    timeOfDay: match[3] || 'DAY'
                });
            }
        }

        // If still no matches, try even more lenient pattern
        if (matchPositions.length === 0) {
            console.log('Still no scenes found, trying lenient pattern...');
            const pattern3 = /^(INTERIOR|EXTERIOR|INT|EXT)[\.\:\s]+(.+?)$/gim;
            while ((match = pattern3.exec(normalizedText)) !== null) {
                const intExt = match[1].toUpperCase().startsWith('INT') ? 'INT' : 'EXT';
                matchPositions.push({
                    index: match.index,
                    intExt,
                    location: match[2].trim(),
                    timeOfDay: 'DAY'
                });
            }
        }

        // Pattern 4: Try SCENE marker format (e.g., "SCENE 1:" or "**SCENE 1**" or "[SCENE 1]")
        if (matchPositions.length === 0) {
            console.log('Trying SCENE marker pattern...');
            const pattern4 = /(?:^|\n)\s*(?:\*\*|\[)?SCENE\s*(\d+)(?:\*\*|\])?[:\s]*(.+?)(?=\n|$)/gim;
            while ((match = pattern4.exec(normalizedText)) !== null) {
                matchPositions.push({
                    index: match.index,
                    intExt: 'INT',
                    location: match[2]?.trim() || `SCENE ${match[1]}`,
                    timeOfDay: 'DAY'
                });
            }
        }

        // Pattern 5: Try numbered scene format (e.g., "1. TITLE" at start of line)
        if (matchPositions.length === 0) {
            console.log('Trying numbered scene pattern...');
            const pattern5 = /^(\d+)\.\s+([A-Z][^.\n]+)/gm;
            while ((match = pattern5.exec(normalizedText)) !== null) {
                matchPositions.push({
                    index: match.index,
                    intExt: 'INT',
                    location: match[2].trim(),
                    timeOfDay: 'DAY'
                });
            }
        }

        console.log(`Found ${matchPositions.length} scene headings`);

        // Sort by position and extract scenes
        matchPositions.sort((a, b) => a.index - b.index);

        for (let i = 0; i < matchPositions.length; i++) {
            const mp = matchPositions[i];

            // Save previous scene text
            if (i > 0) {
                sceneTexts.push(normalizedText.slice(lastIndex, mp.index).trim());
            }

            scenes.push({
                intExt: mp.intExt as 'INT' | 'EXT' | 'INT/EXT',
                location: mp.location,
                timeOfDay: mp.timeOfDay
            });

            // Find end of this heading line
            const lineEnd = normalizedText.indexOf('\n', mp.index);
            lastIndex = lineEnd > 0 ? lineEnd : mp.index + mp.location.length + 10;
        }

        // Add last scene text
        if (scenes.length > 0) {
            sceneTexts.push(normalizedText.slice(lastIndex).trim());
        }

        return { scenes, sceneTexts };
    }

    /**
     * Break down a scene into shots with genre-appropriate camera moves
     */
    async breakdownScene(
        sceneNumber: number,
        heading: SceneHeading,
        sceneText: string,
        genre: Genre,
        config: AIDirectorConfig
    ): Promise<SceneBreakdown> {
        const systemPrompt = `${GENRE_SYSTEM_PROMPTS[genre]}

You are breaking down a scene into individual shots for a storyboard.
For each shot, suggest appropriate camera movements from this list:

ZOOM: zoom_in, zoom_out, crash_zoom_in, crash_zoom_out, dolly_zoom_in (vertigo), dolly_zoom_out, rapid_zoom_in
DOLLY: dolly_in, dolly_out, dolly_left, dolly_right, super_dolly_in, super_dolly_out
CRANE: crane_up, crane_down, crane_over, jib_up, jib_down, overhead
PAN/TILT: pan_left, pan_right, tilt_up, tilt_down, whip_pan
ORBITAL: orbit_360, arc_left, arc_right, lazy_susan, 3d_rotation
SPECIALTY: bullet_time, snorricam, dutch_angle, fisheye, fpv_drone, through_object, focus_rack, low_shutter, worms_eye
VEHICLE: car_chase, road_rush, fly_by
CHARACTER: eyes_in, hero_cam, over_shoulder, glam
HANDHELD: handheld, steadicam, gimbal, shaky_intense
STATIC: static, locked_off
TIMELAPSE: hyperlapse, timelapse_city, timelapse_sky

Return a JSON object with this structure:
{
    "sceneNumber": 1,
    "heading": { "intExt": "INT", "location": "Location", "timeOfDay": "DAY" },
    "description": "Scene summary",
    "characters": ["Character names in scene"],
    "emotionalBeat": "tension|release|joy|etc",
    "suggestedShots": [
        {
            "shotNumber": 1,
            "description": "What we see in this shot",
            "cameraPresetId": "preset_id_from_list",
            "cameraDescription": "Why this camera move works",
            "lighting": "Lighting description",
            "duration": 5,
            "priority": "essential|recommended|optional"
        }
    ]
}

Pace: ${config.pace || 'medium'}
- slow: Longer shots, more static, atmospheric
- medium: Balanced mix of static and movement
- fast: Quick cuts, dynamic camera moves`;

        // Calculate per-scene duration budget if target duration is set
        let durationConstraint = '';
        if (config.targetDuration && config.totalScenes) {
            const perSceneBudget = Math.floor(config.targetDuration / config.totalScenes);
            const perSceneMins = Math.floor(perSceneBudget / 60);
            const perSceneSecs = perSceneBudget % 60;
            const budgetStr = perSceneMins > 0
                ? `${perSceneMins}m ${perSceneSecs}s`
                : `${perSceneSecs} seconds`;

            durationConstraint = `

DURATION CONSTRAINT: This scene should be approximately ${budgetStr} (${perSceneBudget} seconds).
- Distribute shot durations to total approximately ${perSceneBudget} seconds
- For very short scenes (under 10 seconds), use 1-2 shots
- For short scenes (10-30 seconds), use 2-4 shots
- For medium scenes (30-60 seconds), use 4-8 shots
- For longer scenes, distribute shots appropriately
- Set each shot's "duration" field in seconds`;
        }

        const userPrompt = `Break down this scene into shots:

SCENE ${sceneNumber}: ${heading.intExt}. ${heading.location} - ${heading.timeOfDay}

${sceneText}
${durationConstraint}
Consider the ${genre} genre conventions and emotional arc.
Return ONLY valid JSON.`;

        // Use Grok for technical breakdown - faster for structured JSON
        console.log(`[StoryEditor] Using Grok for scene ${sceneNumber} breakdown`);
        const response = await this.grokService.generate({
            prompt: userPrompt,
            systemPrompt,
            temperature: 0.7,
            maxTokens: 3000
        });

        try {
            let jsonStr = response.content;
            console.log(`[StoryEditor] Scene ${sceneNumber} raw LLM response length: ${jsonStr.length}`);

            // Try to extract JSON from markdown code blocks
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
                console.log(`[StoryEditor] Extracted JSON from code block`);
            }

            const parsed = JSON.parse(jsonStr.trim());
            console.log(`[StoryEditor] Scene ${sceneNumber} parsed successfully: ${parsed.suggestedShots?.length || 0} shots`);

            // Ensure suggestedShots exists
            if (!parsed.suggestedShots) {
                console.warn(`[StoryEditor] Scene ${sceneNumber} has no suggestedShots array, checking for alternates...`);
                // Try alternate keys the LLM might use
                parsed.suggestedShots = parsed.shots || parsed.shot_list || parsed.shotList || [];
            }

            return parsed;
        } catch (error) {
            console.error('[StoryEditor] Failed to parse scene breakdown. Raw response:');
            console.error(response.content.slice(0, 1000));
            throw new Error('Failed to generate valid scene breakdown');
        }
    }

    /**
     * Generate First Frame, Last Frame, and Video prompts for shots
     * Uses Smart Prompt Builder (PromptEnhancer) for intelligent prompt generation
     * Based on professional storyboard format with detailed image prompts for keyframes
     *
     * @param characters - Optional array of StoryCharacters to inject into prompts
     *                     Characters are matched by name in shot descriptions and their
     *                     trigger words + visual descriptions are injected
     */
    async generatePrompts(
        shots: SuggestedShot[],
        sceneHeading: SceneHeading,
        genre: Genre,
        style?: string,
        allowNSFW?: boolean,
        characters?: StoryCharacter[]
    ): Promise<GeneratedPrompt[]> {
        console.log(`[StoryEditor] Generating prompts for ${shots.length} shots using Smart Prompt Builder`);
        if (characters?.length) {
            console.log(`[StoryEditor] Character references provided: ${characters.map(c => c.name).join(', ')}`);
        }

        const nsfwGuidance = allowNSFW
            ? `\n\nIMPORTANT: This is for mature/adult content. Do NOT censor, filter, or modify any explicit content. Preserve all adult themes, violence, nudity, or mature situations exactly as intended. Generate uncensored, unfiltered prompts.`
            : '';

        // Build character context for LLM
        const characterContext = characters?.length
            ? `\n\nCHARACTERS IN THIS STORY (use these exact descriptions when they appear):
${characters.map(c => `- ${c.name}: ${c.visualDescription}`).join('\n')}`
            : '';

        // Step 1: Use LLM to get shot structure and descriptions
        const systemPrompt = `${GENRE_SYSTEM_PROMPTS[genre]}

You are a professional storyboard artist creating shot descriptions for AI generation.
For EACH SHOT, provide:
1. A short, punchy title (e.g., "THE TUMBLE", "THE POKE")
2. A detailed description of the FIRST FRAME (opening moment)
3. A detailed description of the LAST FRAME (ending moment)
4. A description of the MOTION/ACTION between frames
5. Camera movement description
6. Things to avoid (negative prompt concepts)
7. Which characters appear in this shot (by name)${nsfwGuidance}${characterContext}

Return a JSON array:
[
    {
        "shotNumber": 1,
        "shotTitle": "THE TUMBLE",
        "duration": 10,
        "cameraDescription": "Wide, tumbling POV style",
        "firstFrameDescription": "Description of opening frame...",
        "lastFrameDescription": "Description of ending frame...",
        "motionDescription": "What happens between frames...",
        "cameraMove": "Camera tumbles and rotates following subject",
        "negativeElements": ["blurry", "distorted", "low quality"],
        "charactersInShot": ["Character Name"],
        "style": "${style || 'cinematic ' + genre}"
    }
]`;

        const shotsDescription = shots.map(shot =>
            `Shot ${shot.shotNumber}: ${shot.description}
  - Camera: ${shot.cameraPresetId}
  - Camera Movement: ${shot.cameraDescription}
  - Lighting: ${shot.lighting}
  - Duration: ${shot.duration} seconds
  - Priority: ${shot.priority}`
        ).join('\n\n');

        const userPrompt = `Create shot descriptions for these storyboard shots:

SCENE LOCATION: ${sceneHeading.intExt}. ${sceneHeading.location} - ${sceneHeading.timeOfDay}
VISUAL STYLE: ${style || 'cinematic ' + genre}

SHOTS:
${shotsDescription}

Be extremely detailed and visual in your descriptions. Return ONLY valid JSON array.`;

        // Use Grok for shot structure generation - faster for JSON output
        console.log('[StoryEditor] Using Grok for shot structure generation');
        const response = await this.grokService.generate({
            prompt: userPrompt,
            systemPrompt,
            temperature: 0.7,
            maxTokens: 6000
        });

        let shotStructures: any[];
        try {
            let jsonStr = response.content;
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            }
            shotStructures = JSON.parse(jsonStr.trim());
            console.log(`[StoryEditor] Got ${shotStructures.length} shot structures from LLM`);
        } catch (error) {
            console.error('Failed to parse shot structures:', response.content);
            throw new Error('Failed to generate shot structures');
        }

        // Step 2: Use PromptEnhancer (Smart Prompt Builder) to enhance each prompt
        const generatedPrompts: GeneratedPrompt[] = [];

        for (const shot of shotStructures) {
            console.log(`[StoryEditor] Enhancing prompts for Shot ${shot.shotNumber}: ${shot.shotTitle}`);

            const sceneContext = `${sceneHeading.intExt}. ${sceneHeading.location} - ${sceneHeading.timeOfDay}`;
            const styleContext = shot.style || style || `cinematic ${genre}`;

            // Find which characters appear in this shot
            const shotCharacterNames: string[] = shot.charactersInShot || [];
            const shotCharacters = characters?.filter(c =>
                shotCharacterNames.some(name =>
                    name.toLowerCase() === c.name.toLowerCase() ||
                    c.name.toLowerCase().includes(name.toLowerCase()) ||
                    name.toLowerCase().includes(c.name.toLowerCase())
                )
            ) || [];

            // Build character injection for prompts
            const triggerWords = shotCharacters
                .filter(c => c.triggerWord)
                .map(c => c.triggerWord)
                .join(', ');

            const characterDescriptions = shotCharacters
                .map(c => c.visualDescription)
                .join('. ');

            // Prepend trigger words and character descriptions to base prompts
            const characterPrefix = triggerWords ? `${triggerWords}, ` : '';
            const characterContext = characterDescriptions ? `${characterDescriptions}. ` : '';

            console.log(`[StoryEditor] Shot ${shot.shotNumber} characters: ${shotCharacters.map(c => c.name).join(', ') || 'none'}`);

            // Convert LoRA references to PromptEnhancer format
            const loraRefs = shotCharacters
                .filter(c => c.loraId && c.triggerWord)
                .map(c => ({
                    id: c.loraId!,
                    name: c.name,
                    triggerWords: [c.triggerWord!],
                    strength: 0.8,
                    type: 'character' as const
                }));

            // Convert Element references to PromptEnhancer format
            const elementRefs = shotCharacters
                .filter(c => c.elementId || c.referenceImageUrl)
                .map(c => ({
                    id: c.elementId || c.name,
                    name: c.name,
                    type: 'character' as const,
                    description: c.visualDescription,
                    imageUrl: c.referenceImageUrl,
                    consistencyWeight: 1.0,
                    attributes: {}
                }));

            // Enhance FIRST FRAME prompt (image generation)
            let firstFramePrompt: string;
            try {
                const firstFrameBase = `${characterPrefix}${characterContext}${shot.firstFrameDescription}. Camera: ${shot.cameraDescription}. Style: ${styleContext}. Scene: ${sceneContext}`;
                const firstFrameResult = await this.promptEnhancer.enhance({
                    originalPrompt: firstFrameBase,
                    modelId: 'flux-pro',
                    generationType: 'image',
                    style: styleContext,
                    enhancementLevel: 'balanced',
                    preserveOriginalIntent: true,
                    addQualityBoosters: true,
                    addNegativePrompt: false,
                    consistencyPriority: 0.8,
                    loras: loraRefs.length > 0 ? loraRefs : undefined,
                    elements: elementRefs.length > 0 ? elementRefs : undefined
                });
                firstFramePrompt = firstFrameResult.prompt;
                console.log(`[StoryEditor] Shot ${shot.shotNumber} First Frame enhanced`);
            } catch (err) {
                console.warn(`[StoryEditor] First frame enhancement failed, using base:`, err);
                firstFramePrompt = `${characterPrefix}${characterContext}${shot.firstFrameDescription}. ${styleContext} style, high quality, detailed, ${genre} cinematography`;
            }

            // Enhance LAST FRAME prompt (image generation)
            let lastFramePrompt: string;
            try {
                const lastFrameBase = `${characterPrefix}${characterContext}${shot.lastFrameDescription}. Camera: ${shot.cameraDescription}. Style: ${styleContext}. Scene: ${sceneContext}`;
                const lastFrameResult = await this.promptEnhancer.enhance({
                    originalPrompt: lastFrameBase,
                    modelId: 'flux-pro',
                    generationType: 'image',
                    style: styleContext,
                    enhancementLevel: 'balanced',
                    preserveOriginalIntent: true,
                    addQualityBoosters: true,
                    addNegativePrompt: false,
                    consistencyPriority: 0.8,
                    loras: loraRefs.length > 0 ? loraRefs : undefined,
                    elements: elementRefs.length > 0 ? elementRefs : undefined
                });
                lastFramePrompt = lastFrameResult.prompt;
                console.log(`[StoryEditor] Shot ${shot.shotNumber} Last Frame enhanced`);
            } catch (err) {
                console.warn(`[StoryEditor] Last frame enhancement failed, using base:`, err);
                lastFramePrompt = `${characterPrefix}${characterContext}${shot.lastFrameDescription}. ${styleContext} style, high quality, detailed, ${genre} cinematography`;
            }

            // Enhance VIDEO prompt (video generation - motion description)
            let videoPrompt: string;
            try {
                const videoBase = `${characterPrefix}${characterContext}${shot.motionDescription}. Camera movement: ${shot.cameraMove}. Duration: ${shot.duration} seconds. Style: ${styleContext}`;
                const videoResult = await this.promptEnhancer.enhance({
                    originalPrompt: videoBase,
                    modelId: 'wan-2.1',
                    generationType: 'video',
                    style: styleContext,
                    cameraMovement: shot.cameraMove,
                    enhancementLevel: 'balanced',
                    preserveOriginalIntent: true,
                    addQualityBoosters: true,
                    addNegativePrompt: false,
                    consistencyPriority: 0.8,
                    loras: loraRefs.length > 0 ? loraRefs : undefined,
                    elements: elementRefs.length > 0 ? elementRefs : undefined
                });
                videoPrompt = videoResult.prompt;
                console.log(`[StoryEditor] Shot ${shot.shotNumber} Video Prompt enhanced`);
            } catch (err) {
                console.warn(`[StoryEditor] Video prompt enhancement failed, using base:`, err);
                videoPrompt = `${characterPrefix}${characterContext}${shot.motionDescription}. ${shot.cameraMove}. ${shot.duration} second shot. ${styleContext} style, smooth motion, cinematic`;
            }

            // Build negative prompt
            const negativePrompt = Array.isArray(shot.negativeElements)
                ? shot.negativeElements.join(', ')
                : 'blurry, low quality, distorted faces, extra limbs, bad anatomy';

            generatedPrompts.push({
                shotNumber: shot.shotNumber,
                shotTitle: shot.shotTitle || `SHOT ${shot.shotNumber}`,
                duration: shot.duration || 10,
                cameraDescription: shot.cameraDescription || '',
                firstFramePrompt,
                lastFramePrompt,
                videoPrompt,
                negativePrompt,
                cameraMove: shot.cameraMove || '',
                style: styleContext,
                charactersInShot: shotCharacterNames,
                prompt: firstFramePrompt
            });
        }

        console.log(`[StoryEditor] Generated ${generatedPrompts.length} enhanced prompts`);
        return generatedPrompts;
    }

    /**
     * Enhance an existing prompt with genre-specific style
     */
    async enhancePrompt(
        prompt: string,
        genre: Genre,
        cameraPresetId?: string
    ): Promise<string> {
        const systemPrompt = `${GENRE_SYSTEM_PROMPTS[genre]}

Enhance the following prompt with genre-appropriate visual style keywords.
Keep the original intent but add:
- Visual style descriptors
- Lighting suggestions
- Color palette hints
- Quality boosters

Return ONLY the enhanced prompt, no explanations.`;

        const userPrompt = `Enhance this prompt for ${genre} style:

"${prompt}"

${cameraPresetId ? `Camera movement: ${cameraPresetId}` : ''}

Return only the enhanced prompt.`;

        // Use Grok for prompt enhancement - faster for simple tasks
        const response = await this.grokService.generate({
            prompt: userPrompt,
            systemPrompt,
            temperature: 0.5,
            maxTokens: 500
        });

        return response.content.trim().replace(/^["']|["']$/g, '');
    }

    /**
     * Full pipeline: Concept to Storyboard
     */
    async conceptToStoryboard(
        concept: string,
        genre: Genre,
        config: AIDirectorConfig
    ): Promise<{
        outline: StoryOutline;
        script: string;
        scenes: SceneBreakdown[];
        prompts: GeneratedPrompt[];
    }> {
        console.log('Step 1: Generating outline...');
        const outline = await this.generateOutline(concept, genre);

        console.log('Step 2: Generating script...');
        const script = await this.generateScript(outline, genre, config.style);

        console.log('Step 3: Parsing script into scenes...');
        const { scenes: sceneHeadings, sceneTexts } = this.parseScript(script);

        console.log('Step 4: Breaking down scenes into shots...');
        const sceneBreakdowns: SceneBreakdown[] = [];
        for (let i = 0; i < sceneHeadings.length; i++) {
            const breakdown = await this.breakdownScene(
                i + 1,
                sceneHeadings[i],
                sceneTexts[i] || '',
                genre,
                config
            );
            sceneBreakdowns.push(breakdown);
        }

        console.log('Step 5: Generating prompts for all shots...');
        const allPrompts: GeneratedPrompt[] = [];
        for (let i = 0; i < sceneBreakdowns.length; i++) {
            const prompts = await this.generatePrompts(
                sceneBreakdowns[i].suggestedShots,
                sceneHeadings[i],
                genre,
                config.style
            );
            allPrompts.push(...prompts);
        }

        return {
            outline,
            script,
            scenes: sceneBreakdowns,
            prompts: allPrompts
        };
    }
}

export default StoryEditorService;
