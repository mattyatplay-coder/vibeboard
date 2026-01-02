'use client';

/**
 * Virtual Gaffer - Lighting Stage
 *
 * A top-down 2D "stage" widget for placing and adjusting light sources.
 * Features:
 * - Interactive light placement on 2D stage map
 * - "Inverse Gaffing" - analyze reference images to auto-place lights
 * - Proxy sphere preview showing real-time lighting effects
 * - Prompt modifier generation for AI image generation
 */

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  Sun,
  Moon,
  Sparkles,
  X,
  Plus,
  RotateCcw,
  ChevronDown,
  Trash2,
  Eye,
  EyeOff,
  Thermometer,
  Upload,
  Wand2,
  Image as ImageIcon,
  Loader2,
  FlipHorizontal,
  Undo2,
  Redo2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Tooltip } from '@/components/ui/Tooltip';
import { useLightingStore, LightSource, LightType, LIGHTING_PRESETS } from '@/lib/lightingStore';
import { ScrubbableInput } from '@/components/ui/ScrubbableInput';
import { RotaryKnob } from '@/components/ui/RotaryKnob';
import dynamic from 'next/dynamic';

// Dynamically import 3D preview to avoid SSR issues with Three.js
const LightingPreview3D = dynamic(
  () => import('./LightingPreview3D').then(mod => ({ default: mod.LightingPreview3D })),
  {
    ssr: false,
    loading: () => <div className="h-20 w-20 animate-pulse rounded-full bg-gray-800" />,
  }
);

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Interface for analyzed lighting from backend
// Enhanced with gel/hex fields from the Chromatic Mandate analysis
interface AnalyzedLight {
  type: LightType;
  name: string;
  x: number;
  y: number;
  intensity: number;
  colorTemp: number;
  softness: number;
  description: string;
  // New fields from enhanced Grok Vision analysis
  hex?: string; // Direct hex color code (e.g., "#4D94FF")
  isGel?: boolean; // Whether this is a colored gel light
  gelName?: string; // Name of the gel (e.g., "Steel Blue", "CTO Full")
}

interface LightingAnalysisResult {
  lights: AnalyzedLight[];
  overallStyle: string;
  lightingRatio: string;
  keyLightPosition?: string;
  mood: string[];
  genre?: string;
  colorPalette?: {
    dominant: string; // Hex color
    accent: string; // Hex color
    shadows: string; // Hex color
  };
  promptSuggestion: string;
  cinematicReference?: string;
}

interface LightingStageProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (promptModifier: string) => void;
  embedded?: boolean;
}

// Light type icons and colors
const LIGHT_CONFIG: Record<LightType, { icon: typeof Lightbulb; color: string; label: string }> = {
  key: { icon: Sun, color: '#fbbf24', label: 'Key' },
  fill: { icon: Lightbulb, color: '#60a5fa', label: 'Fill' },
  back: { icon: Sparkles, color: '#c084fc', label: 'Back' },
  rim: { icon: Moon, color: '#f472b6', label: 'Rim' },
  practical: { icon: Lightbulb, color: '#34d399', label: 'Practical' },
  ambient: { icon: Sun, color: '#94a3b8', label: 'Ambient' },
};

/**
 * UX-010: Quick Presets - Intent-Driven Shortcuts
 * One-click access to common creative lighting setups.
 * Each preset includes a gradient preview of its color palette.
 */
interface QuickPreset {
  id: string;
  name: string;
  emoji: string;
  colors: [string, string]; // [primary, secondary] for gradient preview
  description: string;
  lights: Omit<LightSource, 'id'>[];
}

