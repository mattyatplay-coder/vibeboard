/* eslint-disable react-hooks/rules-of-hooks */
'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Check,
  ChevronRight,
  Search,
  Ratio,
  Plus,
  ChevronDown,
  Settings2,
  Sliders,
  Dice5,
  FileJson,
  FolderOpen,
  Library,
  Database,
  Lightbulb,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useDropzone } from 'react-dropzone';
import { ParameterManager } from '../generations/ParameterManager';
import { CreateStyleModal, CustomStyle } from './CreateStyleModal';
import { LoRAManager } from '../loras/LoRAManager';

import { CinematicTagsModal } from './CinematicTagsModal';
import { DataBackupModal } from '../settings/DataBackupModal';
import { NegativePromptManager } from '../prompts/NegativePromptManager';
import { ALL_CATEGORIES, CinematicTag, CATEGORY_MAP } from '@/data/CinematicTags';

export interface StyleConfig {
  preset: any;
  referenceImage: string | File | null;
  inspiration: string;
  aspectRatio: string;
  camera?: {
    type?: string;
    angle?: string;
  };
  lighting?: {
    type?: string;
  };
  location?: {
    type?: string;
  };
  strength?: number;
  loras?: {
    id: string;
    name: string;
    strength: number;
    triggerWord?: string;
    triggerWords?: string[];
    baseModel?: string;
  }[];
  sampler?: { id: string; name: string; value: string };
  scheduler?: { id: string; name: string; value: string };
  guidanceScale?: number;
  steps?: number;
  seed?: number;
  negativePrompt?: string;
  workflow?: { name: string; file: File | null };
  motionVideo?: string | File | null;
  // Lighting Lock feature
  lightingLock?: {
    enabled: boolean;
    imageUrl?: string;
    imageFile?: File;
    strength: number; // 0.1-0.5, default 0.25
  };
}

interface StyleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (config: StyleConfig) => void;
  initialAspectRatio?: string;
  projectId: string;
}

