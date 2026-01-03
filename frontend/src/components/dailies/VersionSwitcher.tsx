'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Star, Check } from 'lucide-react';
import clsx from 'clsx';

interface VersionInfo {
  version: number;
  generationId: string;
  generation: {
    id: string;
    inputPrompt: string;
    outputs: string | null;
    status: string;
    createdAt: string;
    rating: number | null;
  };
  isCurrent: boolean;
}

interface VersionSwitcherProps {
  generationId: string;
  onVersionSelect?: (generationId: string) => void;
  compact?: boolean;
  className?: string;
}

export function VersionSwitcher({
  generationId,
  onVersionSelect,
  compact = false,
  className,
}: VersionSwitcherProps) {
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sceneId, setSceneId] = useState<string | null>(null);

  // Find current version index
  const currentIndex = versions.findIndex(v => v.isCurrent);
  const currentVersion = versions[currentIndex];

  // Fetch versions
  const fetchVersions = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/generations/${generationId}/versions`);
      const data = await res.json();
      if (data.success) {
        setVersions(data.versions);
        setSceneId(data.sceneId);
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [generationId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // Navigate to previous version
  const goToPrev = useCallback(() => {
    if (currentIndex < versions.length - 1) {
      const prevVersion = versions[currentIndex + 1];
      onVersionSelect?.(prevVersion.generationId);
    }
  }, [currentIndex, versions, onVersionSelect]);

  // Navigate to next version
  const goToNext = useCallback(() => {
    if (currentIndex > 0) {
      const nextVersion = versions[currentIndex - 1];
      onVersionSelect?.(nextVersion.generationId);
    }
  }, [currentIndex, versions, onVersionSelect]);

  // Parse outputs to get thumbnail
  const getThumbnail = (outputs: string | null): string | null => {
    if (!outputs) return null;
    try {
      const parsed = JSON.parse(outputs);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0].thumbnail_url || parsed[0].url;
      }
    } catch {
      return null;
    }
    return null;
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className={clsx('animate-pulse rounded-lg bg-white/5 p-2', className)}>
        <div className="h-4 w-20 rounded bg-white/10" />
      </div>
    );
  }

  if (versions.length <= 1) {
    // Only one version - show minimal indicator
    return compact ? null : (
      <div className={clsx('flex items-center gap-1 text-xs text-gray-500', className)}>
        <Clock className="h-3 w-3" />
        v1
      </div>
    );
  }

  // Compact mode: just show version number with arrows
  if (compact) {
    return (
      <div className={clsx('flex items-center gap-1', className)}>
        <button
          onClick={e => {
            e.stopPropagation();
            goToPrev();
          }}
          disabled={currentIndex >= versions.length - 1}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white hover:bg-white/20"
        >
          v{currentVersion?.version || 1}
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            goToNext();
          }}
          disabled={currentIndex <= 0}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Expanded dropdown */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 z-50 mt-2 w-64 rounded-xl border border-white/10 bg-zinc-900/95 shadow-xl backdrop-blur-sm"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-2">
                <h4 className="mb-2 px-2 text-xs font-medium text-gray-400">
                  Version History ({versions.length})
                </h4>
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {versions.map(version => {
                    const thumbnail = getThumbnail(version.generation.outputs);
                    return (
                      <button
                        key={version.generationId}
                        onClick={() => {
                          onVersionSelect?.(version.generationId);
                          setIsExpanded(false);
                        }}
                        className={clsx(
                          'flex w-full items-center gap-3 rounded-lg p-2 transition-colors',
                          version.isCurrent
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'text-gray-300 hover:bg-white/10'
                        )}
                      >
                        {/* Thumbnail */}
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-black/50">
                          {thumbnail ? (
                            <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-gray-600">
                              v{version.version}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Version {version.version}</span>
                            {version.isCurrent && <Check className="h-3 w-3 text-cyan-400" />}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{formatDate(version.generation.createdAt)}</span>
                            {version.generation.rating && (
                              <span className="flex items-center gap-0.5">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {version.generation.rating}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full mode: show full version strip
  return (
    <div className={clsx('rounded-xl border border-white/10 bg-zinc-900/80 p-3', className)}>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium text-white">
          Version History
          {sceneId && <span className="ml-2 text-xs text-gray-500">(Scene)</span>}
        </h4>
        <div className="flex items-center gap-1">
          <button
            onClick={goToPrev}
            disabled={currentIndex >= versions.length - 1}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-sm text-gray-400">
            {currentVersion?.version || 1} of {versions.length}
          </span>
          <button
            onClick={goToNext}
            disabled={currentIndex <= 0}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Version thumbnails strip */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {versions.map(version => {
          const thumbnail = getThumbnail(version.generation.outputs);
          return (
            <button
              key={version.generationId}
              onClick={() => onVersionSelect?.(version.generationId)}
              className={clsx(
                'group relative flex-shrink-0 overflow-hidden rounded-lg transition-all',
                version.isCurrent
                  ? 'ring-2 ring-cyan-400'
                  : 'ring-1 ring-white/10 hover:ring-white/30'
              )}
            >
              <div className="h-16 w-16 bg-black/50">
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={`Version ${version.version}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-600">
                    v{version.version}
                  </div>
                )}
              </div>
              <div
                className={clsx(
                  'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1 text-center text-xs',
                  version.isCurrent ? 'text-cyan-300' : 'text-gray-400'
                )}
              >
                v{version.version}
              </div>
              {version.generation.rating && (
                <div className="absolute top-1 right-1 flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5 text-xs">
                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                  <span className="text-white">{version.generation.rating}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default VersionSwitcher;
