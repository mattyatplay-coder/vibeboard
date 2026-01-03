'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  MapPin,
  BoxSelect,
  Lock,
  Unlock,
  Trash2,
  Plus,
  GripVertical,
  Loader2,
  Check,
  Image,
} from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { Tooltip } from '@/components/ui/Tooltip';

export interface BlockingRegion {
  id: string;
  label: string;
  prompt?: string;
  box: [number, number, number, number]; // [x, y, width, height] as percentages
  locked: boolean;
  color: string;
}

export interface SpatiaLocation {
  id: string;
  name: string;
  type: string;
  thumbnail?: string;
  isLocked: boolean;
}

interface ShotStudioControlsProps {
  projectId: string;
  onLocationSelect: (locationId: string | null) => void;
  onBlockingUpdate: (regions: BlockingRegion[]) => void;
  selectedLocationId?: string | null;
  className?: string;
}

const REGION_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

/**
 * ShotStudioControls - Phase 4B Shot Studio
 *
 * Controls for:
 * 1. Spatia - Select and lock 3D virtual sets for consistent generation
 * 2. ReCo - Draw bounding boxes for precise compositional control
 */
export function ShotStudioControls({
  projectId,
  onLocationSelect,
  onBlockingUpdate,
  selectedLocationId,
  className,
}: ShotStudioControlsProps) {
  // Spatia State
  const [locations, setLocations] = useState<SpatiaLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [lockingId, setLockingId] = useState<string | null>(null);

  // ReCo State
  const [regions, setRegions] = useState<BlockingRegion[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  // Fetch available locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoadingLocations(true);
        const data = await fetchAPI(`/projects/${projectId}/shot-studio/locations`);
        setLocations(data.locations || []);
      } catch (err) {
        console.error('Failed to fetch Spatia locations:', err);
      } finally {
        setLoadingLocations(false);
      }
    };

    fetchLocations();
  }, [projectId]);

  // Handle location selection
  const handleSelectLocation = useCallback(
    (locationId: string) => {
      if (selectedLocationId === locationId) {
        onLocationSelect(null); // Deselect
      } else {
        onLocationSelect(locationId);
      }
    },
    [selectedLocationId, onLocationSelect]
  );

  // Lock/Unlock location
  const handleToggleLock = useCallback(
    async (locationId: string, currentlyLocked: boolean) => {
      setLockingId(locationId);
      try {
        const endpoint = currentlyLocked ? 'unlock' : 'lock';
        await fetchAPI(`/projects/${projectId}/shot-studio/locations/${locationId}/${endpoint}`, {
          method: 'POST',
        });

        // Update local state
        setLocations(prev =>
          prev.map(loc => (loc.id === locationId ? { ...loc, isLocked: !currentlyLocked } : loc))
        );
      } catch (err) {
        console.error('Failed to toggle location lock:', err);
      } finally {
        setLockingId(null);
      }
    },
    [projectId]
  );

  // Add new blocking region
  const handleAddRegion = useCallback(() => {
    const newRegion: BlockingRegion = {
      id: `region-${Date.now()}`,
      label: 'New Object',
      prompt: '',
      box: [20, 20, 30, 30], // Default centered box
      locked: false,
      color: REGION_COLORS[regions.length % REGION_COLORS.length],
    };

    const updated = [...regions, newRegion];
    setRegions(updated);
    onBlockingUpdate(updated);
  }, [regions, onBlockingUpdate]);

  // Update region
  const handleUpdateRegion = useCallback(
    (regionId: string, updates: Partial<BlockingRegion>) => {
      const updated = regions.map(r => (r.id === regionId ? { ...r, ...updates } : r));
      setRegions(updated);
      onBlockingUpdate(updated);
    },
    [regions, onBlockingUpdate]
  );

  // Delete region
  const handleDeleteRegion = useCallback(
    (regionId: string) => {
      const updated = regions.filter(r => r.id !== regionId);
      setRegions(updated);
      onBlockingUpdate(updated);
    },
    [regions, onBlockingUpdate]
  );

  // Toggle region lock
  const handleToggleRegionLock = useCallback(
    (regionId: string) => {
      const region = regions.find(r => r.id === regionId);
      if (region) {
        handleUpdateRegion(regionId, { locked: !region.locked });
      }
    },
    [regions, handleUpdateRegion]
  );

  return (
    <div className={clsx('space-y-4', className)}>
      {/* === Spatia: Virtual Set Selection === */}
      <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-4 backdrop-blur-sm">
        <label className="mb-3 flex items-center gap-2 text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
          <MapPin className="h-3.5 w-3.5 text-cyan-400" />
          Virtual Set (Spatia)
        </label>

        {loadingLocations ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          </div>
        ) : locations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 py-6 text-center">
            <Image className="mx-auto h-8 w-8 text-gray-600" />
            <p className="mt-2 text-sm text-gray-500">No locations available</p>
            <p className="text-xs text-gray-600">
              Add 3D models or images tagged as "location" in Asset Bin
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {locations.map(location => {
              const isSelected = selectedLocationId === location.id;

              return (
                <motion.div
                  key={location.id}
                  className={clsx(
                    'relative cursor-pointer overflow-hidden rounded-lg border transition-all',
                    isSelected
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectLocation(location.id)}
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-zinc-800">
                    {location.thumbnail ? (
                      <img
                        src={location.thumbnail}
                        alt={location.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <MapPin className="h-8 w-8 text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Info Overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-xs font-medium text-white">
                        {location.name}
                      </span>
                      <Tooltip content={location.isLocked ? 'Unlock Set' : 'Lock Set'}>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleToggleLock(location.id, location.isLocked);
                          }}
                          disabled={lockingId === location.id}
                          className={clsx(
                            'rounded p-1 transition-colors',
                            location.isLocked
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'text-gray-400 hover:bg-white/10'
                          )}
                        >
                          {lockingId === location.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : location.isLocked ? (
                            <Lock className="h-3 w-3" />
                          ) : (
                            <Unlock className="h-3 w-3" />
                          )}
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 rounded-full bg-cyan-500 p-1"
                    >
                      <Check className="h-3 w-3 text-white" />
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        <p className="mt-2 text-[10px] text-zinc-600">Locks geometry for pans and continuity.</p>
      </div>

      {/* === ReCo: Region Blocking === */}
      <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-4 backdrop-blur-sm">
        <label className="mb-3 flex items-center gap-2 text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
          <BoxSelect className="h-3.5 w-3.5 text-violet-400" />
          Region Blocking (ReCo)
        </label>

        <button
          onClick={handleAddRegion}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/5 py-2 text-xs font-medium text-violet-400 transition-colors hover:border-violet-500/30 hover:bg-violet-500/10"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Bounding Box
        </button>

        {/* Regions List */}
        <AnimatePresence>
          {regions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2"
            >
              {regions.map((region, index) => (
                <motion.div
                  key={region.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="group flex items-center gap-2 rounded-lg bg-zinc-800 p-2"
                >
                  {/* Drag Handle */}
                  <GripVertical className="h-4 w-4 cursor-grab text-gray-600" />

                  {/* Color Indicator */}
                  <div
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: region.color }}
                  />

                  {/* Label Input */}
                  <input
                    type="text"
                    value={region.label}
                    onChange={e => handleUpdateRegion(region.id, { label: e.target.value })}
                    placeholder="Object label..."
                    className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
                  />

                  {/* Lock Button */}
                  <Tooltip content={region.locked ? 'Unlock Region' : 'Lock Region'}>
                    <button
                      onClick={() => handleToggleRegionLock(region.id)}
                      className={clsx(
                        'rounded p-1 transition-colors',
                        region.locked
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'text-gray-500 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      {region.locked ? (
                        <Lock className="h-3 w-3" />
                      ) : (
                        <Unlock className="h-3 w-3" />
                      )}
                    </button>
                  </Tooltip>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteRegion(region.id)}
                    className="rounded p-1 text-gray-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {regions.length > 0 && (
          <p className="mt-2 text-[10px] text-gray-500">
            Draw boxes on preview to define precise object placement.
          </p>
        )}
      </div>

      {/* Mode Summary - Moved to parent component for unified look */}
    </div>
  );
}
