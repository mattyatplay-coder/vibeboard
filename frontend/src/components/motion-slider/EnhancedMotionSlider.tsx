import React, { useState, useCallback, useEffect } from 'react';
import { Gauge, Info, Zap, Wind, Waves } from 'lucide-react';

interface MotionSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  showRecommendations?: boolean;
  engineType?: 'kling' | 'veo' | 'sora' | 'wan' | 'luma' | 'ltx';
  className?: string;
}

const MOTION_PRESETS = [
  { value: 0.0, label: 'Static', icon: '⏸️', description: 'Minimal to no motion' },
  { value: 0.25, label: 'Subtle', icon: '🍃', description: 'Gentle, slow movements' },
  { value: 0.5, label: 'Moderate', icon: '🌊', description: 'Balanced motion' },
  { value: 0.75, label: 'Dynamic', icon: '⚡', description: 'Active, energetic' },
  { value: 1.0, label: 'Intense', icon: '🚀', description: 'Fast, dramatic motion' },
];

const ENGINE_RECOMMENDATIONS = {
  kling: {
    name: 'Kling',
    optimal: [0.4, 0.8],
    description: 'Works best with moderate to dynamic motion',
  },
  veo: {
    name: 'Google Veo',
    optimal: [0.3, 0.7],
    description: 'Excellent physics simulation at moderate levels',
  },
  sora: {
    name: 'OpenAI Sora',
    optimal: [0.2, 0.9],
    description: 'Handles full range exceptionally well',
  },
  wan: {
    name: 'Wan',
    optimal: [0.5, 0.9],
    description: 'Optimized for dynamic, fast motion',
  },
  luma: {
    name: 'Luma',
    optimal: [0.3, 0.6],
    description: 'Best with subtle to moderate motion',
  },
  ltx: {
    name: 'LTX',
    optimal: [0.2, 0.5],
    description: 'Best with subtle motion',
  },
};

export const EnhancedMotionSlider: React.FC<MotionSliderProps> = ({
  value,
  onChange,
  disabled = false,
  showRecommendations = true,
  engineType = 'kling',
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const currentPreset = MOTION_PRESETS.reduce((prev, curr) =>
    Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
  );

  const engineRec = ENGINE_RECOMMENDATIONS[engineType];
  const isOptimal = value >= engineRec.optimal[0] && value <= engineRec.optimal[1];

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      onChange(newValue);
    },
    [onChange]
  );

  const handlePresetClick = useCallback(
    (presetValue: number) => {
      if (!disabled) {
        onChange(presetValue);
      }
    },
    [disabled, onChange]
  );

  const getMotionDescription = (val: number): string => {
    if (val === 0) return 'Camera locked, subjects may move slightly';
    if (val <= 0.2) return 'Minimal camera movement, very subtle motion';
    if (val <= 0.4) return 'Gentle camera motion, slow pacing';
    if (val <= 0.6) return 'Moderate camera movement, balanced dynamics';
    if (val <= 0.8) return 'Active camera work, energetic motion';
    return 'Fast, dramatic camera movements, intense dynamics';
  };

  const getGradientStyle = () => {
    const percentage = value * 100;
    return {
      background: `linear-gradient(to right, 
        #3B82F6 0%, 
        #3B82F6 ${percentage}%, 
        #E5E7EB ${percentage}%, 
        #E5E7EB 100%)`,
    };
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Gauge className="h-4 w-4" />
          Motion Scale
        </label>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-blue-600">{value.toFixed(2)}</span>
          <button
            onClick={() => setShowTooltip(!showTooltip)}
            className="text-gray-400 transition-colors hover:text-gray-600"
            aria-label="More info"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <p className="mb-1 font-medium">Motion Scale Guide:</p>
          <p className="text-blue-700">{getMotionDescription(value)}</p>
        </div>
      )}

      {/* Main Slider */}
      <div className="relative">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={value}
          onChange={handleSliderChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          disabled={disabled}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg"
          style={getGradientStyle()}
        />

        {/* Slider tick marks */}
        <div className="absolute top-6 right-0 left-0 flex justify-between px-1">
          {[0, 0.25, 0.5, 0.75, 1.0].map(tick => (
            <div key={tick} className="h-2 w-px bg-gray-300" />
          ))}
        </div>
      </div>

      {/* Current Preset Indicator */}
      <div className="flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2">
        <span className="text-2xl">{currentPreset.icon}</span>
        <div>
          <div className="text-sm font-semibold text-gray-900">{currentPreset.label} Motion</div>
          <div className="text-xs text-gray-600">{currentPreset.description}</div>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-5 gap-2">
        {MOTION_PRESETS.map(preset => (
          <button
            key={preset.value}
            onClick={() => handlePresetClick(preset.value)}
            disabled={disabled}
            className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all ${
              value === preset.value
                ? 'border-blue-500 bg-blue-50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} `}
          >
            <span className="text-xl">{preset.icon}</span>
            <span className="text-xs font-medium text-gray-700">{preset.label}</span>
            <span className="text-xs text-gray-500">{preset.value.toFixed(1)}</span>
          </button>
        ))}
      </div>

      {/* Engine Recommendation */}
      {showRecommendations && (
        <div
          className={`rounded-lg border-2 p-3 transition-all ${
            isOptimal ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'
          } `}
        >
          <div className="flex items-start gap-2">
            <div className={`rounded-full p-1 ${isOptimal ? 'bg-green-200' : 'bg-amber-200'} `}>
              {isOptimal ? (
                <Zap className="h-4 w-4 text-green-700" />
              ) : (
                <Info className="h-4 w-4 text-amber-700" />
              )}
            </div>
            <div className="flex-1">
              <div
                className={`text-sm font-medium ${isOptimal ? 'text-green-900' : 'text-amber-900'} `}
              >
                {isOptimal ? 'Optimal for' : 'Outside optimal range for'} {engineRec.name}
              </div>
              <div className={`mt-1 text-xs ${isOptimal ? 'text-green-700' : 'text-amber-700'} `}>
                {engineRec.description}
                {!isOptimal && (
                  <span className="mt-1 block">
                    Recommended: {engineRec.optimal[0].toFixed(1)} -{' '}
                    {engineRec.optimal[1].toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technical Details (Collapsible) */}
      <details className="text-xs text-gray-600">
        <summary className="cursor-pointer font-medium hover:text-gray-900">
          Technical Details
        </summary>
        <div className="mt-2 space-y-1 border-l-2 border-gray-200 pl-4">
          <div>• CFG Scale: Auto-adjusted based on motion</div>
          <div>• Steps: {value < 0.3 ? '30-40' : value < 0.7 ? '40-50' : '50-60'} recommended</div>
          <div>• Frame interpolation: {value > 0.7 ? 'Recommended' : 'Optional'}</div>
          <div>• Motion blur: {value > 0.5 ? 'Natural' : 'Minimal'}</div>
        </div>
      </details>
    </div>
  );
};

export default EnhancedMotionSlider;
