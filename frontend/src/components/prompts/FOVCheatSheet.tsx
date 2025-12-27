'use client';

/**
 * FOV Cheat Sheet - Visual Field of View Reference
 *
 * Displays an SVG visualization showing how different focal lengths
 * affect the field of view. Uses cone diagrams to illustrate the
 * relationship between focal length and angle of view.
 *
 * Key focal lengths and their approximate horizontal FOV (on full frame):
 * - 14mm: 114° (ultra wide)
 * - 24mm: 84° (wide)
 * - 35mm: 63° (wide normal)
 * - 50mm: 46° (normal - human eye equivalent)
 * - 85mm: 28° (portrait)
 * - 135mm: 18° (telephoto)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Aperture, X, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { LENS_PRESETS, LensPreset, LENS_CATEGORY_COLORS } from '@/data/LensPresets';

// FOV data for each focal length (horizontal FOV on full frame sensor)
const FOV_DATA: Record<number, { fov: number; description: string }> = {
  14: { fov: 114, description: 'Ultra-wide: Entire room visible, dramatic distortion' },
  24: { fov: 84, description: 'Wide: Environment context, slight distortion' },
  35: { fov: 63, description: 'Wide Normal: Documentary feel, natural perspective' },
  50: { fov: 46, description: 'Normal: Human eye equivalent, balanced view' },
  85: { fov: 28, description: 'Portrait: Subject isolation, flattering compression' },
  135: { fov: 18, description: 'Telephoto: Extreme compression, intimate framing' },
};

interface FOVCheatSheetProps {
  selectedLens?: LensPreset | null;
  onLensSelect?: (lens: LensPreset) => void;
  compact?: boolean;
}

// SVG Cone Component for a single focal length
function FOVCone({
  focalMm,
  fov,
  isSelected,
  color,
  onClick,
}: {
  focalMm: number;
  fov: number;
  isSelected: boolean;
  color: string;
  onClick?: () => void;
}) {
  // Calculate cone geometry
  const coneLength = 100;
  const halfAngle = (fov / 2) * (Math.PI / 180);
  const coneWidth = Math.tan(halfAngle) * coneLength * 2;

  // Normalize width for display (max width = 200)
  const normalizedWidth = Math.min((coneWidth / 200) * 180, 180);

  return (
    <g
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      className={clsx('transition-opacity', onClick && 'hover:opacity-100')}
    >
      {/* Cone shape */}
      <polygon
        points={`0,0 ${normalizedWidth / 2},${coneLength} ${-normalizedWidth / 2},${coneLength}`}
        className={clsx(
          'transition-all duration-300',
          isSelected ? 'opacity-60' : 'opacity-25'
        )}
        fill={color}
        stroke={color}
        strokeWidth={isSelected ? 2 : 1}
      />
      {/* Center line */}
      <line
        x1="0"
        y1="0"
        x2="0"
        y2={coneLength}
        stroke={color}
        strokeWidth={isSelected ? 2 : 1}
        strokeDasharray={isSelected ? 'none' : '3,3'}
        opacity={isSelected ? 0.8 : 0.4}
      />
      {/* Label */}
      <text
        x="0"
        y={coneLength + 15}
        textAnchor="middle"
        className={clsx(
          'text-[10px] font-medium transition-colors',
          isSelected ? 'fill-white' : 'fill-gray-500'
        )}
      >
        {focalMm}mm
      </text>
      {/* FOV angle arc */}
      {isSelected && (
        <path
          d={`M ${-20} 25 A 25 25 0 0 1 ${20} 25`}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          opacity="0.8"
        />
      )}
      {/* FOV label when selected */}
      {isSelected && (
        <text
          x="0"
          y={coneLength + 28}
          textAnchor="middle"
          className="fill-gray-400 text-[9px]"
        >
          {fov}° FOV
        </text>
      )}
    </g>
  );
}

