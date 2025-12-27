'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Aperture, Camera, ChevronDown, Info, Sparkles, X } from 'lucide-react';
import { clsx } from 'clsx';
import {
  LENS_PRESETS,
  LENS_EFFECTS,
  LensPreset,
  LensEffect,
  LENS_CATEGORY_COLORS,
  ANAMORPHIC_MODIFIERS,
  LENS_CHARACTER_PRESETS,
  LensCharacter,
  buildLensPrompt,
} from '@/data/LensPresets';

interface LensKitSelectorProps {
  selectedLens: LensPreset | null;
  selectedEffects: string[];
  isAnamorphic: boolean;
  lensCharacter: LensCharacter;
  onLensChange: (lens: LensPreset | null) => void;
  onEffectsChange: (effects: string[]) => void;
  onAnamorphicChange: (isAnamorphic: boolean) => void;
  onCharacterChange: (character: LensCharacter) => void;
  onAspectRatioLock?: (aspectRatio: string) => void; // Called when anamorphic forces 2.39:1
  embedded?: boolean;
}

export function LensKitSelector({
  selectedLens,
  selectedEffects,
  isAnamorphic,
  lensCharacter,
  onLensChange,
  onEffectsChange,
  onAnamorphicChange,
  onCharacterChange,
  onAspectRatioLock,
  embedded = false,
}: LensKitSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showInfo, setShowInfo] = useState<string | null>(null);

  const toggleEffect = (effectId: string) => {
    if (selectedEffects.includes(effectId)) {
      onEffectsChange(selectedEffects.filter(e => e !== effectId));
    } else {
      onEffectsChange([...selectedEffects, effectId]);
    }
  };

  // Handle anamorphic toggle with aspect ratio lock
  const handleAnamorphicToggle = (value: boolean) => {
    onAnamorphicChange(value);
    if (value && onAspectRatioLock) {
      onAspectRatioLock('21:9'); // 2.39:1 cinematic widescreen
    }
  };

  // Compact button for toolbar - responsive: wider padding on small screens, compact on 2xl+
  // Height stays consistent at h-8 to prevent overlap with adjacent buttons
  if (!isOpen && !embedded) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={clsx(
          'flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 transition-all hover:scale-105 2xl:gap-1.5 2xl:px-2',
          isAnamorphic
            ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
            : selectedLens
              ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
              : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
        )}
        title="Lens Kit - Focal Length & Anamorphic"
      >
        <Aperture className="h-4 w-4 2xl:h-3.5 2xl:w-3.5" />
        <span className="text-xs font-medium 2xl:text-[10px]">
          {selectedLens ? selectedLens.focalLength : 'Lens'}
        </span>
        {isAnamorphic && (
          <span className="rounded-full bg-blue-500/30 px-1.5 py-0.5 text-[10px] text-blue-300 2xl:px-1 2xl:text-[9px]">
            ANA
          </span>
        )}
        {selectedEffects.length > 0 && (
          <span className="rounded-full bg-cyan-500/30 px-1.5 py-0.5 text-[10px] 2xl:px-1 2xl:text-[9px]">
            +{selectedEffects.length}
          </span>
        )}
      </button>
    );
  }

  const panelContent = (
    <div
      className={clsx(
        'flex h-full flex-col transition-colors duration-300',
        isAnamorphic && 'bg-gradient-to-b from-blue-950/20 to-transparent'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <div className="flex items-center gap-2">
          <Aperture
            className={clsx(
              'h-5 w-5 transition-colors',
              isAnamorphic ? 'text-blue-400' : 'text-cyan-400'
            )}
          />
          <h2 className="text-lg font-bold text-white">Lens Kit</h2>
        </div>
        {!embedded && (
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Glass Type Toggle - Spherical vs Anamorphic */}
      <div className="border-b border-white/10 px-4 py-3">
        <div className="mb-2 text-[10px] tracking-wider text-gray-500 uppercase">GLASS TYPE</div>
        <div className="flex overflow-hidden rounded-lg border border-white/10">
          <button
            onClick={() => handleAnamorphicToggle(false)}
            className={clsx(
              'flex-1 px-3 py-2 text-xs font-medium transition-all',
              !isAnamorphic
                ? 'border-r border-cyan-500/30 bg-cyan-500/20 text-cyan-400'
                : 'border-r border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
            )}
          >
            Spherical
          </button>
          <button
            onClick={() => handleAnamorphicToggle(true)}
            className={clsx(
              'flex-1 px-3 py-2 text-xs font-medium transition-all',
              isAnamorphic
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            )}
          >
            Anamorphic
          </button>
        </div>
        {isAnamorphic && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-blue-400/80">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
            2.39:1 cinematic widescreen • Oval bokeh • Blue streak flares
          </div>
        )}
      </div>

      {/* Lens Character Toggle - Modern vs Vintage */}
      <div className="border-b border-white/10 px-4 py-3">
        <div className="mb-2 text-[10px] tracking-wider text-gray-500 uppercase">LENS CHARACTER</div>
        <div className="flex overflow-hidden rounded-lg border border-white/10">
          <button
            onClick={() => onCharacterChange('modern')}
            className={clsx(
              'flex-1 px-3 py-2 text-xs font-medium transition-all',
              lensCharacter === 'modern'
                ? 'border-r border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                : 'border-r border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
            )}
          >
            Modern
          </button>
          <button
            onClick={() => onCharacterChange('vintage')}
            className={clsx(
              'flex-1 px-3 py-2 text-xs font-medium transition-all',
              lensCharacter === 'vintage'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            )}
          >
            Vintage
          </button>
        </div>
        <div className="mt-2 text-[10px] text-gray-500">
          {LENS_CHARACTER_PRESETS[lensCharacter].description}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {LENS_CHARACTER_PRESETS[lensCharacter].visualTraits.slice(0, 2).map((trait, i) => (
            <span
              key={i}
              className={clsx(
                'rounded px-1.5 py-0.5 text-[9px]',
                lensCharacter === 'modern'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              )}
            >
              {trait}
            </span>
          ))}
        </div>
      </div>

      {/* Focal Length Slider Visual */}
      <div className="border-b border-white/10 bg-black/30 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-gray-500">FOCAL LENGTH</span>
          <span className="font-mono text-sm text-cyan-400">
            {selectedLens?.focalLength || 'None'}
          </span>
        </div>
        {/* Visual slider showing lens range */}
        <div className="relative h-8 rounded-lg bg-gradient-to-r from-red-500/20 via-green-500/20 to-blue-500/20">
          {LENS_PRESETS.map(lens => {
            const position = ((lens.focalMm - 14) / (135 - 14)) * 100;
            return (
              <button
                key={lens.id}
                onClick={() => onLensChange(selectedLens?.id === lens.id ? null : lens)}
                className={clsx(
                  'absolute top-1/2 h-6 w-3 -translate-y-1/2 rounded-sm transition-all hover:scale-125',
                  selectedLens?.id === lens.id
                    ? 'bg-cyan-400 shadow-lg shadow-cyan-500/50'
                    : 'bg-white/40 hover:bg-white/70'
                )}
                style={{ left: `calc(${position}% - 6px)` }}
                title={lens.name}
              />
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-gray-600">
          <span>14mm</span>
          <span>50mm</span>
          <span>135mm</span>
        </div>
      </div>

      {/* Lens Presets Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {LENS_PRESETS.map(lens => (
            <button
              key={lens.id}
              onClick={() => onLensChange(selectedLens?.id === lens.id ? null : lens)}
              className={clsx(
                'w-full rounded-lg border p-3 text-left transition-all',
                selectedLens?.id === lens.id
                  ? 'border-cyan-500/50 bg-cyan-500/20'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{lens.name}</span>
                    <span
                      className={clsx(
                        'rounded border px-1.5 py-0.5 text-[10px]',
                        LENS_CATEGORY_COLORS[lens.category]
                      )}
                    >
                      {lens.category}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-[11px] text-gray-400">{lens.description}</p>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setShowInfo(showInfo === lens.id ? null : lens.id);
                  }}
                  className="rounded p-1 transition-colors hover:bg-white/10"
                >
                  <Info className="h-3.5 w-3.5 text-gray-500" />
                </button>
              </div>

              {/* Expanded Info */}
              <AnimatePresence>
                {showInfo === lens.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
                      {/* Characteristics */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Distortion:</span>
                          <span className="text-gray-300">{lens.characteristics.distortion}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Compression:</span>
                          <span className="text-gray-300">{lens.characteristics.compression}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">DoF:</span>
                          <span className="text-gray-300">{lens.characteristics.depthOfField}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Perspective:</span>
                          <span className="text-gray-300">{lens.characteristics.perspective}</span>
                        </div>
                      </div>
                      {/* Use Cases */}
                      <div className="flex flex-wrap gap-1">
                        {lens.useCases.map((use, i) => (
                          <span
                            key={i}
                            className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-gray-400"
                          >
                            {use}
                          </span>
                        ))}
                      </div>
                      {/* Film Examples */}
                      {lens.filmExamples && (
                        <div className="text-[9px] text-gray-500 italic">
                          <Camera className="mr-1 inline h-3 w-3" />
                          {lens.filmExamples.join(' | ')}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          ))}
        </div>

        {/* Lens Effects Section */}
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">
              Lens Effects
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {LENS_EFFECTS.map(effect => (
              <button
                key={effect.id}
                onClick={() => toggleEffect(effect.id)}
                className={clsx(
                  'rounded-lg border p-2.5 text-left transition-all',
                  selectedEffects.includes(effect.id)
                    ? 'border-purple-500/50 bg-purple-500/20'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                )}
              >
                <span className="block text-xs font-medium text-white">{effect.name}</span>
                <span className="line-clamp-1 text-[10px] text-gray-500">{effect.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer - Active Modifiers Preview */}
      {(selectedLens || selectedEffects.length > 0 || isAnamorphic || lensCharacter) && (
        <div
          className={clsx(
            'border-t bg-black/30 p-3',
            isAnamorphic ? 'border-blue-500/20' : 'border-white/10'
          )}
        >
          <div className="mb-1 text-[10px] text-gray-500">WILL ADD TO PROMPT:</div>
          <div className="flex flex-wrap gap-1">
            {/* Lens Character modifiers (Modern/Vintage) */}
            {LENS_CHARACTER_PRESETS[lensCharacter].promptModifiers.slice(0, 2).map((mod, i) => (
              <span
                key={`char-${i}`}
                className={clsx(
                  'rounded px-1.5 py-0.5 text-[9px]',
                  lensCharacter === 'modern'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                )}
              >
                {mod}
              </span>
            ))}
            {/* Anamorphic modifiers (shown when active) */}
            {isAnamorphic &&
              ANAMORPHIC_MODIFIERS.slice(0, 2).map((mod, i) => (
                <span
                  key={`anamorphic-${i}`}
                  className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] text-blue-300"
                >
                  {mod}
                </span>
              ))}
            {/* Lens modifiers */}
            {selectedLens?.promptModifiers.slice(0, isAnamorphic ? 2 : 3).map((mod, i) => (
              <span
                key={i}
                className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] text-cyan-300"
              >
                {mod}
              </span>
            ))}
            {/* Effect modifiers */}
            {selectedEffects.flatMap(effectId => {
              const effect = LENS_EFFECTS.find(e => e.id === effectId);
              return effect?.promptModifiers.slice(0, 1).map((mod, i) => (
                <span
                  key={`${effectId}-${i}`}
                  className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] text-purple-300"
                >
                  {mod}
                </span>
              ));
            })}
            {/* Overflow indicator */}
            {(selectedLens?.promptModifiers.length || 0) +
              (isAnamorphic ? ANAMORPHIC_MODIFIERS.length : 0) +
              LENS_CHARACTER_PRESETS[lensCharacter].promptModifiers.length >
              6 && <span className="text-[9px] text-gray-500">+more</span>}
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="h-[90vh] w-[380px] overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
      >
        {panelContent}
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-h-[85vh] w-[420px] overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {panelContent}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Compact inline selector for the toolbar
export function LensKitCompact({
  selectedLens,
  isAnamorphic,
  onLensChange,
  onAnamorphicChange,
}: {
  selectedLens: LensPreset | null;
  isAnamorphic: boolean;
  onLensChange: (lens: LensPreset | null) => void;
  onAnamorphicChange: (isAnamorphic: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex h-10 items-center gap-2 rounded-xl border px-3 transition-all hover:scale-105',
          isAnamorphic
            ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
            : selectedLens
              ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
              : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
        )}
      >
        <Aperture className="h-4 w-4" />
        <span className="text-xs font-medium">
          {selectedLens ? selectedLens.focalLength : 'Lens'}
        </span>
        {isAnamorphic && (
          <span className="rounded bg-blue-500/30 px-1 py-0.5 text-[9px] text-blue-300">A</span>
        )}
        <ChevronDown className={clsx('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={clsx(
              'absolute top-full left-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border shadow-2xl',
              isAnamorphic ? 'border-blue-500/20 bg-[#0a1628]' : 'border-white/10 bg-[#1a1a1a]'
            )}
          >
            {/* Anamorphic Toggle */}
            <div className="border-b border-white/10 p-2">
              <button
                onClick={() => onAnamorphicChange(!isAnamorphic)}
                className={clsx(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 transition-all',
                  isAnamorphic
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                )}
              >
                <span className="text-xs font-medium">Anamorphic Glass</span>
                <div
                  className={clsx(
                    'relative h-4 w-8 rounded-full transition-colors',
                    isAnamorphic ? 'bg-blue-500' : 'bg-gray-600'
                  )}
                >
                  <div
                    className={clsx(
                      'absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform',
                      isAnamorphic ? 'translate-x-4' : 'translate-x-0.5'
                    )}
                  />
                </div>
              </button>
              {isAnamorphic && (
                <p className="mt-1 px-3 text-[9px] text-blue-400/70">
                  2.39:1 • Oval bokeh • Blue flares
                </p>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto p-2">
              {/* Clear Selection */}
              <button
                onClick={() => {
                  onLensChange(null);
                  setIsOpen(false);
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-xs text-gray-400 transition-colors hover:bg-white/5"
              >
                No lens selected
              </button>
              {/* Lens Options */}
              {LENS_PRESETS.map(lens => (
                <button
                  key={lens.id}
                  onClick={() => {
                    onLensChange(lens);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    'w-full rounded-lg px-3 py-2 text-left transition-colors',
                    selectedLens?.id === lens.id
                      ? isAnamorphic
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-cyan-500/20 text-cyan-300'
                      : 'text-white hover:bg-white/5'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{lens.name}</span>
                    <span
                      className={clsx(
                        'rounded px-1 py-0.5 text-[9px]',
                        LENS_CATEGORY_COLORS[lens.category]
                      )}
                    >
                      {lens.category}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-gray-500">
                    {lens.description}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
