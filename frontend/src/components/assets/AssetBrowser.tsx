'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search, Filter, Plus, Grid, List, SortAsc, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { MediaCard, Asset } from './MediaCard';
import { Skeleton } from '@/components/ui/Skeleton';

interface AssetBrowserProps {
  /** Assets to display */
  assets?: Asset[];
  /** Loading state */
  isLoading?: boolean;
  /** Called when assets are imported via drag & drop or file picker */
  onImport?: (files: FileList) => void;
  /** Called when an asset is deleted */
  onDelete?: (id: string) => void;
  /** Called when an asset is double-clicked (open in editor) */
  onOpen?: (asset: Asset) => void;
  /** Called when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** Title for the browser header */
  title?: string;
  /** Whether to show the import button */
  showImport?: boolean;
  /** Compact mode for panels */
  compact?: boolean;
}

type ViewMode = 'grid' | 'list';
type SortMode = 'name' | 'date' | 'type';

/**
 * AssetBrowser - Light Table Media Grid
 *
 * A reactive media grid with hover-scrub preview and multi-select support.
 * Supports drag & drop import and keyboard navigation.
 *
 * @example
 * <AssetBrowser
 *   assets={projectAssets}
 *   onImport={handleImport}
 *   onDelete={handleDelete}
 *   onOpen={handleOpenInEditor}
 * />
 */
