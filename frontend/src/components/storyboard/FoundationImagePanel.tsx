'use client';

import { useState, useRef } from 'react';
import { Upload, Sparkles, ImageIcon, X, ChevronDown, Wand2, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useDropzone } from 'react-dropzone';

interface FoundationImagePanelProps {
  projectId: string;
  foundationImage: string | File | null;
  onFoundationImageChange: (image: string | File | null) => void;
  onGenerateFromPrompt: (prompt: string) => void;
  styleConfig?: {
    aesthetic?: string;
    lighting?: string;
    colorPalette?: string;
    cameraDirection?: string;
  };
  onStyleConfigChange?: (config: any) => void;
}

// Timeline Prompting structure from Mira AI video
const TIMELINE_COMPONENTS = {
  aesthetic: [
    'Pixar animation style',
    'Cinematic film look',
    'Anime style',
    'Realistic photography',
    'Film noir',
    'Vintage 1970s',
    'Cyberpunk',
    'Studio Ghibli inspired',
    'Sci-fi futuristic',
    'Fantasy epic',
    'Documentary style',
    'Music video aesthetic',
  ],
  lighting: [
    'Dramatic warm and cold contrast',
    'Golden hour',
    'Neon lights',
    'Natural daylight',
    'Moody low-key',
    'High-key bright',
    'Rim lighting',
    'Volumetric fog',
    'Sunset silhouette',
    'Studio lighting',
    'Candlelight',
    'Moonlight',
  ],
  colorPalette: [
    'Warm oranges and teals',
    'Muted earth tones',
    'Vibrant saturated',
    'Desaturated cinematic',
    'Pastel soft',
    'High contrast B&W',
    'Neon pink and blue',
    'Sepia vintage',
    'Cool blue undertones',
    'Autumnal reds and browns',
  ],
  cameraDirection: [
    'Slow dolly forward',
    'Static establishing shot',
    'Handheld following',
    'Crane shot upward',
    'Tracking side shot',
    'Push in dramatic',
    'Pull back reveal',
    'Pan left to right',
    'Orbit around subject',
    'Steadicam smooth',
  ],
};

