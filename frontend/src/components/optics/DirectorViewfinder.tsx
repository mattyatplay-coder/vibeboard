'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Check, Aperture } from 'lucide-react';
import { clsx } from 'clsx';
import {
  CAMERA_DATABASE,
  LENS_FAMILIES,
  CameraSpec,
  LensFamily,
  LookProfile,
  buildCinematicModifier,
} from '@/data/CameraDatabase';

// ============================================================================
// LOOK PROFILE UTILITIES
// ============================================================================

/**
 * Generates CSS filter string from a camera's look profile
 * Use this to apply camera color science to any image element
 */
export function getLookFilterStyle(camera: CameraSpec | null): React.CSSProperties {
  if (!camera?.look_profile) {
    return {};
  }

  const { filter, grainIntensity } = camera.look_profile;

  return {
    filter,
    // Add subtle noise texture via opacity-based overlay
    ...(grainIntensity > 0 &&
      ({
        '--grain-opacity': grainIntensity,
      } as React.CSSProperties)),
  };
}

/**
 * Get a human-readable description of the camera look
 */
export function getLookDescription(camera: CameraSpec | null): string {
  if (!camera?.look_profile) return 'Default rendering';

  const { highlightRolloff, shadowTone, skinToneShift } = camera.look_profile;

  const parts: string[] = [];

  if (highlightRolloff === 'soft') parts.push('Soft highlights');
  else if (highlightRolloff === 'hard') parts.push('Hard highlights');

  if (shadowTone === 'warm') parts.push('Warm shadows');
  else if (shadowTone === 'cool') parts.push('Cool shadows');
  else if (shadowTone === 'green') parts.push('Green shadow bias');

  if (skinToneShift > 2) parts.push('Warm skin tones');
  else if (skinToneShift < -1) parts.push('Cool skin tones');

  return parts.length > 0 ? parts.join(' • ') : 'Neutral rendering';
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DirectorViewfinderProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCamera: CameraSpec | null;
  selectedLensFamily: LensFamily | null;
  selectedFocalLength: number | null;
  onApply: (
    camera: CameraSpec | null,
    lensFamily: LensFamily | null,
    focalLength: number | null,
    modifier: string
  ) => void;
}

// ============================================================================
// CARD BUTTON COMPONENT
// ============================================================================

interface CardButtonProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  isAnamorphic?: boolean;
  meta?: string;
  imageSrc?: string;
  iconSrc?: string;
}

