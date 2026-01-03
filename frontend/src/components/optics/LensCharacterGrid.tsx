'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { Aperture, Circle, Hexagon, Sparkles, Loader2, Check } from 'lucide-react';

export type LensType = 'vintage' | 'anamorphic' | 'modern' | 'classic';
export type BokehShape = 'circular' | 'oval' | 'hexagonal' | 'swirly';

interface LensCharacterGridProps {
  onSelect?: (lensType: LensType, bokehShape: BokehShape) => void;
  onApply?: (lensType: LensType, bokehShape: BokehShape) => Promise<void>;
  selectedLens?: LensType;
  selectedBokeh?: BokehShape;
  className?: string;
}

const LENS_TYPES: Array<{
  id: LensType;
  name: string;
  description: string;
  icon: typeof Aperture;
  color: string;
  preview: string;
}> = [
  {
    id: 'vintage',
    name: 'Vintage Prime',
    description: 'Soft, dreamy with character flaws',
    icon: Sparkles,
    color: 'amber',
    preview: 'Warm tones, gentle halation, subtle chromatic aberration',
  },
  {
    id: 'anamorphic',
    name: 'Anamorphic',
    description: 'Oval bokeh, horizontal flares',
    icon: Aperture,
    color: 'cyan',
    preview: 'Squeezed bokeh, blue/orange lens flares, wide aspect feel',
  },
  {
    id: 'modern',
    name: 'Modern Cine',
    description: 'Clean, sharp with minimal aberration',
    icon: Circle,
    color: 'violet',
    preview: 'Perfect circles, no distortion, clinical sharpness',
  },
  {
    id: 'classic',
    name: 'Classic Hollywood',
    description: 'Golden-era glass feel',
    icon: Hexagon,
    color: 'rose',
    preview: 'Gentle glow, slight vignette, timeless character',
  },
];

const BOKEH_SHAPES: Array<{
  id: BokehShape;
  name: string;
  description: string;
  svg: string;
}> = [
  {
    id: 'circular',
    name: 'Circular',
    description: 'Standard spherical lens',
    svg: 'M12 2a10 10 0 100 20 10 10 0 000-20z',
  },
  {
    id: 'oval',
    name: 'Oval',
    description: 'Anamorphic squeeze',
    svg: 'M12 4c5.5 0 8 3.6 8 8s-2.5 8-8 8-8-3.6-8-8 2.5-8 8-8z',
  },
  {
    id: 'hexagonal',
    name: 'Hexagonal',
    description: 'Visible aperture blades',
    svg: 'M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z',
  },
  {
    id: 'swirly',
    name: 'Swirly',
    description: 'Helios-style rotation',
    svg: 'M12 2c5.5 0 10 4.5 10 10s-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2zm0 3c-3.9 0-7 3.1-7 7s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7z',
  },
];

/**
 * LensCharacterGrid - Phase 4A Optics Engine
 *
 * Interactive grid for selecting lens character effects.
 * Combines lens type (vintage, anamorphic, etc.) with bokeh shape
 * to create unique optical signatures.
 */
