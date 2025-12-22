/**
 * Story Editor Types
 *
 * Supports the full script-to-storyboard pipeline:
 * Concept → Outline → Script → Scenes → Shots → Camera Moves → Prompts → Storyboard
 *
 * Inspired by InVideo's multi-agent architecture and professional screenwriting software.
 */

import { Genre } from '@/data/CameraPresets';
import { ShotType } from '@/data/GenreTemplates';

// ═══════════════════════════════════════════════════════════════════════════
// STORY & SCRIPT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The full story project
 */
export interface Story {
  id: string;
  projectId: string;
  title: string;
  logline?: string; // One-sentence summary
  genre: Genre;
  targetDuration?: number; // Minutes

  // Story structure
  concept?: string;
  outline?: StoryOutline;
  script?: Script;

  // Generated storyboard
  storyboardScenes?: StoryboardScene[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  status: StoryStatus;
}

export type StoryStatus =
  | 'concept' // Initial idea
  | 'outline' // Has outline
  | 'script' // Has full script
  | 'breakdown' // Scenes broken down
  | 'storyboard' // Storyboard generated
  | 'generating' // Currently generating assets
  | 'complete'; // All assets generated

/**
 * Story outline with acts and beats
 */
export interface StoryOutline {
  acts: Act[];
  themes?: string[];
  characters?: Character[];
  locations?: Location[];
}

export interface Act {
  number: 1 | 2 | 3;
  name: string;
  description: string;
  beats: StoryBeat[];
}

export interface StoryBeat {
  id: string;
  type: BeatType;
  description: string;
  emotionalTone?: EmotionalTone;
  estimatedDuration?: number; // Seconds
}

export type BeatType =
  | 'opening_image'
  | 'setup'
  | 'catalyst'
  | 'debate'
  | 'break_into_two'
  | 'b_story'
  | 'fun_and_games'
  | 'midpoint'
  | 'bad_guys_close_in'
  | 'all_is_lost'
  | 'dark_night_of_soul'
  | 'break_into_three'
  | 'finale'
  | 'final_image'
  | 'custom';

export type EmotionalTone =
  | 'tension'
  | 'release'
  | 'joy'
  | 'sadness'
  | 'fear'
  | 'anger'
  | 'surprise'
  | 'anticipation'
  | 'neutral';

/**
 * Character definition
 */
export interface Character {
  id: string;
  name: string;
  description: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  visualDescription?: string; // For consistent image generation
  referenceImages?: string[]; // URLs for IP-Adapter
}

/**
 * Location definition
 */
export interface Location {
  id: string;
  name: string;
  description: string;
  visualDescription?: string;
  referenceImages?: string[];
  timeOfDay?: 'day' | 'night' | 'dawn' | 'dusk' | 'any';
  weather?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCRIPT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Full screenplay script
 */
export interface Script {
  title: string;
  author?: string;
  version?: string;
  elements: ScriptElement[];

  // Parsed metadata
  sceneCount?: number;
  estimatedRuntime?: number; // Minutes
  characterNames?: string[];
  locationNames?: string[];
}

/**
 * Script elements (industry-standard format)
 */
export type ScriptElement =
  | SceneHeading
  | Action
  | Character_
  | Dialogue
  | Parenthetical
  | Transition
  | Shot;

export interface SceneHeading {
  type: 'scene_heading';
  intExt: 'INT' | 'EXT' | 'INT/EXT';
  location: string;
  timeOfDay: string;
  sceneNumber?: string;
}

export interface Action {
  type: 'action';
  text: string;
}

export interface Character_ {
  type: 'character';
  name: string;
  extension?: string; // (V.O.), (O.S.), etc.
}

export interface Dialogue {
  type: 'dialogue';
  text: string;
}

export interface Parenthetical {
  type: 'parenthetical';
  text: string;
}

export interface Transition {
  type: 'transition';
  text: string; // CUT TO:, DISSOLVE TO:, etc.
}

export interface Shot {
  type: 'shot';
  text: string; // CLOSE ON:, POV:, etc.
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE & SHOT BREAKDOWN TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Scene breakdown for storyboarding
 */
export interface StoryboardScene {
  id: string;
  sceneNumber: number;
  heading: string; // INT. COFFEE SHOP - DAY

  // Script content
  description: string;
  dialogue?: string;
  characters?: string[];

  // Genre-informed analysis
  emotionalBeat: EmotionalTone;
  suggestedShotType: ShotType['type'];

  // Generated shots
  shots: StoryboardShot[];

  // Visual references
  locationId?: string;
  styleNotes?: string;
}

/**
 * Individual shot in storyboard
 */
export interface StoryboardShot {
  id: string;
  sceneId: string;
  shotNumber: number;

  // Shot description
  description: string;
  action?: string;
  dialogue?: string;

  // Camera & technical
  cameraPresetId: string;
  cameraDescription?: string;
  duration?: number; // Seconds (for video)