export function FOVCheatSheet({
  selectedLens,
  onLensSelect,
  compact = false,
}: FOVCheatSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredLens, setHoveredLens] = useState<number | null>(null);

  const selectedMm = selectedLens?.focalMm || null;
  const displayMm = hoveredLens || selectedMm;

  // Color mapping based on category
  const getColor = (focalMm: number): string => {
    if (focalMm <= 14) return '#ef4444'; // red - ultra-wide
    if (focalMm <= 24) return '#f97316'; // orange - wide
    if (focalMm <= 35) return '#eab308'; // yellow - wide
    if (focalMm <= 50) return '#22c55e'; // green - normal
    if (focalMm <= 85) return '#a855f7'; // purple - portrait
    return '#3b82f6'; // blue - telephoto
  };

  // Compact button for toolbar
  if (compact && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-gray-400 transition-all hover:scale-105 hover:bg-white/10"
        title="FOV Cheat Sheet - Visual Field of View Reference"
      >
        <Eye className="h-4 w-4" />
        <span className="text-xs font-medium">FOV</span>
      </button>
    );
  }

  const content = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">Field of View Reference</h2>
        </div>
        {compact && (
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Info Banner */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-cyan-950/20 px-4 py-2">
        <Info className="h-4 w-4 text-cyan-500" />
        <span className="text-[11px] text-cyan-400/80">
          Wider angles = more environment. Longer lenses = subject isolation.
        </span>
      </div>

      {/* SVG Visualization */}
      <div className="flex flex-1 items-center justify-center bg-black/30 p-4">
        <svg
          viewBox="-120 -10 240 150"
          className="h-full max-h-[200px] w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Camera icon at apex */}
          <circle cx="0" cy="-5" r="4" className="fill-gray-500" />

          {/* Render all cones, selected last for z-index */}
          {Object.entries(FOV_DATA)
            .sort(([, a], [, b]) => b.fov - a.fov) // Wide first (background)
            .map(([mm, data]) => {
              const focalMm = parseInt(mm);
              const lens = LENS_PRESETS.find(l => l.focalMm === focalMm);
              const isSelected = displayMm === focalMm;

              return (
                <FOVCone
                  key={mm}
                  focalMm={focalMm}
                  fov={data.fov}
                  isSelected={isSelected}
                  color={getColor(focalMm)}
                  onClick={lens && onLensSelect ? () => onLensSelect(lens) : undefined}
                />
              );
            })}

          {/* Scene representation at bottom */}
          <line
            x1="-100"
            y1="100"
            x2="100"
            y2="100"
            stroke="white"
            strokeWidth="1"
            opacity="0.3"
            strokeDasharray="5,5"
          />
          <text
            x="0"
            y="98"
            textAnchor="middle"
            className="fill-gray-600 text-[8px]"
          >
            SCENE
          </text>
        </svg>
      </div>

      {/* Lens Selection Grid */}
      <div className="border-t border-white/10 p-4">
        <div className="mb-2 text-[10px] tracking-wider text-gray-500 uppercase">
          CLICK TO SELECT LENS
        </div>
        <div className="grid grid-cols-6 gap-2">
          {LENS_PRESETS.map(lens => {
            const data = FOV_DATA[lens.focalMm];
            const isSelected = selectedLens?.id === lens.id;
            const isHovered = hoveredLens === lens.focalMm;

            return (
              <button
                key={lens.id}
                onClick={() => onLensSelect?.(lens)}
                onMouseEnter={() => setHoveredLens(lens.focalMm)}
                onMouseLeave={() => setHoveredLens(null)}
                className={clsx(
                  'flex flex-col items-center rounded-lg border p-2 transition-all',
                  isSelected
                    ? 'border-cyan-500/50 bg-cyan-500/20'
                    : isHovered
                      ? 'border-white/30 bg-white/10'
                      : 'border-white/10 bg-white/5'
                )}
              >
                <span className="text-sm font-bold text-white">{lens.focalLength}</span>
                <span className="text-[9px] text-gray-500">{data?.fov}°</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Lens Details */}
      {displayMm && FOV_DATA[displayMm] && (
        <div className="border-t border-white/10 bg-black/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <span
                className="mr-2 inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: getColor(displayMm) }}
              />
              <span className="font-mono text-lg font-bold text-white">{displayMm}mm</span>
              <span className="ml-2 text-sm text-gray-400">= {FOV_DATA[displayMm].fov}° horizontal FOV</span>
            </div>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">{FOV_DATA[displayMm].description}</p>
        </div>
      )}
    </div>
  );

  if (compact) {
    return (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-h-[85vh] w-[380px] overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
            >
              {content}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  // Embedded mode (for side panel)
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-[90vh] w-[380px] overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
    >
      {content}
    </motion.div>
  );
}

// Compact inline preview showing FOV comparison
export function FOVMiniPreview({ focalMm }: { focalMm: number }) {
  const data = FOV_DATA[focalMm];
  if (!data) return null;

  // Calculate width ratio (14mm = 100%, 135mm = ~16%)
  const widthPercent = Math.round((data.fov / 114) * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-16 overflow-hidden rounded-full bg-white/10">
        <div
          className="absolute top-0 left-1/2 h-full -translate-x-1/2 rounded-full bg-cyan-500/60"
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <span className="text-[9px] text-gray-500">{data.fov}°</span>
    </div>
  );
}