const STYLE_PRESETS = [
  {
    id: 'film_noir',
    name: 'Film Noir',
    image: '/presets/film_noir.png',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    promptSuffix:
      ', high contrast black and white, dramatic shadows, dutch angle, 1940s film grain, mystery, crime thriller atmosphere',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    image: '/presets/cinematic.png',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    promptSuffix:
      ', cinematic lighting, shallow depth of field, anamorphic lens, color graded, 8k resolution, highly detailed',
  },
  {
    id: 'vintage',
    name: 'Vintage',
    image: '/presets/vintage.png',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    promptSuffix:
      ', vintage 1970s aesthetic, film grain, faded colors, retro fashion, polaroid style, nostalgic',
  },
  {
    id: 'anime',
    name: 'Anime',
    image: '/presets/anime.png',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    promptSuffix:
      ', anime style, cel shaded, vibrant colors, expressive characters, studio ghibli inspired, detailed background',
  },
  {
    id: '3d_cartoon',
    name: '3D Cartoon',
    image: '/presets/3d_cartoon.png',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    promptSuffix:
      ', 3d render, pixar style, cute, soft lighting, ambient occlusion, clay material, character design',
  },
  {
    id: 'colored',
    name: 'Colored',
    image: '/presets/colored.png',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    promptSuffix:
      ', vibrant color palette, saturated, neon lights, colorful, rainbow, psychedelic, vivid',
  },
  {
    id: 'dreamy',
    name: 'Dreamy',
    image: '/presets/dreamy.png',
    video:
      'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    promptSuffix:
      ', dreamy atmosphere, soft focus, pastel colors, ethereal, fantasy, magical, glowing',
  },
  {
    id: 'hand_drawn',
    name: 'Hand Drawn',
    image: 'https://picsum.photos/seed/hand/200',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    promptSuffix:
      ', hand drawn, pencil sketch, charcoal, rough lines, artistic, illustration, sketchbook style',
  },
  {
    id: '2d_novel',
    name: '2D Novel',
    image: 'https://picsum.photos/seed/novel/200',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    promptSuffix:
      ', visual novel style, 2d character art, clean lines, flat colors, anime portrait, dialogue scene',
  },
  {
    id: 'scribble',
    name: 'Scribble',
    image: 'https://picsum.photos/seed/scribble/200',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    promptSuffix:
      ', scribble art, messy lines, doodle style, marker pen, childish, abstract, chaotic',
  },
  {
    id: 'storyboard',
    name: 'Storyboard',
    image: 'https://picsum.photos/seed/storyboard/200',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    promptSuffix:
      ', storyboard sketch, black and white, rough composition, arrows, camera movement indicators, pre-visualization',
  },
  {
    id: 'low_key',
    name: 'Low Key',
    image: 'https://picsum.photos/seed/lowkey/200',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    promptSuffix:
      ', low key lighting, dark background, rim light, silhouette, moody, mystery, noir',
  },
  {
    id: 'indie',
    name: 'Indie',
    image: 'https://picsum.photos/seed/indie/200',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    promptSuffix:
      ', indie movie aesthetic, a24 style, natural lighting, raw, emotional, handheld camera, mumblecore',
  },
  {
    id: 'y2k',
    name: 'Y2K',
    image: 'https://picsum.photos/seed/y2k/200',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    promptSuffix:
      ', y2k aesthetic, year 2000, futuristic, chrome, glossy, matrix style, cyber, techno',
  },
  {
    id: 'pop',
    name: 'Pop Art',
    image: 'https://picsum.photos/seed/pop/200',
    video:
      'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    promptSuffix:
      ', pop art, comic book style, halftones, bold outlines, roy lichtenstein, vibrant, retro',
  },
  {
    id: 'grunge',
    name: 'Grunge',
    image: 'https://picsum.photos/seed/grunge/200',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    promptSuffix: ', grunge aesthetic, dirty, distressed, texture, 90s rock, dark, edgy, urban',
  },
  {
    id: 'boost',
    name: 'Boost',
    image: 'https://picsum.photos/seed/boost/200',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    promptSuffix:
      ', high quality, 4k, detailed, sharp focus, masterpiece, trending on artstation, award winning',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    image: 'https://picsum.photos/seed/cyberpunk/200',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    promptSuffix:
      ', cyberpunk, neon lights, futuristic city, rain, holographic, blade runner inspired, dystopian',
  },
  {
    id: 'vaporwave',
    name: 'Vaporwave',
    image: 'https://picsum.photos/seed/vaporwave/200',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    promptSuffix:
      ', vaporwave aesthetic, pink and blue, 80s retro, glitch art, greek statues, palm trees, sunset grid',
  },
  {
    id: 'documentary',
    name: 'Documentary',
    image: 'https://picsum.photos/seed/documentary/200',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    promptSuffix:
      ', documentary style, realistic, natural lighting, handheld footage, intimate, observational',
  },
  {
    id: 'horror',
    name: 'Horror',
    image: 'https://picsum.photos/seed/horror/200',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    promptSuffix:
      ', horror atmosphere, dark shadows, unsettling, tension, desaturated, grainy, creepy',
  },
  {
    id: 'western',
    name: 'Western',
    image: 'https://picsum.photos/seed/western/200',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    promptSuffix:
      ', western movie, desert landscape, dusty, sepia tones, wide shots, cowboy aesthetic',
  },
  {
    id: 'noir_color',
    name: 'Neo-Noir',
    image: 'https://picsum.photos/seed/neonoir/200',
    video:
      'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    promptSuffix:
      ', neo-noir, color noir, neon lights in darkness, rain-slicked streets, mysterious, stylized shadows',
  },
];

function PresetCard({
  preset,
  isSelected,
  onClick,
}: {
  preset: any;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isHovered && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else if (!isHovered && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isHovered]);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 transition-all hover:border-white/30"
    >
      <div className="h-full w-full bg-white/5 transition-colors group-hover:bg-white/10">
        {isHovered ? (
          <video
            ref={videoRef}
            src={preset.video}
            className="h-full w-full object-cover"
            muted
            loop
            playsInline
          />
        ) : (
          <img src={preset.image} alt={preset.name} className="h-full w-full object-cover" />
        )}
      </div>

      <div
        className={clsx(
          'absolute inset-0 ring-2 transition-all ring-inset',
          isSelected ? 'bg-blue-500/10 ring-blue-500' : 'ring-transparent'
        )}
      />

      {isSelected && (
        <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}

      <span className="absolute right-0 bottom-1 left-0 bg-black/60 py-0.5 text-center text-[10px] font-medium text-gray-300 backdrop-blur-sm">
        {preset.name}
      </span>
    </button>
  );
}

interface StyleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (config: StyleConfig) => void;
  initialAspectRatio?: string;
  projectId: string;
  config?: StyleConfig; // Added config prop for external control
  currentModelId?: string; // Current generation model ID for LoRA auto-filtering
  isAnamorphicLocked?: boolean; // When true, locks aspect ratio to 21:9
}

