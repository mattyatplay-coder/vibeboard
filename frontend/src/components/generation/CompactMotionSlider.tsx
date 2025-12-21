"use client";

import React, { useState, useCallback } from 'react';
import { Gauge, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

interface CompactMotionSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  engineType?: 'kling' | 'veo' | 'sora' | 'wan' | 'luma' | 'ltx' | 'other';
  className?: string;
}

const MOTION_PRESETS = [
  { value: 0.0, label: 'Static', emoji: '⏸️' },
  { value: 0.25, label: 'Subtle', emoji: '🍃' },
  { value: 0.5, label: 'Moderate', emoji: '🌊' },
  { value: 0.75, label: 'Dynamic', emoji: '⚡' },
  { value: 1.0, label: 'Intense', emoji: '🚀' },
];

const ENGINE_RECOMMENDATIONS: Record<string, { name: string; optimal: [number, number] }> = {
  kling: { name: 'Kling', optimal: [0.4, 0.8] },
  veo: { name: 'Veo', optimal: [0.3, 0.7] },
  sora: { name: 'Sora', optimal: [0.2, 0.9] },
  wan: { name: 'Wan', optimal: [0.5, 0.9] },
  luma: { name: 'Luma', optimal: [0.3, 0.6] },
  ltx: { name: 'LTX', optimal: [0.2, 0.5] },
  other: { name: 'Default', optimal: [0.3, 0.7] },
};

export const CompactMotionSlider: React.FC<CompactMotionSliderProps> = ({
  value,
  onChange,
  disabled = false,
  engineType = 'other',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const currentPreset = MOTION_PRESETS.reduce((prev, curr) =>
    Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
  );

  const engineRec = ENGINE_RECOMMENDATIONS[engineType] || ENGINE_RECOMMENDATIONS.other;
  const isOptimal = value >= engineRec.optimal[0] && value <= engineRec.optimal[1];

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(newValue);
  }, [onChange]);

  const handlePresetClick = useCallback((presetValue: number) => {
    if (!disabled) {
      onChange(presetValue);
    }
  }, [disabled, onChange]);

  return (
    <div className={clsx("relative", className)}>
      {/* Compact Trigger */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={clsx(
          "flex items-center gap-2 px-3 rounded-lg border transition-all h-10",
          isOptimal
            ? "bg-green-500/10 border-green-500/30 text-green-400"
            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
        )}
        disabled={disabled}
      >
        <Gauge className="w-4 h-4" />
        <span className="text-xs font-medium">{currentPreset.emoji}</span>
        <span className="text-xs font-medium hidden sm:inline">{value.toFixed(1)}</span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-[#1a1a1a] rounded-xl border border-white/10 shadow-2xl z-50 animate-in slide-in-from-bottom-2 fade-in duration-150">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-300 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-400" />
              Motion Scale
            </span>
            <span className="text-sm font-bold text-blue-400">{value.toFixed(2)}</span>
          </div>

          {/* Slider */}
          <div className="mb-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={value}
              onChange={handleSliderChange}
              disabled={disabled}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/10 accent-blue-500"
              style={{
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${value * 100}%, rgba(255,255,255,0.1) ${value * 100}%, rgba(255,255,255,0.1) 100%)`
              }}
            />
          </div>

          {/* Presets */}
          <div className="grid grid-cols-5 gap-1 mb-3">
            {MOTION_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetClick(preset.value)}
                disabled={disabled}
                className={clsx(
                  "flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all",
                  Math.abs(value - preset.value) < 0.05
                    ? "border-blue-500 bg-blue-500/20"
                    : "border-white/10 hover:border-white/20 hover:bg-white/5",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="text-sm">{preset.emoji}</span>
                <span className="text-[9px] text-gray-400">{preset.label}</span>
              </button>
            ))}
          </div>

          {/* Current Preset Indicator */}
          <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20 mb-2">
            <span className="text-lg">{currentPreset.emoji}</span>
            <div className="flex-1">
              <div className="text-xs font-medium text-white">{currentPreset.label} Motion</div>
            </div>
          </div>

          {/* Engine Recommendation */}
          <div className={clsx(
            "p-2 rounded-lg border text-xs",
            isOptimal
              ? "bg-green-500/10 border-green-500/30"
              : "bg-amber-500/10 border-amber-500/30"
          )}>
            <div className={clsx(
              "font-medium",
              isOptimal ? "text-green-400" : "text-amber-400"
            )}>
              {isOptimal ? '✓ Optimal' : '⚠ Outside range'} for {engineRec.name}
            </div>
            {!isOptimal && (
              <div className="text-gray-400 mt-0.5">
                Recommended: {engineRec.optimal[0].toFixed(1)} - {engineRec.optimal[1].toFixed(1)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompactMotionSlider;