export const AssetBrowser = ({
  assets = [],
  isLoading = false,
  onImport,
  onDelete,
  onOpen,
  onSelectionChange,
  title = 'Assets',
  showImport = true,
  compact = false,
}: AssetBrowserProps) => {
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange?.(selection);
  }, [selection, onSelectionChange]);

  // Toggle selection with multi-select support (Cmd/Ctrl + click)
  const handleSelect = useCallback(
    (id: string, e: React.MouseEvent) => {
      const isMulti = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;

      setSelection(prev => {
        const newSet = new Set(isMulti ? prev : []);

        if (isShift && prev.size > 0) {
          // Range select
          const ids = assets.map(a => a.id);
          const lastSelected = Array.from(prev).pop();
          const lastIdx = ids.indexOf(lastSelected || '');
          const currentIdx = ids.indexOf(id);

          if (lastIdx !== -1 && currentIdx !== -1) {
            const start = Math.min(lastIdx, currentIdx);
            const end = Math.max(lastIdx, currentIdx);
            for (let i = start; i <= end; i++) {
              newSet.add(ids[i]);
            }
          }
        } else if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }

        return newSet;
      });
    },
    [assets]
  );

  // Filter assets by search
  const filteredAssets = assets.filter(asset =>
    asset.title.toLowerCase().includes(search.toLowerCase())
  );

  // Sort assets
  const sortedAssets = [...filteredAssets].sort((a, b) => {
    switch (sortMode) {
      case 'name':
        return a.title.localeCompare(b.title);
      case 'date':
        return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
      case 'type':
        return a.type.localeCompare(b.type);
      default:
        return 0;
    }
  });

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFile(false);

      const files = e.dataTransfer.files;
      if (files.length > 0 && onImport) {
        onImport(files);
      }
    },
    [onImport]
  );

  // File input handler
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0 && onImport) {
        onImport(files);
      }
      // Reset input
      e.target.value = '';
    },
    [onImport]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Select all (Cmd/Ctrl + A)
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        setSelection(new Set(assets.map(a => a.id)));
      }
      // Deselect (Escape)
      if (e.key === 'Escape') {
        setSelection(new Set());
      }
      // Delete selected (Delete/Backspace)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection.size > 0 && onDelete) {
        selection.forEach(id => onDelete(id));
        setSelection(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [assets, selection, onDelete]);

  return (
    <div
      className={clsx(
        'flex h-full flex-col bg-zinc-950/50',
        isDraggingFile && 'ring-2 ring-violet-500 ring-inset'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 1. Toolbar */}
      <div
        className={clsx(
          'flex items-center gap-3 border-b border-white/5 px-4',
          compact ? 'h-10' : 'h-12'
        )}
      >
        {/* Title */}
        {!compact && (
          <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
            {title}
          </span>
        )}

        {/* Search */}
        <div className="group relative max-w-xs flex-1">
          <Search
            size={14}
            className="absolute top-1/2 left-2.5 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-violet-400"
          />
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-md border border-white/5 bg-zinc-900/50 py-1.5 pr-3 pl-8 text-xs text-zinc-200 placeholder-zinc-600 transition-all focus:border-violet-500/50 focus:bg-zinc-900 focus:outline-none"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 border-l border-white/10 pl-3">
          <button
            onClick={() => setViewMode('grid')}
            className={clsx(
              'rounded p-1.5 transition-colors',
              viewMode === 'grid'
                ? 'bg-violet-500/10 text-violet-400'
                : 'text-zinc-500 hover:bg-white/5 hover:text-white'
            )}
          >
            <Grid size={14} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={clsx(
              'rounded p-1.5 transition-colors',
              viewMode === 'list'
                ? 'bg-violet-500/10 text-violet-400'
                : 'text-zinc-500 hover:bg-white/5 hover:text-white'
            )}
          >
            <List size={14} />
          </button>
        </div>

        {/* Sort */}
        <button
          onClick={() =>
            setSortMode(prev => (prev === 'name' ? 'date' : prev === 'date' ? 'type' : 'name'))
          }
          className="flex items-center gap-1 rounded p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          title={`Sort by ${sortMode}`}
        >
          <SortAsc size={14} />
          <span className="text-[10px] uppercase">{sortMode}</span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white">
            <Filter size={16} />
          </button>

          {showImport && (
            <label className="btn-press flex cursor-pointer items-center gap-1.5 rounded-md border border-white/5 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-all hover:bg-white/10">
              <Plus size={14} />
              <span>Import</span>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          )}
        </div>
      </div>

      {/* 2. Grid Area */}
      <div className="scrollbar-hide flex-1 overflow-y-auto p-4">
        {isLoading ? (
          // Loading Skeleton
          <div
            className={clsx(
              'grid gap-4',
              viewMode === 'grid'
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                : 'grid-cols-1'
            )}
          >
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-video" intensity="high" />
            ))}
          </div>
        ) : sortedAssets.length === 0 ? (
          // Empty State / Drop Zone
          <div
            className={clsx(
              'flex h-full flex-col items-center justify-center rounded-xl border-2 border-dashed text-zinc-500 transition-colors',
              isDraggingFile ? 'border-violet-500 bg-violet-500/5' : 'border-zinc-800'
            )}
          >
            <AnimatePresence mode="wait">
              {isDraggingFile ? (
                <motion.div
                  key="drop"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/20">
                    <Plus size={32} className="text-violet-400" />
                  </div>
                  <p className="text-lg font-semibold text-violet-400">Drop to Ingest</p>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <Plus size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-medium">Drag & Drop media to ingest</p>
                  <p className="text-xs opacity-50">or click Import to browse</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          // The Grid
          <motion.div
            layout
            className={clsx(
              'grid gap-4',
              viewMode === 'grid'
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                : 'grid-cols-1'
            )}
          >
            <AnimatePresence>
              {sortedAssets.map(asset => (
                <MediaCard
                  key={asset.id}
                  asset={asset}
                  selected={selection.has(asset.id)}
                  onSelect={e => handleSelect(asset.id, e)}
                  onDoubleClick={() => onOpen?.(asset)}
                  onDelete={onDelete ? () => onDelete(asset.id) : undefined}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* 3. Status Footer */}
      <div
        className={clsx(
          'flex items-center justify-between border-t border-white/5 bg-zinc-950 px-4',
          compact ? 'h-6' : 'h-8'
        )}
      >
        <span className="font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
          {sortedAssets.length} {sortedAssets.length === 1 ? 'Item' : 'Items'}
          {search && ` (filtered from ${assets.length})`}
        </span>
        <span className="font-mono text-[10px] text-zinc-500">
          {selection.size > 0 && `${selection.size} Selected`}
        </span>
      </div>
    </div>
  );
};

export default AssetBrowser;
