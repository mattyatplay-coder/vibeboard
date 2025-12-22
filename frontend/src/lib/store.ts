import { create } from 'zustand';

export type ElementType = 'image' | 'video' | 'character' | 'prop' | 'place' | 'style' | 'voice';

export interface Element {
  id: string;
  name: string;
  type: ElementType;
  url: string;
  fileUrl?: string;
  thumbnail?: string;
  isFavorite?: boolean;
  tags?: string[];
  metadata?: any;
  session?: { id: string; name: string };
  projectId: string;
  width?: number;
  height?: number;
}

export interface GenerationSettings {
  shotType: string;
  cameraAngle: string;
  location: string;
  lighting: string;
  weather: string;
  resolution: '1080p' | '1440p' | '2048p';
  aspectRatio: '16:9' | '1:1' | '9:16';
  numVariations: number;
}

export interface Scene {
  id: string;
  order: number;
  prompt: string;
  settings: GenerationSettings;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration: number;
  shots?: any[]; // TODO: Define Shot type properly
}

export interface Generation {
  id: string;
  projectId: string;
  inputPrompt: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  outputs?: { type: 'image' | 'video'; url: string; thumbnail_url?: string }[];
  createdAt: string;
  isFavorite: boolean;
  name?: string;
  engine?: string; // Engine provider (e.g. 'fal')
  falModel?: string; // Specific model ID
  tags?: string[];
  session?: { id: string; name: string };
  failureReason?: string;
  aspectRatio?: string;
  sourceElementIds?: string[] | string;
  usedLoras?: {
    provider?: string;
    model?: string;
    loras?: { id: string; name?: string; strength: number }[];
    strength?: number;
    sampler?: string;
    scheduler?: string;
    seed?: number;
    steps?: number;
    guidanceScale?: number;
    referenceStrengths?: Record<string, number>;
    negativePrompt?: string;
    [key: string]: any;
  };
  aiAnalysis?: string; // JSON string of validation results
  rating?: number; // 0-5 stars
}

interface AppState {
  elements: Element[];
  addElement: (element: Element) => void;
  removeElement: (id: string) => void;
  updateElement: (id: string, updates: Partial<Element>) => void;

  scenes: Scene[];
  addScene: (scene: Scene) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  reorderScenes: (startIndex: number, endIndex: number) => void;

  generationSettings: GenerationSettings;
  updateSettings: (settings: Partial<GenerationSettings>) => void;
}

export const useAppStore = create<AppState>(set => ({
  elements: [],
  addElement: element => set(state => ({ elements: [...state.elements, element] })),
  removeElement: id => set(state => ({ elements: state.elements.filter(e => e.id !== id) })),
  updateElement: (id, updates) =>
    set(state => ({
      elements: state.elements.map(e => (e.id === id ? { ...e, ...updates } : e)),
    })),

  scenes: [],
  addScene: scene => set(state => ({ scenes: [...state.scenes, scene] })),
  updateScene: (id, updates) =>
    set(state => ({
      scenes: state.scenes.map(s => (s.id === id ? { ...s, ...updates } : s)),
    })),
  reorderScenes: (startIndex, endIndex) =>
    set(state => {
      const result = Array.from(state.scenes);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return { scenes: result.map((s, i) => ({ ...s, order: i })) };
    }),

  generationSettings: {
    shotType: 'None',
    cameraAngle: 'Eye level',
    location: '',
    lighting: '',
    weather: '',
    resolution: '1080p',
    aspectRatio: '16:9',
    numVariations: 4,
  },
  updateSettings: settings =>
    set(state => ({
      generationSettings: { ...state.generationSettings, ...settings },
    })),
}));
