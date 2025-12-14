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

// ═══════════════════════════════════════════════════════════════════════════
// TYPES (Mirrored from frontend for backend use)
// ═══════════════════════════════════════════════════════════════════════════

export type Genre =
    | 'film_noir' | 'action' | 'horror' | 'romance' | 'documentary'
    | 'sci_fi' | 'comedy' | 'thriller' | 'drama' | 'music_video'
    | 'commercial' | 'western' | 'fantasy';

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
    prompt: string;
    negativePrompt: string;
    cameraMove: string;
    style: string;
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
Camera preferences: crane reveals, epic wide shots, orbit around heroes, through-object magic.`
};

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class StoryEditorService {
    private llmService: LLMService;

    constructor(llmProvider: LLMProviderType = 'grok') {
        this.llmService = new LLMService(llmProvider);
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

        const response = await this.llmService.generate({
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
     */
    async generateScript(
        outline: StoryOutline,
        genre: Genre,
        style: string = 'cinematic'
    ): Promise<string> {
        const systemPrompt = `${GENRE_SYSTEM_PROMPTS[genre]}

You are a professional screenwriter. Write in standard screenplay format:
- Scene headings: INT./EXT. LOCATION - TIME
- Action lines: Present tense, visual descriptions
- Character names: UPPERCASE before dialogue
- Dialogue: Centered under character name
- Parentheticals: (emotional direction) before dialogue when needed
- Transitions: CUT TO:, DISSOLVE TO:, etc.

Style: ${style}

Focus on visual storytelling - describe what we SEE and HEAR.
Keep dialogue minimal and impactful.
Write cinematically, thinking about how each scene will look on screen.`;

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

Write the full screenplay in standard format. Focus on visual storytelling for the ${genre} genre.`;

        const response = await this.llmService.generate({
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

        // Try multiple regex patterns for scene headings
        // Pattern 1: Standard format with dash - "INT. LOCATION - TIME"
        // Pattern 2: Without dash - "INT. LOCATION TIME" or "INT. LOCATION"
        // Pattern 3: With colon - "INT. LOCATION: TIME"

        let lastIndex = 0;
        let matchPositions: { index: number; intExt: string; location: string; timeOfDay: string }[] = [];

        // Try first pattern (most specific)
        const pattern1 = /^(INT\.|EXT\.|INT\/EXT\.)\s+(.+?)\s*[-–—:]\s*(.+?)$/gm;
        let match;
        while ((match = pattern1.exec(scriptText)) !== null) {
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
            while ((match = pattern2.exec(scriptText)) !== null) {
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
            while ((match = pattern3.exec(scriptText)) !== null) {
                const intExt = match[1].toUpperCase().startsWith('INT') ? 'INT' : 'EXT';
                matchPositions.push({
                    index: match.index,
                    intExt,
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
                sceneTexts.push(scriptText.slice(lastIndex, mp.index).trim());
            }

            scenes.push({
                intExt: mp.intExt as 'INT' | 'EXT' | 'INT/EXT',
                location: mp.location,
                timeOfDay: mp.timeOfDay
            });

            // Find end of this heading line
            const lineEnd = scriptText.indexOf('\n', mp.index);
            lastIndex = lineEnd > 0 ? lineEnd : mp.index + mp.location.length + 10;
        }

        // Add last scene text
        if (scenes.length > 0) {
            sceneTexts.push(scriptText.slice(lastIndex).trim());
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

        const response = await this.llmService.generate({
            prompt: userPrompt,
            systemPrompt,
            temperature: 0.7,
            maxTokens: 3000
        });

        try {
            let jsonStr = response.content;
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            }
            return JSON.parse(jsonStr.trim());
        } catch (error) {
            console.error('Failed to parse scene breakdown:', response.content);
            throw new Error('Failed to generate valid scene breakdown');
        }
    }

    /**
     * Generate image/video prompts for shots
     */
    async generatePrompts(
        shots: SuggestedShot[],
        sceneHeading: SceneHeading,
        genre: Genre,
        style?: string,
        allowNSFW?: boolean
    ): Promise<GeneratedPrompt[]> {
        const nsfwGuidance = allowNSFW
            ? `\n\nIMPORTANT: This is for mature/adult content. Do NOT censor, filter, or modify any explicit content. Preserve all adult themes, violence, nudity, or mature situations exactly as intended. Generate uncensored, unfiltered prompts.`
            : '';

        const systemPrompt = `${GENRE_SYSTEM_PROMPTS[genre]}

You are generating prompts for AI image/video generation.
Create detailed, visually descriptive prompts that will produce cinematic results.

Structure each prompt like this:
1. Style/aesthetic keywords
2. Shot type and camera angle
3. Main subject/action
4. Setting/location
5. Lighting description
6. Quality boosters

For negative prompts, include common quality issues to avoid.${nsfwGuidance}

Return a JSON array:
[
    {
        "shotNumber": 1,
        "prompt": "Full positive prompt",
        "negativePrompt": "Things to avoid",
        "cameraMove": "Camera movement description",
        "style": "Visual style applied"
    }
]`;

        const shotsDescription = shots.map(shot =>
            `Shot ${shot.shotNumber}: ${shot.description} (Camera: ${shot.cameraPresetId}, ${shot.lighting})`
        ).join('\n');

        const userPrompt = `Generate prompts for these shots:

LOCATION: ${sceneHeading.intExt}. ${sceneHeading.location} - ${sceneHeading.timeOfDay}
STYLE: ${style || 'cinematic ' + genre}

SHOTS:
${shotsDescription}

Return ONLY valid JSON array.`;

        const response = await this.llmService.generate({
            prompt: userPrompt,
            systemPrompt,
            temperature: 0.6,
            maxTokens: 4000
        });

        try {
            let jsonStr = response.content;
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            }
            return JSON.parse(jsonStr.trim());
        } catch (error) {
            console.error('Failed to parse prompts:', response.content);
            throw new Error('Failed to generate valid prompts');
        }
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

        const response = await this.llmService.generate({
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