function CardButton({
  selected,
  onClick,
  title,
  subtitle,
  badge,
  badgeColor = 'bg-white/10 text-gray-400',
  isAnamorphic,
  meta,
  imageSrc,
  iconSrc,
}: CardButtonProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full rounded-xl border p-3 text-left transition-all duration-200',
        selected
          ? isAnamorphic
            ? 'border-blue-500/60 bg-blue-500/20 ring-1 ring-blue-500/30'
            : 'border-cyan-500/60 bg-cyan-500/20 ring-1 ring-cyan-500/30'
          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Product Image or Brand Icon */}
        {(imageSrc || iconSrc) && (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/5">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={title}
                className="h-full w-full object-cover"
                onError={e => {
                  // Fallback to icon or hide on error
                  const target = e.currentTarget;
                  if (iconSrc) {
                    target.src = iconSrc;
                    target.classList.remove('object-cover');
                    target.classList.add('object-contain', 'p-2', 'opacity-60');
                  } else {
                    target.style.display = 'none';
                  }
                }}
              />
            ) : (
              iconSrc && (
                <img
                  src={iconSrc}
                  alt={title}
                  className="h-full w-full object-contain p-2 opacity-60"
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )
            )}
          </div>
        )}

        <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-white">{title}</span>
              {isAnamorphic && (
                <span className="shrink-0 rounded-full bg-blue-500/30 px-1.5 py-0.5 text-[9px] font-bold text-blue-300 uppercase">
                  Anamorphic
                </span>
              )}
            </div>
            {subtitle && <p className="mt-0.5 truncate text-[11px] text-gray-400">{subtitle}</p>}
            {meta && <p className="mt-1 text-[10px] text-gray-500">{meta}</p>}
          </div>
          {badge && (
            <span
              className={clsx(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                badgeColor
              )}
            >
              {badge}
            </span>
          )}
          {selected && (
            <div className="shrink-0 rounded-full bg-cyan-500 p-0.5">
              <Check className="h-3 w-3 text-black" />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DirectorViewfinder({
  isOpen,
  onClose,
  selectedCamera: initialCamera,
  selectedLensFamily: initialLensFamily,
  selectedFocalLength: initialFocalLength,
  onApply,
}: DirectorViewfinderProps) {
  // ========================================================================
  // STATE - Local selections (applied on confirm)
  // ========================================================================
  const [camera, setCamera] = useState<CameraSpec | null>(initialCamera);
  const [lensFamily, setLensFamily] = useState<LensFamily | null>(initialLensFamily);
  const [focalLength, setFocalLength] = useState<number | null>(initialFocalLength);

  // Sync local state when props change
  useMemo(() => {
    setCamera(initialCamera);
    setLensFamily(initialLensFamily);
    setFocalLength(initialFocalLength);
  }, [initialCamera, initialLensFamily, initialFocalLength]);

  // ========================================================================
  // COMPUTED DATA
  // ========================================================================

  // Get available focal lengths from selected lens family
  const availableFocalLengths = useMemo(() => {
    if (!lensFamily) return [];
    return [...lensFamily.focal_lengths].sort((a, b) => a - b);
  }, [lensFamily]);

  // Build the cinematic modifier for preview
  const cinematicModifier = useMemo(() => {
    if (!camera && !lensFamily) return '';

    // Build a lens ID from family + focal length
    const lensId = lensFamily && focalLength ? `${lensFamily.id}_${focalLength}mm` : undefined;

    return buildCinematicModifier(camera?.id || '', lensId || '');
  }, [camera, lensFamily, focalLength]);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const handleCameraSelect = useCallback(
    (cam: CameraSpec) => {
      setCamera(camera?.id === cam.id ? null : cam);
    },
    [camera]
  );

  const handleLensFamilySelect = useCallback(
    (family: LensFamily) => {
      if (lensFamily?.id === family.id) {
        setLensFamily(null);
        setFocalLength(null);
      } else {
        setLensFamily(family);
        // Auto-select first focal length if available
        if (family.focal_lengths.length > 0) {
          setFocalLength(family.focal_lengths[0]);
        }
      }
    },
    [lensFamily]
  );

  const handleFocalLengthSelect = useCallback(
    (fl: number) => {
      setFocalLength(focalLength === fl ? null : fl);
    },
    [focalLength]
  );

  const handleApply = useCallback(() => {
    onApply(camera, lensFamily, focalLength, cinematicModifier);
    onClose();
  }, [camera, lensFamily, focalLength, cinematicModifier, onApply, onClose]);

  const handleClear = useCallback(() => {
    setCamera(null);
    setLensFamily(null);
    setFocalLength(null);
  }, []);

  // ========================================================================
  // CATEGORY BADGES
  // ========================================================================

  const getCategoryBadge = (category: CameraSpec['category']) => {
    const badges: Record<string, { label: string; color: string }> = {
      cinema: { label: 'Cinema', color: 'bg-red-500/20 text-red-300' },
      mirrorless: { label: 'Mirrorless', color: 'bg-blue-500/20 text-blue-300' },
      dslr: { label: 'DSLR', color: 'bg-amber-500/20 text-amber-300' },
      phone: { label: 'Phone', color: 'bg-green-500/20 text-green-300' },
      action: { label: 'Action', color: 'bg-purple-500/20 text-purple-300' },
      medium_format: { label: 'Medium Format', color: 'bg-pink-500/20 text-pink-300' },
    };
    return badges[category] || { label: category, color: 'bg-white/10 text-gray-400' };
  };

  const getLensTypeBadge = (type: LensFamily['type']) => {
    const badges: Record<string, { label: string; color: string }> = {
      prime: { label: 'Prime', color: 'bg-cyan-500/20 text-cyan-300' },
      zoom: { label: 'Zoom', color: 'bg-orange-500/20 text-orange-300' },
      anamorphic: { label: '2x', color: 'bg-blue-500/20 text-blue-300' },
      vintage: { label: 'Vintage', color: 'bg-amber-500/20 text-amber-300' },
      specialty: { label: 'Specialty', color: 'bg-purple-500/20 text-purple-300' },
    };
    return badges[type] || { label: type, color: 'bg-white/10 text-gray-400' };
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
            className="flex max-h-[90vh] w-[95vw] max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 p-2.5">
                  <Camera className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Director's Viewfinder</h2>
                  <p className="text-xs text-gray-500">
                    Select camera body, lens family, and focal length
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Three Column Grid */}
            <div className="grid min-h-0 flex-1 grid-cols-3 divide-x divide-white/10 overflow-hidden">
              {/* COLUMN 1: CAMERA BODY */}
              <div className="flex min-h-0 flex-col overflow-hidden">
                <div className="shrink-0 border-b border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-cyan-400" />
                    <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                      Camera Body
                    </span>
                  </div>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
                  {CAMERA_DATABASE.map(cam => {
                    const badge = getCategoryBadge(cam.category);
                    return (
                      <CardButton
                        key={cam.id}
                        selected={camera?.id === cam.id}
                        onClick={() => handleCameraSelect(cam)}
                        title={`${cam.brand} ${cam.model}`}
                        subtitle={cam.log_color_space}
                        badge={badge.label}
                        badgeColor={badge.color}
                        meta={`${cam.resolution} • ISO ${cam.base_iso}`}
                        imageSrc={cam.image_url}
                        iconSrc={cam.icon_url}
                      />
                    );
                  })}
                </div>
              </div>

              {/* COLUMN 2: LENS FAMILY */}
              <div className="flex min-h-0 flex-col overflow-hidden">
                <div className="shrink-0 border-b border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Aperture className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                      Lens Family
                    </span>
                  </div>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
                  {LENS_FAMILIES.map(family => {
                    const badge = getLensTypeBadge(family.type);
                    return (
                      <CardButton
                        key={family.id}
                        selected={lensFamily?.id === family.id}
                        onClick={() => handleLensFamilySelect(family)}
                        title={`${family.brand} ${family.name}`}
                        subtitle={`T${family.min_t_stop.toFixed(1)} • ${family.focal_lengths.length} focal lengths`}
                        badge={badge.label}
                        badgeColor={badge.color}
                        isAnamorphic={family.is_anamorphic}
                        meta={family.flare_color ? `${family.flare_color} flare` : undefined}
                        imageSrc={family.image_url}
                        iconSrc={family.icon_url}
                      />
                    );
                  })}
                </div>
              </div>

              {/* COLUMN 3: FOCAL LENGTH */}
              <div className="flex min-h-0 flex-col overflow-hidden">
                <div className="shrink-0 border-b border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-amber-400">mm</span>
                      <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                        Focal Length
                      </span>
                    </div>
                    {/* Glass Type Indicator */}
                    {lensFamily && (
                      <span
                        className={clsx(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase',
                          lensFamily.is_anamorphic
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-cyan-500/20 text-cyan-300'
                        )}
                      >
                        {lensFamily.is_anamorphic ? 'Anamorphic' : 'Spherical'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {availableFocalLengths.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {availableFocalLengths.map(fl => (
                        <button
                          key={fl}
                          onClick={() => handleFocalLengthSelect(fl)}
                          className={clsx(
                            'rounded-xl border px-3 py-3 font-mono text-sm font-medium transition-all duration-200',
                            focalLength === fl
                              ? lensFamily?.is_anamorphic
                                ? 'border-blue-500/60 bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30'
                                : 'border-cyan-500/60 bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30'
                              : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10'
                          )}
                        >
                          {fl}mm
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-center text-sm text-gray-500">
                        Select a lens family to
                        <br />
                        see available focal lengths
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 bg-black/30 px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Selection Summary */}
                <div className="flex-1">
                  {camera || lensFamily || focalLength ? (
                    <div>
                      <div className="mb-1 text-[10px] font-medium tracking-wider text-gray-500 uppercase">
                        Current Selection
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {camera && (
                          <span className="rounded-lg bg-cyan-500/20 px-2 py-1 text-xs font-medium text-cyan-300">
                            {camera.brand} {camera.model}
                          </span>
                        )}
                        {lensFamily && (
                          <span
                            className={clsx(
                              'rounded-lg px-2 py-1 text-xs font-medium',
                              lensFamily.is_anamorphic
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-white/10 text-gray-300'
                            )}
                          >
                            {lensFamily.brand} {lensFamily.name}
                          </span>
                        )}
                        {focalLength && (
                          <span className="rounded-lg bg-amber-500/20 px-2 py-1 font-mono text-xs font-medium text-amber-300">
                            {focalLength}mm
                          </span>
                        )}
                      </div>
                      {/* Prompt Keywords Preview */}
                      {cinematicModifier && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {cinematicModifier
                            .split(', ')
                            .slice(0, 5)
                            .map((kw, i) => (
                              <span
                                key={i}
                                className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-gray-500"
                              >
                                {kw}
                              </span>
                            ))}
                          {cinematicModifier.split(', ').length > 5 && (
                            <span className="text-[9px] text-gray-600">
                              +{cinematicModifier.split(', ').length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                      {/* Camera Look Profile Indicator */}
                      {camera?.look_profile && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="h-6 w-10 rounded border border-white/20 bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600"
                              style={getLookFilterStyle(camera)}
                              title="Color Science Preview"
                            />
                            <span className="text-[9px] text-gray-500">
                              {getLookDescription(camera)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No selection — using default rendering</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClear}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleApply}
                    className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 hover:shadow-cyan-500/30"
                  >
                    Apply Selection
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// COMPACT TRIGGER BUTTON
// ============================================================================

interface ViewfinderTriggerProps {
  camera: CameraSpec | null;
  lensFamily: LensFamily | null;
  focalLength: number | null;
  onClick: () => void;
}

export function ViewfinderTrigger({
  camera,
  lensFamily,
  focalLength,
  onClick,
}: ViewfinderTriggerProps) {
  const hasSelection = camera || lensFamily;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-2 rounded-xl border px-3 transition-all hover:scale-[1.02]',
        hasSelection
          ? 'border-cyan-500/30 bg-cyan-500/10 py-2 text-cyan-400'
          : 'h-10 border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
      )}
    >
      <Camera className="h-4 w-4 shrink-0" />
      {hasSelection ? (
        <div className="flex min-w-0 flex-1 flex-col items-start">
          {/* Camera line */}
          {camera && (
            <span className="truncate text-xs font-medium text-cyan-400">
              {camera.brand} {camera.model}
            </span>
          )}
          {/* Lens line */}
          {lensFamily && (
            <div className="flex items-center gap-1.5">
              <span
                className={clsx(
                  'truncate text-[11px]',
                  lensFamily.is_anamorphic ? 'text-blue-300' : 'text-gray-400'
                )}
              >
                {lensFamily.brand} {lensFamily.name}
              </span>
              {focalLength && (
                <span className="rounded-full bg-cyan-500/30 px-1.5 py-0.5 font-mono text-[9px]">
                  {focalLength}mm
                </span>
              )}
              {lensFamily.is_anamorphic && (
                <span className="rounded-full bg-blue-500/30 px-1 py-0.5 text-[8px] font-bold text-blue-300">
                  A
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <span className="truncate text-xs font-medium">Camera and Lens</span>
      )}
    </button>
  );
}

export default DirectorViewfinder;
