'use client';

/**
 * OverlayTrackPanel - UI for managing video overlays
 *
 * Features:
 * - Add/edit lower thirds, subscribe buttons, custom graphics
 * - Drag overlays on mini-timeline
 * - Style preset selection
 * - Animation configuration
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  X,
  Plus,
  Type,
  Youtube,
  Image,
  Layers,
  Play,
  Trash2,
  ChevronDown,
  Move,
  Clock,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES (mirroring backend OverlayTypes.ts)
// ═══════════════════════════════════════════════════════════════════════════

type OverlayType = 'lower_third' | 'subscribe' | 'custom_graphic' | 'text' | 'watermark';
type OverlayPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';
type AnimationType =
  | 'none'
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'scale'
  | 'bounce';
type LowerThirdStyle =
  | 'minimal'
  | 'modern'
  | 'news'
  | 'tech'
  | 'gaming'
  | 'elegant'
  | 'creator'
  | 'custom';

interface OverlayItem {
  id: string;
  type: OverlayType;
  startTime: number;
  duration: number;
  position: OverlayPosition;
  animationIn: AnimationType;
  animationOut: AnimationType;
  animationDuration: number;
  opacity: number;
  scale: number;
  data: LowerThirdData | SubscribeData | CustomGraphicData | TextOverlayData;
}

interface LowerThirdData {
  name: string;
  subtitle?: string;
  style: LowerThirdStyle;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
}

interface SubscribeData {
  style: 'classic' | 'animated' | 'minimal' | 'popup' | 'custom';
  channelName?: string;
  showBell: boolean;
  buttonColor?: string;
}

interface CustomGraphicData {
  url: string;
  filename: string;
  isAnimated: boolean;
  maintainAspectRatio: boolean;
}

interface TextOverlayData {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold' | 'black';
  color: string;
  backgroundColor?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const LOWER_THIRD_STYLES: Array<{ id: LowerThirdStyle; name: string; preview: string }> = [
  { id: 'minimal', name: 'Minimal', preview: 'Clean & subtle' },
  { id: 'modern', name: 'Modern', preview: 'Gradient background' },
  { id: 'news', name: 'News', preview: 'TV news style' },
  { id: 'tech', name: 'Tech', preview: 'Tech reviewer' },
  { id: 'gaming', name: 'Gaming', preview: 'RGB neon' },
  { id: 'elegant', name: 'Elegant', preview: 'Luxury serif' },
  { id: 'creator', name: 'Creator', preview: 'YouTube style' },
];

const POSITIONS: Array<{ id: OverlayPosition; label: string }> = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-center', label: 'Top Center' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'center-left', label: 'Center Left' },
  { id: 'center', label: 'Center' },
  { id: 'center-right', label: 'Center Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-center', label: 'Bottom Center' },
  { id: 'bottom-right', label: 'Bottom Right' },
];

const ANIMATIONS: Array<{ id: AnimationType; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Fade' },
  { id: 'slide-left', label: 'Slide Left' },
  { id: 'slide-right', label: 'Slide Right' },
  { id: 'slide-up', label: 'Slide Up' },
  { id: 'slide-down', label: 'Slide Down' },
  { id: 'scale', label: 'Scale' },
  { id: 'bounce', label: 'Bounce' },
];

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// ═══════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════

interface OverlayTrackPanelProps {
  isOpen: boolean;
  onClose: () => void;
  videoDuration: number;
  currentTime?: number;
  onOverlaysChange?: (overlays: OverlayItem[]) => void;
  initialOverlays?: OverlayItem[];
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function OverlayTrackPanel({
  isOpen,
  onClose,
  videoDuration,
  currentTime = 0,
  onOverlaysChange,
  initialOverlays = [],
}: OverlayTrackPanelProps) {
  const [overlays, setOverlays] = useState<OverlayItem[]>(initialOverlays);
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [editingOverlay, setEditingOverlay] = useState<OverlayItem | null>(null);

  // ═══════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════

  const handleAddOverlay = useCallback(
    (type: OverlayType) => {
      const newOverlay: OverlayItem = {
        id: `overlay_${Date.now()}`,
        type,
        startTime: currentTime,
        duration: 5,
        position: type === 'lower_third' ? 'bottom-left' : 'bottom-right',
        animationIn: 'fade',
        animationOut: 'fade',
        animationDuration: 0.3,
        opacity: 1,
        scale: 1,
        data: getDefaultData(type),
      };

      const updated = [...overlays, newOverlay];
      setOverlays(updated);
      setSelectedOverlay(newOverlay.id);
      setEditingOverlay(newOverlay);
      setAddMenuOpen(false);
      onOverlaysChange?.(updated);
    },
    [currentTime, overlays, onOverlaysChange]
  );

  const handleUpdateOverlay = useCallback(
    (id: string, updates: Partial<OverlayItem>) => {
      const updated = overlays.map(o => (o.id === id ? { ...o, ...updates } : o));
      setOverlays(updated);
      if (editingOverlay?.id === id) {
        setEditingOverlay({ ...editingOverlay, ...updates });
      }
      onOverlaysChange?.(updated);
    },
    [overlays, editingOverlay, onOverlaysChange]
  );

  const handleDeleteOverlay = useCallback(
    (id: string) => {
      const updated = overlays.filter(o => o.id !== id);
      setOverlays(updated);
      if (selectedOverlay === id) {
        setSelectedOverlay(null);
        setEditingOverlay(null);
      }
      onOverlaysChange?.(updated);
    },
    [overlays, selectedOverlay, onOverlaysChange]
  );

  const handleGenerateLowerThird = useCallback(async (overlay: OverlayItem) => {
    if (overlay.type !== 'lower_third') return;

    const data = overlay.data as LowerThirdData;
    try {
      const response = await fetch(`${BACKEND_URL}/api/overlays/lower-third`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          subtitle: data.subtitle,
          style: data.style,
          customColors: data.primaryColor
            ? {
                primary: data.primaryColor,
                secondary: data.secondaryColor,
                text: data.textColor,
              }
            : undefined,
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log('[Overlay] Generated lower third:', result.lowerThird);
        // Could update overlay with generated URL for preview
      }
    } catch (error) {
      console.error('[Overlay] Generation failed:', error);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className="fixed top-0 right-0 z-50 flex h-full w-[400px] flex-col border-l border-white/10 bg-zinc-900/95 backdrop-blur-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Overlay Track</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Add Overlay Button */}
        <div className="relative border-b border-white/10 p-4">
          <button
            onClick={() => setAddMenuOpen(!addMenuOpen)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500/20 py-2.5 text-cyan-400 transition-colors hover:bg-cyan-500/30"
          >
            <Plus className="h-4 w-4" />
            <span className="font-medium">Add Overlay</span>
            <ChevronDown
              className={clsx('h-4 w-4 transition-transform', addMenuOpen && 'rotate-180')}
            />
          </button>

          {/* Add Menu Dropdown */}
          <AnimatePresence>
            {addMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full right-4 left-4 z-10 mt-2 overflow-hidden rounded-lg border border-white/10 bg-zinc-800 shadow-xl"
              >
                <button
                  onClick={() => handleAddOverlay('lower_third')}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-white transition-colors hover:bg-white/10"
                >
                  <Type className="h-5 w-5 text-amber-400" />
                  <div>
                    <div className="font-medium">Lower Third</div>
                    <div className="text-xs text-gray-400">Name & title overlay</div>
                  </div>
                </button>
                <button
                  onClick={() => handleAddOverlay('subscribe')}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-white transition-colors hover:bg-white/10"
                >
                  <Youtube className="h-5 w-5 text-red-400" />
                  <div>
                    <div className="font-medium">Subscribe Button</div>
                    <div className="text-xs text-gray-400">Animated CTA</div>
                  </div>
                </button>
                <button
                  onClick={() => handleAddOverlay('custom_graphic')}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-white transition-colors hover:bg-white/10"
                >
                  <Image className="h-5 w-5 text-purple-400" />
                  <div>
                    <div className="font-medium">Custom Graphic</div>
                    <div className="text-xs text-gray-400">PNG, WebM, GIF</div>
                  </div>
                </button>
                <button
                  onClick={() => handleAddOverlay('text')}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-white transition-colors hover:bg-white/10"
                >
                  <Type className="h-5 w-5 text-blue-400" />
                  <div>
                    <div className="font-medium">Text Overlay</div>
                    <div className="text-xs text-gray-400">Custom styled text</div>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Overlay List */}
        <div className="flex-1 overflow-y-auto p-4">
          {overlays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Layers className="mb-3 h-12 w-12 text-gray-600" />
              <p className="text-gray-400">No overlays yet</p>
              <p className="text-sm text-gray-500">
                Add lower thirds, subscribe buttons, or graphics
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {overlays.map(overlay => (
                <OverlayListItem
                  key={overlay.id}
                  overlay={overlay}
                  isSelected={selectedOverlay === overlay.id}
                  onSelect={() => {
                    setSelectedOverlay(overlay.id);
                    setEditingOverlay(overlay);
                  }}
                  onDelete={() => handleDeleteOverlay(overlay.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Mini Timeline */}
        <div className="border-t border-white/10 p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
            <span>Timeline</span>
            <span>{formatTime(videoDuration)}</span>
          </div>
          <div className="relative h-12 rounded-lg bg-zinc-800">
            {/* Current time indicator */}
            <div
              className="absolute top-0 h-full w-0.5 bg-cyan-400"
              style={{ left: `${(currentTime / videoDuration) * 100}%` }}
            />

            {/* Overlay bars */}
            {overlays.map(overlay => (
              <div
                key={overlay.id}
                className={clsx(
                  'absolute top-2 h-8 cursor-pointer rounded transition-all',
                  overlay.type === 'lower_third' && 'bg-amber-500/60',
                  overlay.type === 'subscribe' && 'bg-red-500/60',
                  overlay.type === 'custom_graphic' && 'bg-purple-500/60',
                  overlay.type === 'text' && 'bg-blue-500/60',
                  selectedOverlay === overlay.id && 'ring-2 ring-white'
                )}
                style={{
                  left: `${(overlay.startTime / videoDuration) * 100}%`,
                  width: `${(overlay.duration / videoDuration) * 100}%`,
                  minWidth: '8px',
                }}
                onClick={() => {
                  setSelectedOverlay(overlay.id);
                  setEditingOverlay(overlay);
                }}
              />
            ))}
          </div>
        </div>

        {/* Edit Panel */}
        <AnimatePresence>
          {editingOverlay && (
            <OverlayEditPanel
              overlay={editingOverlay}
              onUpdate={updates => handleUpdateOverlay(editingOverlay.id, updates)}
              onGenerate={() => handleGenerateLowerThird(editingOverlay)}
              onClose={() => setEditingOverlay(null)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function OverlayListItem({
  overlay,
  isSelected,
  onSelect,
  onDelete,
}: {
  overlay: OverlayItem;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const getIcon = () => {
    switch (overlay.type) {
      case 'lower_third':
        return <Type className="h-4 w-4 text-amber-400" />;
      case 'subscribe':
        return <Youtube className="h-4 w-4 text-red-400" />;
      case 'custom_graphic':
        return <Image className="h-4 w-4 text-purple-400" />;
      case 'text':
        return <Type className="h-4 w-4 text-blue-400" />;
      default:
        return <Layers className="h-4 w-4 text-gray-400" />;
    }
  };

  const getLabel = () => {
    switch (overlay.type) {
      case 'lower_third':
        return (overlay.data as LowerThirdData).name || 'Untitled';
      case 'subscribe':
        return 'Subscribe Button';
      case 'custom_graphic':
        return (overlay.data as CustomGraphicData).filename || 'Custom Graphic';
      case 'text':
        return (overlay.data as TextOverlayData).text.slice(0, 20) || 'Text';
      default:
        return 'Overlay';
    }
  };

  return (
    <div
      onClick={onSelect}
      className={clsx(
        'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all',
        isSelected
          ? 'border-cyan-500/50 bg-cyan-500/10'
          : 'border-white/10 bg-white/5 hover:bg-white/10'
      )}
    >
      {getIcon()}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-white">{getLabel()}</div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          <span>
            {formatTime(overlay.startTime)} - {formatTime(overlay.startTime + overlay.duration)}
          </span>
        </div>
      </div>
      <button
        onClick={e => {
          e.stopPropagation();
          onDelete();
        }}
        className="rounded p-1 text-gray-500 transition-colors hover:bg-red-500/20 hover:text-red-400"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function OverlayEditPanel({
  overlay,
  onUpdate,
  onGenerate,
  onClose,
}: {
  overlay: OverlayItem;
  onUpdate: (updates: Partial<OverlayItem>) => void;
  onGenerate: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="border-t border-white/10 bg-zinc-800/50 p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium text-white">Edit Overlay</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Timing */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Start Time (s)</label>
            <input
              type="number"
              value={overlay.startTime}
              onChange={e => onUpdate({ startTime: parseFloat(e.target.value) || 0 })}
              step="0.1"
              min="0"
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Duration (s)</label>
            <input
              type="number"
              value={overlay.duration}
              onChange={e => onUpdate({ duration: parseFloat(e.target.value) || 5 })}
              step="0.5"
              min="0.5"
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        {/* Position */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">Position</label>
          <select
            value={overlay.position}
            onChange={e => onUpdate({ position: e.target.value as OverlayPosition })}
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          >
            {POSITIONS.map(pos => (
              <option key={pos.id} value={pos.id}>
                {pos.label}
              </option>
            ))}
          </select>
        </div>

        {/* Animation */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Animate In</label>
            <select
              value={overlay.animationIn}
              onChange={e => onUpdate({ animationIn: e.target.value as AnimationType })}
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            >
              {ANIMATIONS.map(anim => (
                <option key={anim.id} value={anim.id}>
                  {anim.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Animate Out</label>
            <select
              value={overlay.animationOut}
              onChange={e => onUpdate({ animationOut: e.target.value as AnimationType })}
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            >
              {ANIMATIONS.map(anim => (
                <option key={anim.id} value={anim.id}>
                  {anim.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lower Third Specific Fields */}
        {overlay.type === 'lower_third' && (
          <LowerThirdFields
            data={overlay.data as LowerThirdData}
            onUpdate={data => onUpdate({ data })}
          />
        )}

        {/* Generate Button */}
        {overlay.type === 'lower_third' && (
          <button
            onClick={onGenerate}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500/20 py-2.5 text-amber-400 transition-colors hover:bg-amber-500/30"
          >
            <Play className="h-4 w-4" />
            <span>Generate Preview</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}

function LowerThirdFields({
  data,
  onUpdate,
}: {
  data: LowerThirdData;
  onUpdate: (data: LowerThirdData) => void;
}) {
  return (
    <>
      <div>
        <label className="mb-1 block text-xs text-gray-400">Name</label>
        <input
          type="text"
          value={data.name}
          onChange={e => onUpdate({ ...data, name: e.target.value })}
          placeholder="John Smith"
          className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-gray-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-400">Subtitle (optional)</label>
        <input
          type="text"
          value={data.subtitle || ''}
          onChange={e => onUpdate({ ...data, subtitle: e.target.value })}
          placeholder="CEO, Company Name"
          className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-gray-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-400">Style</label>
        <div className="grid grid-cols-2 gap-2">
          {LOWER_THIRD_STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => onUpdate({ ...data, style: style.id })}
              className={clsx(
                'rounded-lg border p-2 text-left text-sm transition-all',
                data.style === style.id
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                  : 'border-white/10 text-gray-400 hover:bg-white/5'
              )}
            >
              <div className="font-medium">{style.name}</div>
              <div className="text-xs opacity-60">{style.preview}</div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getDefaultData(type: OverlayType): OverlayItem['data'] {
  switch (type) {
    case 'lower_third':
      return {
        name: '',
        subtitle: '',
        style: 'modern' as LowerThirdStyle,
      };
    case 'subscribe':
      return {
        style: 'classic' as const,
        showBell: true,
      };
    case 'custom_graphic':
      return {
        url: '',
        filename: '',
        isAnimated: false,
        maintainAspectRatio: true,
      };
    case 'text':
      return {
        text: '',
        fontSize: 24,
        fontFamily: 'Inter',
        fontWeight: 'bold' as const,
        color: '#ffffff',
      };
    default:
      return {
        name: '',
        style: 'minimal' as LowerThirdStyle,
      };
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default OverlayTrackPanel;