const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'cyberpunk',
    name: 'Neon City',
    emoji: '🌃',
    colors: ['#ff0055', '#00ccff'],
    description: 'Dual-tone hard rim lighting',
    lights: [
      { type: 'key', name: 'Neon Pink Key', x: 0.25, y: 0.6, intensity: 0.8, colorTemp: 6500, softness: 0.3, enabled: true, useGel: true, gelColor: '#ff0055', distance: 0.5 },
      { type: 'rim', name: 'Cyan Rim', x: 0.85, y: 0.2, intensity: 0.9, colorTemp: 8000, softness: 0.2, enabled: true, useGel: true, gelColor: '#00ccff', distance: 0.4 },
      { type: 'ambient', name: 'Dark Ambient', x: 0.5, y: 0.5, intensity: 0.15, colorTemp: 4000, softness: 1.0, enabled: true, useGel: false, gelColor: '#ffffff', distance: 1.0 },
    ],
  },
  {
    id: 'rembrandt',
    name: 'Studio Master',
    emoji: '🎨',
    colors: ['#ffeedd', '#1a1a1a'],
    description: 'Classic 45° key with dark fill',
    lights: [
      { type: 'key', name: 'Rembrandt Key', x: 0.3, y: 0.55, intensity: 0.85, colorTemp: 3200, softness: 0.5, enabled: true, useGel: false, gelColor: '#ffffff', distance: 0.5 },
      { type: 'fill', name: 'Dark Fill', x: 0.75, y: 0.6, intensity: 0.2, colorTemp: 4500, softness: 0.8, enabled: true, useGel: false, gelColor: '#ffffff', distance: 0.7 },
      { type: 'back', name: 'Hair Light', x: 0.5, y: 0.1, intensity: 0.5, colorTemp: 5600, softness: 0.3, enabled: true, useGel: false, gelColor: '#ffffff', distance: 0.3 },
    ],
  },
  {
    id: 'golden',
    name: 'Sunset',
    emoji: '🌅',
    colors: ['#ffaa00', '#663399'],
    description: 'Warm soft key, cool ambient fill',
    lights: [
      { type: 'key', name: 'Golden Hour Key', x: 0.15, y: 0.5, intensity: 0.9, colorTemp: 2700, softness: 0.7, enabled: true, useGel: true, gelColor: '#ffaa00', distance: 0.6 },
      { type: 'fill', name: 'Twilight Fill', x: 0.8, y: 0.55, intensity: 0.35, colorTemp: 8500, softness: 0.9, enabled: true, useGel: true, gelColor: '#663399', distance: 0.8 },
      { type: 'rim', name: 'Sun Rim', x: 0.1, y: 0.15, intensity: 0.7, colorTemp: 2200, softness: 0.2, enabled: true, useGel: true, gelColor: '#ff6600', distance: 0.3 },
    ],
  },
  {
    id: 'noir',
    name: 'Film Noir',
    emoji: '🎬',
    colors: ['#ffffff', '#000000'],
    description: 'High contrast, dramatic shadows',
    lights: [
      { type: 'key', name: 'Hard Key', x: 0.2, y: 0.45, intensity: 1.0, colorTemp: 5600, softness: 0.1, enabled: true, useGel: false, gelColor: '#ffffff', distance: 0.4 },
      { type: 'back', name: 'Edge Light', x: 0.85, y: 0.15, intensity: 0.6, colorTemp: 6000, softness: 0.1, enabled: true, useGel: false, gelColor: '#ffffff', distance: 0.3 },
    ],
  },
  {
    id: 'horror',
    name: 'Horror',
    emoji: '👻',
    colors: ['#00ff00', '#330000'],
    description: 'Under-lit with colored accents',
    lights: [
      { type: 'key', name: 'Uplight Key', x: 0.5, y: 0.9, intensity: 0.6, colorTemp: 4000, softness: 0.3, enabled: true, useGel: true, gelColor: '#88ff88', distance: 0.3 },
      { type: 'rim', name: 'Red Rim', x: 0.9, y: 0.2, intensity: 0.4, colorTemp: 3000, softness: 0.2, enabled: true, useGel: true, gelColor: '#ff0000', distance: 0.5 },
      { type: 'ambient', name: 'Dread Ambient', x: 0.5, y: 0.5, intensity: 0.1, colorTemp: 5000, softness: 1.0, enabled: true, useGel: true, gelColor: '#220000', distance: 1.0 },
    ],
  },
];