  // Visual style (from genre template)
  lighting?: string;
  colorGrade?: string;

  // Generated prompt
  generatedPrompt?: string;
  negativePrompt?: string;

  // Generation results
  generationId?: string;
  thumbnailUrl?: string;
  videoUrl?: string;

  // Status
  status: ShotStatus;
}

export type ShotStatus =
  | 'pending' // Not yet generated
  | 'prompt_ready' // Has prompt, ready to generate
  | 'generating' // Currently generating
  | 'generated' // Has output
  | 'approved' // User approved
  | 'rejected'; // User rejected, needs regeneration

// ═══════════════════════════════════════════════════════════════════════════
// AI DIRECTOR TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AI Director configuration
 */
export interface AIDirectorConfig {
  genre: Genre;
  style?: string; // Overall visual style
  pace?: 'slow' | 'medium' | 'fast';

  // Automation level
  autoBreakdown?: boolean; // Auto-generate shots per scene
  autoPrompts?: boolean; // Auto-generate prompts
  autoGenerate?: boolean; // Auto-generate images/videos

  // Generation settings
  imageModel?: string;
  videoModel?: string;
  aspectRatio?: string;
  duration?: number; // Video duration per shot

  // Style consistency
  useIPAdapter?: boolean;
  referenceImages?: string[];
  loraId?: string;

  // Quality settings
  variations?: number; // Generate multiple options
  enhancePrompts?: boolean; // Use LLM to enhance
}

/**
 * AI Director response for scene breakdown
 */
export interface AIDirectorSceneAnalysis {
  sceneId: string;
  emotionalArc: EmotionalTone[];
  suggestedShots: SuggestedShot[];
  styleNotes: string[];
  warnings?: string[]; // E.g., "Complex VFX required"
}

export interface SuggestedShot {
  description: string;
  cameraPresetId: string;
  cameraRationale: string;
  lighting: string;
  duration: number;
  priority: 'essential' | 'recommended' | 'optional';
}

// ═══════════════════════════════════════════════════════════════════════════
// PROMPT GENERATION TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Components for building generation prompts
 */
export interface PromptComponents {
  // Scene elements
  subject: string; // Main action/subject
  characters?: string[]; // Character descriptions
  location?: string; // Setting description

  // Technical
  shotType?: string; // Wide, close-up, etc.
  cameraMove?: string; // From camera preset
  cameraAngle?: string; // Low, high, dutch, etc.

  // Style
  lighting?: string;
  colorGrade?: string;
  style?: string; // Overall aesthetic

  // Genre-specific
  genreStyle?: string; // From genre template
  moodKeywords?: string[];

  // Quality
  qualityBoosts?: string[];
  negativePrompts?: string[];
}

/**
 * Generated prompt ready for API
 */
export interface GeneratedPrompt {
  prompt: string;
  negativePrompt: string;

  // Metadata
  components: PromptComponents;
  shotId: string;

  // Enhancements applied
  llmEnhanced?: boolean;
  styleTemplateApplied?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// API REQUEST/RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Request to create a new story from concept
 */
export interface CreateStoryRequest {
  projectId: string;
  concept: string;
  genre: Genre;
  title?: string;
  targetDuration?: number;
}

/**
 * Request to generate outline from concept
 */
export interface GenerateOutlineRequest {
  storyId: string;
  concept: string;
  genre: Genre;
  numberOfActs?: number;
}

/**
 * Request to generate script from outline
 */
export interface GenerateScriptRequest {
  storyId: string;
  outline: StoryOutline;
  genre: Genre;
  style?: string; // Writing style
}

/**
 * Request to parse raw script text
 */
export interface ParseScriptRequest {
  storyId: string;
  scriptText: string;
  format?: 'fountain' | 'fdx' | 'plain';
}

/**
 * Request to break down script into storyboard scenes
 */
export interface BreakdownScriptRequest {
  storyId: string;
  script: Script;
  directorConfig: AIDirectorConfig;
}

/**
 * Request to generate prompts for shots
 */
export interface GeneratePromptsRequest {
  storyId: string;
  shots: StoryboardShot[];
  directorConfig: AIDirectorConfig;
}

/**
 * Request to generate assets (images/videos)
 */
export interface GenerateAssetsRequest {
  storyId: string;
  shotIds: string[];
  directorConfig: AIDirectorConfig;
}

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE STATUS TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Status of the story pipeline
 */
export interface StoryPipelineStatus {
  storyId: string;
  currentStage: StoryStatus;

  stages: {
    concept: StageStatus;
    outline: StageStatus;
    script: StageStatus;
    breakdown: StageStatus;
    prompts: StageStatus;
    generation: StageStatus;
  };

  // Generation progress
  totalShots?: number;
  generatedShots?: number;
  failedShots?: number;

  // Errors
  errors?: string[];
}

export interface StageStatus {
  status: 'pending' | 'in_progress' | 'complete' | 'error';
  startedAt?: string;
  completedAt?: string;
  error?: string;
}