export function LensCharacterGrid({
  onSelect,
  onApply,
  selectedLens = 'modern',
  selectedBokeh = 'circular',
  className,
}: LensCharacterGridProps) {
  const [currentLens, setCurrentLens] = useState<LensType>(selectedLens);
  const [currentBokeh, setCurrentBokeh] = useState<BokehShape>(selectedBokeh);
  const [isApplying, setIsApplying] = useState(false);

  const handleLensSelect = useCallback(
    (lensType: LensType) => {
      setCurrentLens(lensType);
      onSelect?.(lensType, currentBokeh);
    },
    [currentBokeh, onSelect]
  );

  const handleBokehSelect = useCallback(
    (bokehShape: BokehShape) => {
      setCurrentBokeh(bokehShape);
      onSelect?.(currentLens, bokehShape);
    },
    [currentLens, onSelect]
  );

  const handleApply = useCallback(async () => {
    if (!onApply) return;

    setIsApplying(true);
    try {
      await onApply(currentLens, currentBokeh);
    } finally {
      setIsApplying(false);
    }
  }, [currentLens, currentBokeh, onApply]);

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      amber: {
        bg: isSelected ? 'bg-amber-500/20' : 'bg-amber-500/5',
        border: isSelected ? 'border-amber-500' : 'border-amber-500/20',
        text: 'text-amber-400',
      },
      cyan: {
        bg: isSelected ? 'bg-cyan-500/20' : 'bg-cyan-500/5',
        border: isSelected ? 'border-cyan-500' : 'border-cyan-500/20',
        text: 'text-cyan-400',
      },
      violet: {
        bg: isSelected ? 'bg-violet-500/20' : 'bg-violet-500/5',
        border: isSelected ? 'border-violet-500' : 'border-violet-500/20',
        text: 'text-violet-400',
      },
      rose: {
        bg: isSelected ? 'bg-rose-500/20' : 'bg-rose-500/5',
        border: isSelected ? 'border-rose-500' : 'border-rose-500/20',
        text: 'text-rose-400',
      },
    };
    return colors[color] || colors.cyan;
  };

  const selectedLensData = LENS_TYPES.find(l => l.id === currentLens);

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Lens Type Selection */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <Aperture className="h-4 w-4 text-cyan-400" />
          Lens Character
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {LENS_TYPES.map(lens => {
            const isSelected = currentLens === lens.id;
            const colors = getColorClasses(lens.color, isSelected);
            const Icon = lens.icon;

            return (
              <motion.button
                key={lens.id}
                onClick={() => handleLensSelect(lens.id)}
                className={clsx(
                  'relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all',
                  colors.bg,
                  colors.border,
                  'hover:scale-[1.02]'
                )}
                whileTap={{ scale: 0.98 }}
              >
                {isSelected && (
                  <motion.div
                    layoutId="lensIndicator"
                    className="absolute top-2 right-2"
                    initial={false}
                  >
                    <Check className={clsx('h-4 w-4', colors.text)} />
                  </motion.div>
                )}
                <div className={clsx('rounded-lg p-2', colors.bg)}>
                  <Icon className={clsx('h-5 w-5', colors.text)} />
                </div>
                <div>
                  <p className="font-medium text-white">{lens.name}</p>
                  <p className="text-xs text-gray-400">{lens.description}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Bokeh Shape Selection */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <Circle className="h-4 w-4 text-purple-400" />
          Bokeh Shape
        </h3>
        <div className="flex gap-2">
          {BOKEH_SHAPES.map(shape => {
            const isSelected = currentBokeh === shape.id;

            return (
              <motion.button
                key={shape.id}
                onClick={() => handleBokehSelect(shape.id)}
                className={clsx(
                  'relative flex flex-1 flex-col items-center gap-2 rounded-xl border p-3 transition-all',
                  isSelected
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                )}
                whileTap={{ scale: 0.95 }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={clsx(
                    'h-8 w-8 fill-current',
                    isSelected ? 'text-purple-400' : 'text-gray-400'
                  )}
                >
                  <path d={shape.svg} />
                </svg>
                <span className="text-xs font-medium text-white">{shape.name}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Selected Preview */}
      <AnimatePresence mode="wait">
        {selectedLensData && (
          <motion.div
            key={`${currentLens}-${currentBokeh}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"
          >
            <p className="text-xs text-gray-400">Preview:</p>
            <p className="mt-1 text-sm text-white">{selectedLensData.preview}</p>
            <p className="mt-2 text-xs text-purple-400">
              + {BOKEH_SHAPES.find(b => b.id === currentBokeh)?.description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Apply Button */}
      {onApply && (
        <motion.button
          onClick={handleApply}
          disabled={isApplying}
          className={clsx(
            'flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold transition-all',
            isApplying
              ? 'cursor-not-allowed bg-cyan-500/20 text-cyan-400'
              : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-500/20'
          )}
          whileTap={{ scale: 0.98 }}
        >
          {isApplying ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Applying Lens Character...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Apply Lens Character
            </>
          )}
        </motion.button>
      )}
    </div>
  );
}