// Convert Kelvin to RGB for visual display
function kelvinToRgb(kelvin: number): string {
  const temp = kelvin / 100;
  let r, g, b;

  if (temp <= 66) {
    r = 255;
    g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(temp) - 161.1195681661));
    b =
      temp <= 19
        ? 0
        : Math.max(0, Math.min(255, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
  } else {
    r = Math.max(0, Math.min(255, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
    g = Math.max(0, Math.min(255, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
    b = 255;
  }

  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

// Enhanced Kelvin to RGB with boosted saturation for UI visibility
// Physically accurate colors are too subtle for map icons - this version exaggerates
function kelvinToRgbEnhanced(kelvin: number): string {
  // Map Kelvin to a more visually distinct color spectrum
  // 2700K = deep orange/amber
  // 3200K = warm yellow
  // 4000K = light yellow
  // 5600K = neutral white (but we'll show pale yellow)
  // 6500K = cool white (but we'll show pale blue)
  // 7000K+ = blue

  if (kelvin <= 2700) {
    // Deep warm orange
    return '#ff8c00'; // Dark orange
  } else if (kelvin <= 3200) {
    // Warm tungsten yellow-orange
    return '#ffa500'; // Orange
  } else if (kelvin <= 4000) {
    // Warm yellow
    return '#ffc107'; // Amber
  } else if (kelvin <= 5000) {
    // Neutral warm - pale yellow
    return '#ffe066'; // Light yellow
  } else if (kelvin <= 5600) {
    // Daylight - very pale warm
    return '#fff4cc'; // Cream/warm white
  } else if (kelvin <= 6500) {
    // Cool daylight - pale blue tint
    return '#e6f0ff'; // Very pale blue
  } else if (kelvin <= 7500) {
    // Cool - light blue
    return '#b3d4ff'; // Light blue
  } else if (kelvin <= 9000) {
    // Very cool - medium blue
    return '#80b3ff'; // Medium blue
  } else {
    // Extreme cool - strong blue
    return '#4d94ff'; // Blue
  }
}

// Note: CSS gradient preview replaced with Three.js LightingPreview3D component

export function LightingStage({ isOpen, onClose, onApply, embedded = false }: LightingStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Inverse Gaffing state
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<LightingAnalysisResult | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // UX-011: Keyboard shortcut guide visibility and gel picker expansion
  const [showShortcutGuide, setShowShortcutGuide] = useState(false);
  const [showGelPicker, setShowGelPicker] = useState(false);

  const {
    lights,
    isEnabled,
    selectedLightId,
    addLight,
    removeLight,
    updateLight,
    moveLight,
    selectLight,
    toggleEnabled,
    loadPreset,
    clearAll,
    generatePromptModifier,
    getLightingDescription,
    // UX-009: Undo/Redo
    undo,
    redo,
    canUndo,
    canRedo,
  } = useLightingStore();

  // UX-009 & UX-011: Keyboard shortcuts for undo/redo and lighting controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      // Undo/Redo (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, Cmd/Ctrl+Y)
      if (modifierKey && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if (modifierKey && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // UX-011: Gaffer's Keyboard shortcuts (no modifier needed)
      switch (e.key.toLowerCase()) {
        case '?':
          // Toggle shortcut guide
          e.preventDefault();
          setShowShortcutGuide(prev => !prev);
          break;

        case 'l':
          // Toggle light library/add menu
          e.preventDefault();
          setShowAddMenu(prev => !prev);
          break;

        case 'g':
          // Toggle gel picker for selected light
          if (selectedLightId) {
            e.preventDefault();
            // Toggle useGel on the selected light
            const light = lights.find(l => l.id === selectedLightId);
            if (light) {
              updateLight(selectedLightId, { useGel: !light.useGel });
            }
            setShowGelPicker(prev => !prev);
          }
          break;

        case 'delete':
        case 'backspace':
          // Delete selected light
          if (selectedLightId) {
            e.preventDefault();
            removeLight(selectedLightId);
          }
          break;

        case 'escape':
          // Deselect light and close panels
          e.preventDefault();
          selectLight(null);
          setShowAddMenu(false);
          setShowPresets(false);
          setShowShortcutGuide(false);
          setShowGelPicker(false);
          break;
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, undo, redo, selectedLightId, lights, updateLight, removeLight, selectLight]);

  const selectedLight = lights.find(l => l.id === selectedLightId);

  // UX-010: Apply Quick Preset
  const applyQuickPreset = useCallback((preset: QuickPreset) => {
    const newLights: LightSource[] = preset.lights.map((light, index) => ({
      ...light,
      id: `light-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
    }));
    useLightingStore.setState({ lights: newLights, isEnabled: true, selectedLightId: null });
  }, []);

  // Handle reference image drop for Inverse Gaffing
  const handleFileDrop = useCallback(async (file: File) => {
    // Upload file to backend first
    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsAnalyzing(true);
      setAnalysisError(null);
      setAnalysisStatus('Uploading image...');

      // Upload the image to temp endpoint (no project required)
      const uploadRes = await fetch(`${BACKEND_URL}/api/process/upload-temp`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const uploadData = await uploadRes.json();
      const imageUrl = uploadData.fileUrl?.startsWith('http')
        ? uploadData.fileUrl
        : `${BACKEND_URL}${uploadData.fileUrl}`;

      setReferenceImage(imageUrl);
      setAnalysisStatus('Analyzing lighting...');

      // Analyze the lighting
      const analysisRes = await fetch(`${BACKEND_URL}/api/lighting/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });

      if (!analysisRes.ok) {
        const errorData = await analysisRes.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to analyze lighting');
      }

      const analysis = await analysisRes.json();
      setAnalysisResult(analysis);
      setAnalysisStatus('Applying lights...');

      // Auto-apply the analyzed lights
      if (analysis.lights && analysis.lights.length > 0) {
        // Build all lights at once with unique IDs (avoids race condition from forEach + addLight)
        // Priority: Use gel/hex color from AI if detected, otherwise fall back to Kelvin
        const newLights: LightSource[] = analysis.lights.map(
          (light: AnalyzedLight, index: number) => {
            // Determine if we should use gel color:
            // 1. AI explicitly marked it as a gel (isGel: true)
            // 2. AI provided a hex color that isn't neutral white (#FFFFFF, #FFF4CC, etc.)
            const hasColoredHex =
              light.hex &&
              !['#FFFFFF', '#ffffff', '#FFF4CC', '#fff4cc', '#E6F0FF', '#e6f0ff'].includes(
                light.hex
              );
            const shouldUseGel = light.isGel === true || hasColoredHex;

            // Use the hex color from AI, or default to white if not provided
            const gelColor = light.hex || '#ffffff';

            return {
              id: `light-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
              type: light.type,
              name: light.gelName ? `${light.name} (${light.gelName})` : light.name,
              x: light.x,
              y: light.y,
              intensity: light.intensity,
              colorTemp: light.colorTemp,
              softness: light.softness,
              enabled: true,
              // Prioritize gel color from AI analysis over Kelvin
              useGel: shouldUseGel,
              gelColor: gelColor,
              distance: 0.5, // Default distance
            };
          }
        );

        // Set all lights at once (same pattern as loadPreset)
        useLightingStore.setState({ lights: newLights, isEnabled: true, selectedLightId: null });

        // Log gel usage for debugging
        const gelLights = newLights.filter(l => l.useGel);
        if (gelLights.length > 0) {
          console.log(
            `[LightingStage] Applied ${gelLights.length} gel-colored lights:`,
            gelLights.map(l => `${l.name}: ${l.gelColor}`)
          );
        }

        setAnalysisStatus(`Applied ${analysis.lights.length} lights`);
        console.log(
          `[LightingStage] Applied ${analysis.lights.length} lights from reference analysis`
        );
      } else {
        setAnalysisStatus('No lights detected');
      }
    } catch (error) {
      console.error('[LightingStage] Analysis error:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Analysis failed');
      setAnalysisStatus('');
    } finally {
      setIsAnalyzing(false);
    }
  }, []); // No dependencies - uses useLightingStore.setState directly

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        handleFileDrop(file);
      }
    },
    [handleFileDrop]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileDrop(file);
      }
    },
    [handleFileDrop]
  );

  // Flip Map - horizontally mirror all light X coordinates
  // Useful when AI gets viewer-relative vs subject-relative coordinates flipped
  const handleFlipMap = useCallback(() => {
    if (lights.length === 0) return;

    const flippedLights = lights.map(light => ({
      ...light,
      x: 1.0 - light.x, // Mirror horizontally: 0.15 → 0.85, 0.85 → 0.15
    }));

    useLightingStore.setState({ lights: flippedLights });
    console.log(`[LightingStage] Flipped ${lights.length} lights horizontally`);
  }, [lights]);

  // Handle mouse/touch drag on stage
  const handleStageMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      // Check if clicking on a light
      const clickedLight = lights.find(l => {
        const dx = Math.abs(l.x - x);
        const dy = Math.abs(l.y - y);
        return dx < 0.06 && dy < 0.06;
      });

      if (clickedLight) {
        selectLight(clickedLight.id);
        setDraggingId(clickedLight.id);
      } else {
        selectLight(null);
      }
    },
    [lights, selectLight]
  );

  const handleStageMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingId || !stageRef.current) return;

      const rect = stageRef.current.getBoundingClientRect();
      const x = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height));

      moveLight(draggingId, x, y);
    },
    [draggingId, moveLight]
  );

  const handleStageMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  // Global mouse up handler
  useEffect(() => {
    const handleGlobalMouseUp = () => setDraggingId(null);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleApply = () => {
    const modifier = generatePromptModifier();
    onApply?.(modifier);
    onClose();
  };

  const containerClass = embedded
    ? 'w-[400px] h-[90vh] flex flex-col bg-[#0a0a0a] border-l border-white/10'
    : 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm';

  const panelClass = embedded
    ? 'flex-1 flex flex-col overflow-hidden'
    : 'w-[500px] max-h-[90vh] bg-[#0a0a0a] rounded-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden';

  if (!isOpen) return null;

  return (
    <div className={containerClass} onClick={embedded ? undefined : onClose}>
      <div className={panelClass} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/20 p-1.5">
              <Lightbulb className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Virtual Gaffer</h3>
              <p className="text-xs text-gray-500">{getLightingDescription()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleEnabled}
              className={clsx(
                'rounded px-2 py-1 text-xs font-medium transition-colors',
                isEnabled ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-gray-500'
              )}
            >
              {isEnabled ? 'Enabled' : 'Disabled'}
            </button>
            <button onClick={onClose} className="p-1 text-gray-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Presets Bar */}
        <div className="relative z-20 flex items-center gap-2 overflow-visible border-b border-white/5 px-4 py-2">
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center gap-1.5 rounded bg-white/5 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/10"
            >
              Presets
              <ChevronDown
                className={clsx('h-3 w-3 transition-transform', showPresets && 'rotate-180')}
              />
            </button>
            <AnimatePresence>
              {showPresets && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-0 z-50 mt-1 w-48 rounded-lg border border-white/10 bg-[#1a1a1a] shadow-xl"
                >
                  {LIGHTING_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        loadPreset(preset.id);
                        setShowPresets(false);
                      }}
                      className="w-full px-3 py-2 text-left first:rounded-t-lg last:rounded-b-lg hover:bg-white/5"
                    >
                      <div className="text-xs text-gray-200">{preset.name}</div>
                      <div className="text-[10px] text-gray-500">{preset.description}</div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* UX-010: Quick Presets - Intent-Driven Shortcuts */}
          <div className="flex items-center gap-1 border-l border-white/10 pl-2">
            {QUICK_PRESETS.map(preset => (
              <Tooltip key={preset.id} content={`${preset.name}: ${preset.description}`} side="top">
                <button
                  onClick={() => applyQuickPreset(preset)}
                  className="group relative flex h-8 items-center gap-1 overflow-hidden rounded-lg border border-white/10 px-2 transition-all hover:border-white/20 hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${preset.colors[0]}20, ${preset.colors[1]}20)`,
                  }}
                >
                  {/* Gradient preview bar */}
                  <div
                    className="absolute bottom-0 left-0 h-0.5 w-full opacity-50 transition-opacity group-hover:opacity-100"
                    style={{
                      background: `linear-gradient(90deg, ${preset.colors[0]}, ${preset.colors[1]})`,
                    }}
                  />
                  <span className="text-sm">{preset.emoji}</span>
                  <span className="text-[10px] font-medium text-gray-300 group-hover:text-white">
                    {preset.name}
                  </span>
                </button>
              </Tooltip>
            ))}
          </div>

          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 rounded bg-white/5 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <RotateCcw className="h-3 w-3" />
            Clear
          </button>

          {/* UX-009: Undo/Redo Buttons */}
          <div className="flex items-center gap-1 border-l border-white/10 pl-2">
            <Tooltip content="Undo (⌘Z)" side="top">
              <button
                onClick={undo}
                disabled={!canUndo()}
                className={clsx(
                  'flex items-center justify-center rounded p-1.5 transition-colors',
                  canUndo()
                    ? 'text-gray-400 hover:bg-white/10 hover:text-white'
                    : 'cursor-not-allowed text-gray-600'
                )}
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Redo (⌘⇧Z)" side="top">
              <button
                onClick={redo}
                disabled={!canRedo()}
                className={clsx(
                  'flex items-center justify-center rounded p-1.5 transition-colors',
                  canRedo()
                    ? 'text-gray-400 hover:bg-white/10 hover:text-white'
                    : 'cursor-not-allowed text-gray-600'
                )}
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </div>

          {/* Flip Map - horizontally mirror all lights when AI flips left/right */}
          <Tooltip content="Flip all lights horizontally (fix left/right when AI gets it reversed)" side="top">
            <button
              onClick={handleFlipMap}
              disabled={lights.length === 0}
              className={clsx(
                'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs transition-colors',
                lights.length === 0
                  ? 'cursor-not-allowed bg-white/5 text-gray-600'
                  : 'bg-white/5 text-gray-400 hover:bg-cyan-500/10 hover:text-cyan-400'
              )}
            >
              <FlipHorizontal className="h-3 w-3" />
              Flip
            </button>
          </Tooltip>

          {/* Analyze Reference Button (Inverse Gaffing) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className={clsx(
              'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs transition-colors',
              isAnalyzing
                ? 'bg-purple-500/20 text-purple-300'
                : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
            )}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                {analysisStatus || 'Analyzing...'}
              </>
            ) : (
              <>
                <Wand2 className="h-3 w-3" />
                Analyze Reference
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          {/* Error display */}
          {analysisError && <span className="ml-2 text-xs text-red-400">{analysisError}</span>}

          <div className="flex-1" />

          {/* Add Light Menu */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1.5 rounded bg-blue-500/20 px-3 py-1.5 text-xs text-blue-400 transition-colors hover:bg-blue-500/30"
            >
              <Plus className="h-3 w-3" />
              Add Light
            </button>
            <AnimatePresence>
              {showAddMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full right-0 z-50 mt-1 w-36 rounded-lg border border-white/10 bg-[#1a1a1a] shadow-xl"
                >
                  {(Object.keys(LIGHT_CONFIG) as LightType[]).map(type => {
                    const config = LIGHT_CONFIG[type];
                    const Icon = config.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          addLight(type);
                          setShowAddMenu(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left first:rounded-t-lg last:rounded-b-lg hover:bg-white/5"
                      >
                        <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
                        <span className="text-xs text-gray-200">{config.label}</span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Main Stage Layout - 50/50 Split */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="flex h-full gap-4">
            {/* LEFT COLUMN: Large 3D Live Preview (50%) */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] tracking-wider text-gray-500 uppercase">
                  Live Preview
                </div>
                <div className="text-[10px] text-gray-600">
                  {lights.filter(l => l.enabled).length > 0
                    ? `${lights.filter(l => l.enabled).length} light${lights.filter(l => l.enabled).length > 1 ? 's' : ''} active`
                    : 'No lights'}
                </div>
              </div>

              {/* Large 3D Viewport */}
              <div className="relative flex-1 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-gray-900 to-black">
                <Suspense
                  fallback={
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
                    </div>
                  }
                >
                  <LightingPreview3D lights={lights} size="full" />
                </Suspense>

                {/* Corner info overlay */}
                <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-[9px] text-gray-600">
                  Drag to rotate • Scroll to zoom
                </div>

                {/* Analysis result badge */}
                {analysisResult && (
                  <div className="absolute top-2 left-2 rounded-lg border border-purple-500/30 bg-purple-500/20 px-2 py-1">
                    <div className="text-[10px] font-medium text-purple-300">
                      {analysisResult.overallStyle}
                    </div>
                    <div className="text-[9px] text-purple-400/70">
                      Ratio: {analysisResult.lightingRatio}
                    </div>
                  </div>
                )}
              </div>

              {/* Reference Comparison (if available) */}
              {referenceImage && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="group relative">
                    <img
                      src={referenceImage}
                      alt="Reference"
                      className="h-16 w-auto rounded-lg border border-white/10 object-cover"
                    />
                    <button
                      onClick={() => {
                        setReferenceImage(null);
                        setAnalysisResult(null);
                      }}
                      className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  {analysisResult?.cinematicReference && (
                    <div className="max-w-[200px] text-[9px] text-gray-500 italic">
                      "{analysisResult.cinematicReference}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Stage Map + Controls (50%) */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="mb-2 text-[10px] tracking-wider text-gray-500 uppercase">
                Lighting Map
              </div>

              {/* Stage Map */}
              <div
                ref={stageRef}
                onMouseDown={handleStageMouseDown}
                onMouseMove={handleStageMouseMove}
                onMouseUp={handleStageMouseUp}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={clsx(
                  'relative aspect-square max-h-[300px] flex-1 overflow-hidden rounded-xl',
                  'bg-gradient-to-b from-gray-900 to-gray-800',
                  'border-2 transition-colors',
                  isDraggingOver ? 'border-purple-500 bg-purple-500/5' : 'border-white/10',
                  draggingId && 'cursor-grabbing'
                )}
                style={{
                  backgroundImage: `
                                        radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 60%),
                                        linear-gradient(to bottom, transparent 48%, rgba(255,255,255,0.05) 50%, transparent 52%)
                                    `,
                }}
              >
                {/* Drop zone overlay */}
                {isDraggingOver && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-purple-500/10">
                    <div className="text-center">
                      <Upload className="mx-auto mb-2 h-8 w-8 text-purple-400" />
                      <div className="text-sm text-purple-300">Drop to analyze lighting</div>
                    </div>
                  </div>
                )}

                {/* Subject indicator (center) - simple bust silhouette */}
                <div className="pointer-events-none absolute top-1/2 left-1/2 flex h-20 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center">
                  {/* Head */}
                  <div className="h-10 w-10 rounded-full border border-white/20 bg-white/10" />
                  {/* Shoulders */}
                  <div className="-mt-1 h-6 w-14 rounded-t-full border-t border-white/10 bg-white/5" />
                  {/* Label */}
                  <div className="mt-1 text-[8px] text-gray-500">SUBJECT</div>
                </div>

                {/* Camera indicator (bottom center) */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded border border-white/10 bg-white/10 px-2 py-1 text-[10px] text-gray-400">
                  CAMERA
                </div>

                {/* Quadrant labels */}
                <div className="absolute top-2 left-2 text-[10px] text-gray-600">BACK-LEFT</div>
                <div className="absolute top-2 right-2 text-[10px] text-gray-600">BACK-RIGHT</div>
                <div className="absolute bottom-8 left-2 text-[10px] text-gray-600">FRONT-LEFT</div>
                <div className="absolute right-2 bottom-8 text-[10px] text-gray-600">
                  FRONT-RIGHT
                </div>

                {/* Light sources */}
                {lights.map(light => {
                  const config = LIGHT_CONFIG[light.type];
                  const Icon = config.icon;
                  const isSelected = light.id === selectedLightId;
                  // Use gel color if enabled, otherwise enhanced Kelvin color for map visibility
                  // The enhanced version exaggerates colors so they're more distinct on the map
                  const lightColor =
                    light.useGel && light.gelColor
                      ? light.gelColor
                      : kelvinToRgbEnhanced(light.colorTemp);

                  return (
                    <motion.div
                      key={light.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className={clsx(
                        'absolute -translate-x-1/2 -translate-y-1/2 cursor-grab',
                        draggingId === light.id && 'z-10 cursor-grabbing',
                        isSelected && 'z-10'
                      )}
                      style={{
                        left: `${light.x * 100}%`,
                        top: `${light.y * 100}%`,
                      }}
                    >
                      {/* Light glow effect */}
                      {light.enabled && (
                        <div
                          className="absolute inset-0 -m-4 rounded-full opacity-30 blur-xl"
                          style={{
                            backgroundColor: lightColor,
                            transform: `scale(${0.5 + (light.intensity / 100) * 0.5})`,
                          }}
                        />
                      )}

                      {/* Light icon */}
                      <div
                        className={clsx(
                          'relative flex h-10 w-10 items-center justify-center rounded-full transition-all',
                          'border-2',
                          isSelected ? 'scale-110 border-white' : 'border-white/30',
                          !light.enabled && 'opacity-40'
                        )}
                        style={{
                          backgroundColor: `${lightColor}33`,
                          borderColor: isSelected ? lightColor : undefined,
                        }}
                      >
                        <Icon
                          className="h-5 w-5"
                          style={{ color: light.enabled ? lightColor : '#666' }}
                        />
                      </div>

                      {/* Label */}
                      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="rounded bg-black/50 px-1 text-[9px] text-gray-400">
                          {light.name}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Result Info (if available) */}
        <AnimatePresence>
          {analysisResult && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-purple-500/20 bg-purple-500/5"
            >
              <div className="space-y-2 p-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-xs font-medium text-purple-300">Analyzed Lighting</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-gray-500">Style:</span>
                    <span className="ml-1 text-gray-300">{analysisResult.overallStyle}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Ratio:</span>
                    <span className="ml-1 text-gray-300">{analysisResult.lightingRatio}</span>
                  </div>
                  {analysisResult.genre && (
                    <div>
                      <span className="text-gray-500">Genre:</span>
                      <span className="ml-1 text-gray-300">{analysisResult.genre}</span>
                    </div>
                  )}
                  {analysisResult.keyLightPosition && (
                    <div>
                      <span className="text-gray-500">Key:</span>
                      <span className="ml-1 text-gray-300">{analysisResult.keyLightPosition}</span>
                    </div>
                  )}
                </div>
                {/* Color Palette Display */}
                {analysisResult.colorPalette && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">Palette:</span>
                    <div className="flex gap-1">
                      <div
                        className="h-4 w-4 rounded border border-white/20"
                        style={{ backgroundColor: analysisResult.colorPalette.dominant }}
                        title={`Dominant: ${analysisResult.colorPalette.dominant}`}
                      />
                      <div
                        className="h-4 w-4 rounded border border-white/20"
                        style={{ backgroundColor: analysisResult.colorPalette.accent }}
                        title={`Accent: ${analysisResult.colorPalette.accent}`}
                      />
                      <div
                        className="h-4 w-4 rounded border border-white/20"
                        style={{ backgroundColor: analysisResult.colorPalette.shadows }}
                        title={`Shadows: ${analysisResult.colorPalette.shadows}`}
                      />
                    </div>
                  </div>
                )}
                {analysisResult.cinematicReference && (
                  <div className="text-[10px] text-gray-400 italic">
                    {analysisResult.cinematicReference}
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {analysisResult.mood.map((m, i) => (
                    <span
                      key={i}
                      className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] text-purple-300"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Light Controls */}
        <AnimatePresence>
          {selectedLight && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/10"
            >
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = LIGHT_CONFIG[selectedLight.type].icon;
                      return (
                        <Icon
                          className="h-4 w-4"
                          style={{ color: LIGHT_CONFIG[selectedLight.type].color }}
                        />
                      );
                    })()}
                    <input
                      type="text"
                      value={selectedLight.name}
                      onChange={e => updateLight(selectedLight.id, { name: e.target.value })}
                      className="border-b border-transparent bg-transparent text-sm font-medium text-white focus:border-white/30 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        updateLight(selectedLight.id, { enabled: !selectedLight.enabled })
                      }
                      className={clsx(
                        'rounded p-1.5 transition-colors',
                        selectedLight.enabled ? 'text-amber-400' : 'text-gray-500'
                      )}
                    >
                      {selectedLight.enabled ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => removeLight(selectedLight.id)}
                      className="rounded p-1.5 text-gray-500 transition-colors hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Phase 6: Tangible Controls Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Intensity - ScrubbableInput */}
                  <ScrubbableInput
                    label="Intensity"
                    value={selectedLight.intensity}
                    onChange={val => updateLight(selectedLight.id, { intensity: val })}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                  />

                  {/* Color Temperature - ScrubbableInput */}
                  <ScrubbableInput
                    label="Color Temp"
                    value={selectedLight.colorTemp}
                    onChange={val => updateLight(selectedLight.id, { colorTemp: val })}
                    min={2700}
                    max={10000}
                    step={100}
                    unit="K"
                    sensitivity={2}
                  />

                  {/* Softness - ScrubbableInput */}
                  <ScrubbableInput
                    label="Softness"
                    value={selectedLight.softness}
                    onChange={val => updateLight(selectedLight.id, { softness: val })}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                  />
                </div>

                {/* Light Angle - RotaryKnob (for directional control) */}
                <div className="mt-3 flex items-center justify-center gap-6 border-t border-white/5 pt-3">
                  <RotaryKnob
                    label="Azimuth"
                    value={Math.round(selectedLight.x * 360)}
                    onChange={val => updateLight(selectedLight.id, { x: val / 360 })}
                    min={0}
                    max={360}
                    wrap={true}
                    color="cyan"
                    size={44}
                  />
                  <RotaryKnob
                    label="Elevation"
                    value={Math.round((1 - selectedLight.y) * 90)}
                    onChange={val => updateLight(selectedLight.id, { y: 1 - (val / 90) })}
                    min={0}
                    max={90}
                    wrap={false}
                    color="amber"
                    size={44}
                    unit="°"
                  />
                </div>

                {/* Gel Color Toggle & Picker */}
                <div className="mt-3 border-t border-white/5 pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedLight.useGel ?? false}
                        onChange={e => updateLight(selectedLight.id, { useGel: e.target.checked })}
                        className="h-3 w-3 rounded border-gray-600 text-purple-500 focus:ring-purple-500/30"
                      />
                      <span className="text-xs text-gray-400">Use Gel Color</span>
                    </label>
                    {selectedLight.useGel && (
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedLight.gelColor ?? '#ffffff'}
                          onChange={e =>
                            updateLight(selectedLight.id, { gelColor: e.target.value })
                          }
                          className="h-6 w-6 cursor-pointer rounded border border-white/20 bg-transparent"
                        />
                        <span className="font-mono text-[10px] text-gray-500">
                          {selectedLight.gelColor?.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  {selectedLight.useGel && (
                    <div className="flex flex-wrap gap-1">
                      {/* Quick gel presets */}
                      {[
                        { color: '#ff00ff', label: 'Magenta' },
                        { color: '#00ffff', label: 'Cyan' },
                        { color: '#ff0000', label: 'Red' },
                        { color: '#0066ff', label: 'Blue' },
                        { color: '#00ff00', label: 'Green' },
                        { color: '#ff8800', label: 'CTO' },
                        { color: '#8800ff', label: 'Purple' },
                      ].map(gel => (
                        <Tooltip key={gel.color} content={gel.label} side="top">
                          <button
                            onClick={() => updateLight(selectedLight.id, { gelColor: gel.color })}
                            className={clsx(
                              'h-5 w-5 rounded border-2 transition-all',
                              selectedLight.gelColor === gel.color
                                ? 'scale-110 border-white'
                                : 'border-transparent hover:border-white/50'
                            )}
                            style={{ backgroundColor: gel.color }}
                          />
                        </Tooltip>
                      ))}
                    </div>
                  )}
                </div>

                {/* Distance - ScrubbableInput (affects falloff) */}
                <div className="mt-3 border-t border-white/5 pt-3">
                  <ScrubbableInput
                    label="Distance (Falloff)"
                    value={Math.round((selectedLight.distance ?? 0.5) * 100)}
                    onChange={val => updateLight(selectedLight.id, { distance: val / 100 })}
                    min={10}
                    max={100}
                    step={5}
                    unit="%"
                    sensitivity={3}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prompt Preview & Apply */}
        <div className="space-y-3 border-t border-white/10 p-4">
          <div>
            <div className="mb-1 text-xs text-gray-500">Generated Prompt Modifier</div>
            <div className="min-h-[40px] rounded-lg bg-white/5 p-2 text-xs text-gray-300">
              {generatePromptModifier() || (
                <span className="text-gray-500 italic">No lighting setup</span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg bg-white/5 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!isEnabled || lights.length === 0}
              className={clsx(
                'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                isEnabled && lights.length > 0
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                  : 'cursor-not-allowed bg-white/5 text-gray-500'
              )}
            >
              Apply Lighting
            </button>
          </div>

          {/* UX-011: Keyboard shortcut hint */}
          <div className="mt-2 text-center">
            <button
              onClick={() => setShowShortcutGuide(true)}
              className="text-[10px] text-gray-600 transition-colors hover:text-gray-400"
            >
              Press <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono">?</kbd> for keyboard shortcuts
            </button>
          </div>
        </div>

        {/* UX-011: Keyboard Shortcut Guide Overlay */}
        <AnimatePresence>
          {showShortcutGuide && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
              onClick={() => setShowShortcutGuide(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-72 rounded-xl border border-amber-500/30 bg-zinc-900/95 p-4 shadow-2xl"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-400" />
                    <h4 className="text-sm font-semibold text-white">Gaffer&apos;s Keyboard</h4>
                  </div>
                  <button
                    onClick={() => setShowShortcutGuide(false)}
                    className="text-gray-500 transition-colors hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {[
                    { key: 'L', action: 'Add Light Menu', color: 'text-cyan-400' },
                    { key: 'G', action: 'Toggle Gel Color', color: 'text-purple-400' },
                    { key: 'Del', action: 'Delete Selected Light', color: 'text-red-400' },
                    { key: 'Esc', action: 'Deselect / Close', color: 'text-gray-400' },
                    { key: '⌘Z', action: 'Undo', color: 'text-amber-400' },
                    { key: '⌘⇧Z', action: 'Redo', color: 'text-amber-400' },
                    { key: '?', action: 'This Guide', color: 'text-white' },
                  ].map(shortcut => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                    >
                      <kbd
                        className={clsx(
                          'min-w-[36px] rounded bg-zinc-800 px-2 py-1 text-center font-mono text-xs',
                          shortcut.color
                        )}
                      >
                        {shortcut.key}
                      </kbd>
                      <span className="text-xs text-gray-300">{shortcut.action}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 text-center text-[10px] text-gray-500">
                  Click anywhere or press Esc to close
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