export function FoundationImagePanel({
  projectId,
  foundationImage,
  onFoundationImageChange,
  onGenerateFromPrompt,
  styleConfig = {},
  onStyleConfigChange,
}: FoundationImagePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: files => {
      if (files.length > 0) {
        onFoundationImageChange(files[0]);
      }
    },
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  // Build Timeline Prompt from components
  const buildTimelinePrompt = () => {
    const parts = [];
    if (styleConfig.aesthetic) parts.push(styleConfig.aesthetic);
    if (styleConfig.lighting) parts.push(styleConfig.lighting);
    if (styleConfig.colorPalette) parts.push(styleConfig.colorPalette);
    if (styleConfig.cameraDirection) parts.push(styleConfig.cameraDirection);
    return parts.join(', ');
  };

  const handleCopyPrompt = () => {
    const prompt = buildTimelinePrompt();
    if (prompt) {
      navigator.clipboard.writeText(prompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  const handleGenerate = async () => {
    if (!generationPrompt.trim()) return;
    setIsGenerating(true);
    try {
      // Combine user prompt with Timeline Prompt structure
      const timelineAddition = buildTimelinePrompt();
      const fullPrompt = timelineAddition
        ? `${generationPrompt}. ${timelineAddition}`
        : generationPrompt;
      await onGenerateFromPrompt(fullPrompt);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateStyleConfig = (key: string, value: string) => {
    onStyleConfigChange?.({
      ...styleConfig,
      [key]: value,
    });
    setActiveDropdown(null);
  };

  const previewUrl = foundationImage
    ? typeof foundationImage === 'string'
      ? foundationImage
      : URL.createObjectURL(foundationImage as any)
    : null;

  return (
    <div className="overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-b from-purple-900/20 to-transparent">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20">
            <ImageIcon className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">Foundation Image</h3>
            <p className="text-[10px] text-gray-500">Master aesthetic reference for all scenes</p>
          </div>
        </div>
        <ChevronDown
          className={clsx('h-4 w-4 text-gray-400 transition-transform', isExpanded && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-4 pb-4">
              {/* Foundation Image Upload/Preview */}
              <div className="flex gap-4">
                {/* Image Area */}
                <div
                  {...getRootProps()}
                  className={clsx(
                    'relative aspect-video w-40 cursor-pointer overflow-hidden rounded-lg border-2 border-dashed transition-colors',
                    isDragActive
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-white/20 hover:border-purple-500/50',
                    previewUrl && 'border-solid border-purple-500/30'
                  )}
                >
                  <input {...getInputProps()} />
                  {previewUrl ? (
                    <>
                      <img
                        src={previewUrl}
                        alt="Foundation"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                        <Upload className="h-5 w-5 text-white" />
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onFoundationImageChange(null);
                        }}
                        className="absolute top-1 right-1 rounded bg-black/60 p-1 text-white transition-colors hover:bg-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <Upload className="mb-1 h-6 w-6" />
                      <span className="text-[10px]">Drop or click</span>
                    </div>
                  )}
                </div>

                {/* Quick Generate */}
                <div className="flex-1 space-y-2">
                  <textarea
                    value={generationPrompt}
                    onChange={e => setGenerationPrompt(e.target.value)}
                    placeholder="Describe your foundation aesthetic... (e.g., 'Space knight in weathered armor, cinematic sci-fi')"
                    className="h-16 w-full resize-none rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none"
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !generationPrompt.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-purple-500/20 bg-purple-600/20 px-3 py-1.5 text-xs font-medium text-purple-400 transition-colors hover:bg-purple-600/30 disabled:opacity-50"
                  >
                    <Sparkles className="h-3 w-3" />
                    {isGenerating ? 'Generating...' : 'Generate Foundation'}
                  </button>
                </div>
              </div>

              {/* Timeline Prompting Structure */}
              <div className="border-t border-white/5 pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-3 w-3 text-purple-400" />
                    <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                      Timeline Prompt Structure
                    </span>
                  </div>
                  <button
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-1 text-[10px] text-gray-500 transition-colors hover:text-purple-400"
                  >
                    {copiedPrompt ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedPrompt ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TIMELINE_COMPONENTS).map(([key, options]) => (
                    <div key={key} className="relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === key ? null : key)}
                        className={clsx(
                          'flex w-full items-center justify-between rounded border bg-white/5 px-2 py-1.5 text-xs transition-colors hover:bg-white/10',
                          (styleConfig as any)[key]
                            ? 'border-purple-500/30 text-purple-300'
                            : 'border-white/10 text-gray-400'
                        )}
                      >
                        <span className="truncate">
                          {(styleConfig as any)[key] || key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <ChevronDown className="ml-1 h-3 w-3 flex-shrink-0" />
                      </button>

                      <AnimatePresence>
                        {activeDropdown === key && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute top-full right-0 left-0 z-50 mt-1 max-h-40 overflow-y-auto rounded-lg border border-white/20 bg-[#1a1a1a] shadow-xl"
                          >
                            <button
                              onClick={() => updateStyleConfig(key, '')}
                              className="w-full px-2 py-1.5 text-left text-xs text-gray-500 transition-colors hover:bg-white/5"
                            >
                              Clear
                            </button>
                            {options.map(option => (
                              <button
                                key={option}
                                onClick={() => updateStyleConfig(key, option)}
                                className={clsx(
                                  'w-full px-2 py-1.5 text-left text-xs transition-colors',
                                  (styleConfig as any)[key] === option
                                    ? 'bg-purple-500/20 text-purple-300'
                                    : 'text-gray-300 hover:bg-white/5'
                                )}
                              >
                                {option}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>

                {/* Preview of built prompt */}
                {buildTimelinePrompt() && (
                  <div className="mt-3 rounded border border-purple-500/10 bg-black/30 p-2">
                    <p className="text-[10px] leading-relaxed text-purple-300/70">
                      {buildTimelinePrompt()}
                    </p>
                  </div>
                )}
              </div>

              {/* Usage Tip */}
              <div className="rounded-lg border border-purple-500/10 bg-purple-500/5 p-3">
                <p className="text-[10px] leading-relaxed text-purple-300/80">
                  <strong>Tip:</strong> Your foundation image sets the visual DNA for your entire
                  project. All scene images will reference this aesthetic. Use the Timeline Prompt
                  structure (Aesthetic + Lighting + Color + Camera) for consistent results.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