export function StyleSelectorModal({
  isOpen,
  onClose,
  onApply,
  initialAspectRatio,
  projectId,
  config: configProp,
  currentModelId,
  isAnamorphicLocked,
}: StyleSelectorModalProps) {
  // Basic Style State
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStyle, setSelectedStyle] = useState<any>(null);
  const [selectedPreset, setSelectedPreset] = useState<any>(null); // Restored
  const [searchQuery, setSearchQuery] = useState(''); // Restored
  const [referenceImage, setReferenceImage] = useState<string | File | null>(null);

  // Internal Configuration State
  const [config, setConfig] = useState<StyleConfig>({
    preset: null,
    referenceImage: null,
    inspiration: '',
    aspectRatio: initialAspectRatio || '16:9',
    strength: 80,
    guidanceScale: 7.5,
    steps: 30,
    seed: undefined,
    loras: [],
    motionVideo: null,
    negativePrompt: '',
  });

  // Advanced Parameters State (helpers if needed, but we rely on config)
  const [selectedLoRAs, setSelectedLoRAs] = useState<
    { id: string; name: string; strength: number }[]
  >([]);

  // Sync state with incoming config prop
  useEffect(() => {
    if (isOpen && configProp) {
      setConfig(prev => ({
        ...prev,
        ...configProp,
        // Ensure defaults if missing in prop
        strength: configProp.strength !== undefined ? configProp.strength : prev.strength,
        steps: configProp.steps || prev.steps,
        guidanceScale: configProp.guidanceScale || prev.guidanceScale,
        loras: configProp.loras || prev.loras,
        negativePrompt:
          configProp.negativePrompt !== undefined ? configProp.negativePrompt : prev.negativePrompt,
        aspectRatio: configProp.aspectRatio || prev.aspectRatio,
      }));

      // Sync helper states if they exist and are used separately (selectedLoRAs seems used in my previous edit, but maybe in original too?)
      // Original code didn't show selectedLoRAs usage. But I might need to check if it's used.
      // Based on my Previous Edit, I added `selectedLoRAs`.
      // If the rest of the file uses `config.loras`, I should ensure that's what is used.
      // If I see `selectedLoRAs` being used in the file, I should keep it.
      // But I broke the file because `config` was missing.
      // I'll assume `config` is the source of truth.
    }
  }, [isOpen, configProp]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [customPresets, setCustomPresets] = useState<any[]>([]);
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['loras']);
  const [activeManager, setActiveManager] = useState<
    'lora' | 'sampler' | 'scheduler' | 'tags' | 'negative' | null
  >(null);
  const [initialTagCategory, setInitialTagCategory] = useState<string | undefined>(undefined);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const handleAddTag = (tag: CinematicTag, categoryId: string) => {
    const prefix = config.inspiration ? `${config.inspiration}, ` : '';
    // Use the tag's prompt directly - it already includes the proper formatting
    setConfig({ ...config, inspiration: prefix + tag.prompt });
    // Keep the panel open so users can add multiple tags
  };

  const openTagsPanel = (categoryId?: string) => {
    setInitialTagCategory(categoryId);
    setActiveManager(activeManager === 'tags' ? null : 'tags');
  };

  const handleApply = () => {
    onApply(config);
    onClose();
  };

  const handleCreateStyle = (style: CustomStyle) => {
    const suffix = style.tags.length > 0 ? `, ${style.tags.join(', ')}` : '';
    const newPreset = {
      id: style.id,
      name: style.name,
      image: style.image,
      video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      inspiration: style.tags.join(', '),
      promptSuffix: suffix,
    };
    setCustomPresets([...customPresets, newPreset]);
    setConfig(prev => ({
      ...prev,
      preset: newPreset.id,
      inspiration: newPreset.inspiration,
    }));
  };

  const handleToggleLoRA = (lora: any) => {
    const currentLoras = config.loras || [];
    const exists = currentLoras.find(l => l.id === lora.id);

    if (exists) {
      setConfig({
        ...config,
        loras: currentLoras.filter(l => l.id !== lora.id),
      });
    } else {
      setConfig({
        ...config,
        loras: [
          ...currentLoras,
          {
            id: lora.id,
            name: lora.name,
            strength: lora.strength || 1.0,
            triggerWord: lora.triggerWord,
            triggerWords: lora.triggerWords || (lora.triggerWord ? [lora.triggerWord] : []),
            baseModel: lora.baseModel || 'Unknown',
          },
        ],
      });
    }
  };

  const handleLoRAStrengthChange = (loraId: string, strength: number) => {
    setConfig(prev => ({
      ...prev,
      loras: prev.loras?.map(l => (l.id === loraId ? { ...l, strength } : l)),
    }));
  };

  const handleSelectSampler = (sampler: any) => {
    setConfig(prev => ({ ...prev, sampler: sampler || undefined }));
  };

  const handleSelectScheduler = (scheduler: any) => {
    setConfig(prev => ({ ...prev, scheduler: scheduler || undefined }));
  };

  const generateRandomSeed = () => {
    setConfig(prev => ({ ...prev, seed: Math.floor(Math.random() * 2147483647) }));
  };

  const allPresets = [...STYLE_PRESETS, ...customPresets];
  const filteredPresets = searchQuery
    ? allPresets.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allPresets;

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setConfig({ ...config, referenceImage: acceptedFiles[0] });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [] },
    maxFiles: 1,
  });

  const previewUrl = config.referenceImage
    ? typeof config.referenceImage === 'string'
      ? config.referenceImage
      : URL.createObjectURL(config.referenceImage)
    : null;

  useEffect(() => {
    return () => {
      if (previewUrl && typeof config.referenceImage !== 'string') {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [config.referenceImage]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div
            className="scrollbar-none fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={onClose}
          >
            <div
              className="scrollbar-none flex items-stretch gap-4 overflow-hidden"
              style={{ height: 'min(800px, calc(100vh - 2rem))', maxWidth: 'calc(100vw - 2rem)' }}
              onClick={e => e.stopPropagation()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="scrollbar-none relative flex h-full flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
                style={{ width: '780px', maxWidth: '900px' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 p-4">
                  <h2 className="text-lg font-bold text-white">Style & Parameters</h2>
                  <button
                    onClick={onClose}
                    className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 3-Column Content */}
                <div className="scrollbar-none flex min-h-0 flex-1 overflow-y-auto">
                  {/* LEFT COLUMN - Style Presets */}
                  <div className="scrollbar-none flex w-[280px] flex-col border-r border-white/10">
                    <div className="border-b border-white/5 p-3">
                      <div className="relative">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Search styles..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pr-3 pl-9 text-sm text-white placeholder-gray-500 focus:border-white/30 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="scrollbar-none flex-1 overflow-y-auto p-3">
                      <div className="grid grid-cols-3 gap-2">
                        {filteredPresets.map(preset => (
                          <PresetCard
                            key={preset.id}
                            preset={preset}
                            isSelected={config.preset === preset.id}
                            onClick={() => {
                              setConfig({
                                ...config,
                                preset: preset.id,
                                inspiration: preset.inspiration || config.inspiration,
                              });
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-white/5 p-3">
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 py-2 text-xs text-gray-400 transition-colors hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400"
                      >
                        <Plus className="h-4 w-4" />
                        Create New Style
                      </button>
                      <button
                        onClick={() => setIsBackupModalOpen(true)}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 py-2 text-xs text-gray-400 transition-colors hover:border-green-500/50 hover:bg-green-500/10 hover:text-green-400"
                      >
                        <Database className="h-4 w-4" />
                        Data Management
                      </button>
                    </div>
                  </div>

                  {/* MIDDLE COLUMN - Reference & Advanced Settings */}
                  <div className="scrollbar-none flex w-[270px] flex-col overflow-y-auto border-r border-white/10">
                    <div className="space-y-4 p-4">
                      {/* Reference Image */}
                      <div>
                        <span className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">
                          Reference Image (Structure/Character)
                        </span>
                        <div
                          {...getRootProps()}
                          className={clsx(
                            'relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors',
                            isDragActive
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-white/20 bg-white/5 hover:bg-white/10'
                          )}
                        >
                          <input {...getInputProps()} />
                          {previewUrl ? (
                            <>
                              {(
                                config.referenceImage instanceof File
                                  ? config.referenceImage.type.startsWith('video')
                                  : false
                              ) ? (
                                <video
                                  src={previewUrl}
                                  className="absolute inset-0 h-full w-full object-cover"
                                  autoPlay
                                  muted
                                  loop
                                />
                              ) : (
                                <img
                                  src={previewUrl}
                                  className="absolute inset-0 h-full w-full object-cover"
                                  alt="Reference"
                                />
                              )}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                                <Upload className="h-6 w-6 text-white" />
                              </div>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setConfig({ ...config, referenceImage: null });
                                }}
                                className="absolute top-2 right-2 rounded bg-black/60 p-1 text-white transition-colors hover:bg-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <div className="text-center">
                              <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                              <p className="text-xs text-gray-400">Drop image or click to upload</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Motion/Pose Video (New) */}
                      <div>
                        <span className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">
                          Motion / Pose Video
                        </span>
                        <div className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-white/20 bg-white/5 transition-colors hover:bg-white/10">
                          {config.motionVideo ? (
                            <>
                              <video
                                src={
                                  typeof config.motionVideo === 'string'
                                    ? config.motionVideo
                                    : URL.createObjectURL(config.motionVideo)
                                }
                                className="absolute inset-0 h-full w-full object-cover"
                                autoPlay
                                muted
                                loop
                              />
                              <div className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                                <label className="cursor-pointer">
                                  <Upload className="h-6 w-6 text-white" />
                                  <input
                                    type="file"
                                    accept="video/*"
                                    className="hidden"
                                    onChange={e => {
                                      const file = e.target.files?.[0];
                                      if (file) setConfig({ ...config, motionVideo: file });
                                    }}
                                  />
                                </label>
                              </div>
                              <button
                                onClick={() => setConfig({ ...config, motionVideo: null })}
                                className="absolute top-2 right-2 z-20 rounded bg-black/60 p-1 text-white transition-colors hover:bg-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center">
                              <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                              <p className="text-xs text-gray-400">Upload Motion Video</p>
                              <input
                                type="file"
                                accept="video/*"
                                className="hidden"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) setConfig({ ...config, motionVideo: file });
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Advanced Settings Accordion */}
                      <div className="overflow-hidden rounded-lg border border-white/10">
                        <button
                          onClick={() => toggleSection('loras')}
                          className="flex w-full items-center justify-between bg-white/5 p-3 transition-colors hover:bg-white/10"
                        >
                          <span className="flex items-center gap-2 text-xs font-bold text-gray-300">
                            <Settings2 className="h-3.5 w-3.5" />
                            LoRAs & Checkpoints
                          </span>
                          <ChevronDown
                            className={clsx(
                              'h-4 w-4 text-gray-400 transition-transform',
                              expandedSections.includes('loras') && 'rotate-180'
                            )}
                          />
                        </button>

                        {expandedSections.includes('loras') && (
                          <div className="space-y-3 border-t border-white/5 p-3">
                            {config.loras && config.loras.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">
                                  LoRA Strengths
                                </span>
                                {config.loras.map(lora => (
                                  <div
                                    key={lora.id}
                                    className="rounded-lg border border-white/5 bg-black/20 p-2"
                                  >
                                    <div className="mb-1 flex items-center justify-between">
                                      <span className="flex-1 truncate text-xs text-gray-300">
                                        {lora.name}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="w-8 text-right text-[10px] text-gray-500">
                                          {lora.strength.toFixed(1)}
                                        </span>
                                        <button
                                          onClick={() => handleToggleLoRA(lora)}
                                          className="text-gray-500 hover:text-red-400"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <input
                                      type="range"
                                      min="0"
                                      max="2"
                                      step="0.1"
                                      value={lora.strength}
                                      onChange={e =>
                                        handleLoRAStrengthChange(
                                          lora.id,
                                          parseFloat(e.target.value)
                                        )
                                      }
                                      className="h-1 w-full accent-blue-500"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            <button
                              onClick={() =>
                                setActiveManager(activeManager === 'lora' ? null : 'lora')
                              }
                              className={clsx(
                                'w-full rounded-lg border border-dashed py-2 text-xs transition-colors',
                                activeManager === 'lora'
                                  ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                                  : 'border-white/20 text-gray-400 hover:bg-white/5 hover:text-white'
                              )}
                            >
                              {activeManager === 'lora' ? 'Close Manager' : '+ Add LoRAs'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Sampler & Scheduler Accordion */}
                      <div className="overflow-hidden rounded-lg border border-white/10">
                        <button
                          onClick={() => toggleSection('sampler-scheduler')}
                          className="flex w-full items-center justify-between bg-white/5 p-3 transition-colors hover:bg-white/10"
                        >
                          <span className="flex items-center gap-2 text-xs font-bold text-gray-300">
                            <Sliders className="h-3.5 w-3.5" />
                            Sampler & Scheduler
                          </span>
                          <ChevronDown
                            className={clsx(
                              'h-4 w-4 text-gray-400 transition-transform',
                              expandedSections.includes('sampler-scheduler') && 'rotate-180'
                            )}
                          />
                        </button>

                        {expandedSections.includes('sampler-scheduler') && (
                          <div className="border-t border-white/5 p-3">
                            <div className="grid grid-cols-2 gap-2">
                              {/* Sampler */}
                              <div>
                                <span className="mb-1 block text-[10px] font-bold text-gray-500 uppercase">
                                  Sampler
                                </span>
                                <button
                                  onClick={() =>
                                    setActiveManager(activeManager === 'sampler' ? null : 'sampler')
                                  }
                                  className={clsx(
                                    'w-full truncate rounded border px-2 py-1.5 text-left text-xs transition-colors',
                                    activeManager === 'sampler'
                                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                                      : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                                  )}
                                >
                                  {config.sampler?.name || 'DPM++ SDE Kar...'}
                                </button>
                              </div>

                              {/* Scheduler */}
                              <div>
                                <span className="mb-1 block text-[10px] font-bold text-gray-500 uppercase">
                                  Scheduler
                                </span>
                                <button
                                  onClick={() =>
                                    setActiveManager(
                                      activeManager === 'scheduler' ? null : 'scheduler'
                                    )
                                  }
                                  className={clsx(
                                    'w-full truncate rounded border px-2 py-1.5 text-left text-xs transition-colors',
                                    activeManager === 'scheduler'
                                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                                      : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                                  )}
                                >
                                  {config.scheduler?.name || 'Karras'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Workflow Accordion */}
                      <div className="overflow-hidden rounded-lg border border-white/10">
                        <button
                          onClick={() => toggleSection('workflow')}
                          className="flex w-full items-center justify-between bg-white/5 p-3 transition-colors hover:bg-white/10"
                        >
                          <span className="flex items-center gap-2 text-xs font-bold text-gray-300">
                            <Sliders className="h-3.5 w-3.5" />
                            Workflow
                          </span>
                          <ChevronDown
                            className={clsx(
                              'h-4 w-4 text-gray-400 transition-transform',
                              expandedSections.includes('workflow') && 'rotate-180'
                            )}
                          />
                        </button>

                        {expandedSections.includes('workflow') && (
                          <div className="space-y-3 border-t border-white/5 p-3">
                            {/* Workflow Upload */}
                            <div>
                              <span className="mb-2 block text-[10px] font-bold text-gray-500 uppercase">
                                Custom Workflow (JSON)
                              </span>
                              {config.workflow?.name ? (
                                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-2">
                                  <FileJson className="h-4 w-4 text-green-400" />
                                  <span className="flex-1 truncate text-xs text-green-300">
                                    {config.workflow.name}
                                  </span>
                                  <button
                                    onClick={() =>
                                      setConfig(prev => ({ ...prev, workflow: undefined }))
                                    }
                                    className="text-gray-400 hover:text-red-400"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 p-3 transition-colors hover:border-purple-500/50 hover:bg-purple-500/10">
                                  <FolderOpen className="h-4 w-4 text-gray-400" />
                                  <span className="text-xs text-gray-400">
                                    Upload ComfyUI/Workflow JSON
                                  </span>
                                  <input
                                    type="file"
                                    accept=".json"
                                    className="hidden"
                                    onChange={e => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        setConfig(prev => ({
                                          ...prev,
                                          workflow: { name: file.name, file },
                                        }));
                                      }
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN - Quick Tags & Parameters */}
                  <div className="scrollbar-none @container flex w-[230px] flex-shrink-0 flex-col overflow-y-auto">
                    <div className="space-y-4 p-4">
                      {/* Quick Add Tags */}
                      <div>
                        <button
                          onClick={() => openTagsPanel()}
                          className={clsx(
                            'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                            activeManager === 'tags'
                              ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                              : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span>🎬</span> Add Cinematic Tags
                          </span>
                          <ChevronRight className="h-4 w-4 opacity-50" />
                        </button>
                      </div>

                      {/* Cinematic Inspiration - moved here so users can see selected tags */}
                      <div>
                        <span className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">
                          Cinematic Inspiration
                        </span>
                        <textarea
                          value={config.inspiration}
                          onChange={e => setConfig({ ...config, inspiration: e.target.value })}
                          placeholder="E.g., 'Retro, gritty, eclectic, stylish, noir...'"
                          className="h-20 w-full resize-none rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-white placeholder-gray-500 focus:border-white/30 focus:outline-none"
                        />
                      </div>

                      {/* Reference Strength */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                            Reference Strength
                          </span>
                          <span className="text-xs text-gray-400">{config.strength}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={config.strength || 80}
                          onChange={e =>
                            setConfig({ ...config, strength: parseInt(e.target.value) })
                          }
                          className="w-full cursor-pointer accent-blue-500"
                        />
                      </div>

                      {/* CFG Scale */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                            CFG Scale
                          </span>
                          <span className="text-xs text-gray-400">
                            {config.guidanceScale?.toFixed(1) || '3.5'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          step="0.1"
                          value={config.guidanceScale || 3.5}
                          onChange={e =>
                            setConfig({ ...config, guidanceScale: parseFloat(e.target.value) })
                          }
                          className="w-full cursor-pointer accent-blue-500"
                        />
                      </div>

                      {/* Steps */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                            Steps
                          </span>
                          <span className="text-xs text-gray-400">{config.steps || 28}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="50"
                          step="1"
                          value={config.steps || 28}
                          onChange={e => setConfig({ ...config, steps: parseInt(e.target.value) })}
                          className="w-full cursor-pointer accent-blue-500"
                        />
                      </div>

                      {/* Seed */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                            Seed
                          </span>
                          <button
                            onClick={generateRandomSeed}
                            className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-blue-400"
                          >
                            <Dice5 className="h-3 w-3" />
                            Random
                          </button>
                        </div>
                        <input
                          type="number"
                          value={config.seed || ''}
                          onChange={e =>
                            setConfig({
                              ...config,
                              seed: e.target.value ? parseInt(e.target.value) : undefined,
                            })
                          }
                          placeholder="Random"
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-white/30 focus:outline-none"
                        />
                      </div>

                      {/* Aspect Ratio */}
                      <div>
                        <span className="mb-2 block flex items-center gap-[clamp(4px,1cqw,8px)] text-[clamp(10px,2cqw,12px)] font-bold tracking-wider text-gray-400 uppercase">
                          <Ratio className="h-[clamp(10px,2cqw,12px)] w-[clamp(10px,2cqw,12px)]" />{' '}
                          Aspect Ratio
                          {isAnamorphicLocked && (
                            <span className="ml-1 rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] text-blue-400">
                              ANAMORPHIC LOCK
                            </span>
                          )}
                        </span>
                        {isAnamorphicLocked ? (
                          // Anamorphic locked mode - only 21:9
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg border border-blue-500 bg-blue-600 px-[clamp(8px,2.5cqw,14px)] py-[clamp(4px,1.2cqw,8px)] text-[clamp(10px,2cqw,12px)] font-medium whitespace-nowrap text-white">
                              21:9
                            </div>
                            <span className="text-[10px] text-blue-400/70">
                              Anamorphic glass requires 2.39:1 widescreen
                            </span>
                          </div>
                        ) : (
                          // Normal mode - all aspect ratios
                          <div className="flex flex-wrap gap-[clamp(4px,1.5cqw,8px)]">
                            {['16:9', '9:16', '1:1', '21:9', '2.35:1'].map(ratio => (
                              <button
                                key={ratio}
                                onClick={() => setConfig({ ...config, aspectRatio: ratio })}
                                className={clsx(
                                  'rounded-lg border px-[clamp(8px,2.5cqw,14px)] py-[clamp(4px,1.2cqw,8px)] text-[clamp(10px,2cqw,12px)] font-medium whitespace-nowrap transition-colors',
                                  config.aspectRatio === ratio
                                    ? 'border-blue-500 bg-blue-600 text-white'
                                    : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                                )}
                              >
                                {ratio}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Lighting Lock - IP-Adapter for consistent lighting */}
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-amber-400" />
                            <span className="text-xs font-bold tracking-wider text-amber-300 uppercase">
                              Lighting Lock
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              setConfig({
                                ...config,
                                lightingLock: config.lightingLock?.enabled
                                  ? { ...config.lightingLock, enabled: false }
                                  : { enabled: true, strength: 0.25 },
                              })
                            }
                            className={clsx(
                              'relative h-5 w-8 rounded-full transition-colors',
                              config.lightingLock?.enabled ? 'bg-amber-500' : 'bg-gray-700'
                            )}
                          >
                            <div
                              className={clsx(
                                'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
                                config.lightingLock?.enabled ? 'left-3.5' : 'left-0.5'
                              )}
                            />
                          </button>
                        </div>

                        <p className="mb-2 text-[10px] text-gray-500">
                          Upload a reference image to lock lighting style across all generations
                          (uses IP-Adapter at low weight)
                        </p>

                        {config.lightingLock?.enabled && (
                          <div className="space-y-2">
                            {/* Upload Zone or Preview */}
                            {config.lightingLock.imageUrl || config.lightingLock.imageFile ? (
                              <div className="relative h-20 w-full overflow-hidden rounded-lg border border-amber-500/30">
                                <img
                                  src={
                                    config.lightingLock.imageFile
                                      ? URL.createObjectURL(config.lightingLock.imageFile)
                                      : config.lightingLock.imageUrl
                                  }
                                  alt="Lighting reference"
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                <div className="absolute bottom-1 left-2 flex items-center gap-1 text-[10px] text-amber-300">
                                  <Lock className="h-3 w-3" />
                                  <span>Lighting locked</span>
                                </div>
                                <button
                                  onClick={() =>
                                    setConfig({
                                      ...config,
                                      lightingLock: {
                                        ...config.lightingLock!,
                                        imageUrl: undefined,
                                        imageFile: undefined,
                                      },
                                    })
                                  }
                                  className="absolute top-1 right-1 rounded bg-black/50 p-1 transition-colors hover:bg-red-500/50"
                                >
                                  <X className="h-3 w-3 text-white" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex h-16 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-amber-500/30 bg-amber-500/5 transition-colors hover:border-amber-500/50">
                                <Upload className="mb-1 h-4 w-4 text-amber-400" />
                                <span className="text-[10px] text-amber-300">
                                  Drop lighting reference
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setConfig({
                                        ...config,
                                        lightingLock: { ...config.lightingLock!, imageFile: file },
                                      });
                                    }
                                  }}
                                />
                              </label>
                            )}

                            {/* Strength Slider */}
                            <div className="flex items-center gap-2">
                              <span className="w-14 text-[10px] text-gray-500">Strength:</span>
                              <input
                                type="range"
                                min="0.1"
                                max="0.5"
                                step="0.05"
                                value={config.lightingLock.strength}
                                onChange={e =>
                                  setConfig({
                                    ...config,
                                    lightingLock: {
                                      ...config.lightingLock!,
                                      strength: parseFloat(e.target.value),
                                    },
                                  })
                                }
                                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-gray-700 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500"
                              />
                              <span className="w-8 text-right text-[10px] text-amber-300">
                                {(config.lightingLock.strength * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Negative Prompt */}
                      <div>
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="block text-xs font-bold tracking-wider text-gray-400 uppercase">
                              Negative Prompt
                            </span>
                            <button
                              onClick={() =>
                                setActiveManager(activeManager === 'negative' ? null : 'negative')
                              }
                              className={clsx(
                                'flex items-center gap-1 text-[10px] font-medium transition-colors',
                                activeManager === 'negative'
                                  ? 'text-red-400'
                                  : 'text-gray-500 hover:text-white'
                              )}
                            >
                              <Library className="h-3 w-3" />
                              Library
                            </button>
                          </div>
                          <textarea
                            value={config.negativePrompt || ''}
                            onChange={e => setConfig({ ...config, negativePrompt: e.target.value })}
                            placeholder="E.g., 'blur, distortion, low quality, watermark...'"
                            className="h-16 w-full resize-none rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-white placeholder-gray-500 focus:border-white/30 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 border-t border-white/10 bg-[#1a1a1a] p-4">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
                  >
                    Apply Style
                  </button>
                </div>
              </motion.div>

              {/* Side Panels for LoRA/Sampler/Scheduler */}
              <AnimatePresence>
                {activeManager === 'lora' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full max-h-full min-w-[400px] flex-shrink"
                  >
                    <LoRAManager
                      projectId={projectId}
                      isOpen={true}
                      onClose={() => setActiveManager(null)}
                      embedded={true}
                      selectedIds={config.loras?.map(l => l.id)}
                      onToggle={handleToggleLoRA}
                      currentModelId={currentModelId}
                    />
                  </motion.div>
                )}
                {activeManager === 'sampler' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full max-h-full min-w-[300px] flex-shrink"
                  >
                    <ParameterManager
                      projectId={projectId}
                      type="sampler"
                      isOpen={true}
                      onClose={() => setActiveManager(null)}
                      embedded={true}
                      selectedId={config.sampler?.id}
                      onSelect={handleSelectSampler}
                    />
                  </motion.div>
                )}
                {activeManager === 'scheduler' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full max-h-full min-w-[300px] flex-shrink"
                  >
                    <ParameterManager
                      projectId={projectId}
                      type="scheduler"
                      isOpen={true}
                      onClose={() => setActiveManager(null)}
                      embedded={true}
                      selectedId={config.scheduler?.id}
                      onSelect={handleSelectScheduler}
                    />
                  </motion.div>
                )}
                {activeManager === 'tags' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full max-h-full min-w-[400px] flex-shrink"
                  >
                    <CinematicTagsModal
                      isOpen={true}
                      onClose={() => setActiveManager(null)}
                      onSelectTag={handleAddTag}
                      initialCategory={initialTagCategory}
                      embedded={true}
                    />
                  </motion.div>
                )}
                {activeManager === 'negative' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full max-h-full min-w-[350px] flex-shrink"
                  >
                    <NegativePromptManager
                      projectId={projectId}
                      isOpen={true}
                      onClose={() => setActiveManager(null)}
                      currentPrompt={config.negativePrompt}
                      onSelect={prompt => setConfig({ ...config, negativePrompt: prompt })}
                      embedded={true}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </AnimatePresence>

      <DataBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        projectId={projectId}
      />

      {/* Create Style Modal */}
      <CreateStyleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateStyle}
      />
    </>
  );
}
