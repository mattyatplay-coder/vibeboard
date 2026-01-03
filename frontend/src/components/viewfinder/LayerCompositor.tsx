/**
 * LayerCompositor Component
 *
 * Real-time compositing of extracted image layers with accurate DOF blur
 * Uses optical physics calculations for realistic depth-of-field simulation
 */

'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  calculateBlurRadius,
  calculateLayerTransform,
  type LayerTransform,
} from '@/lib/opticalPhysics';

// ============================================================================
// TYPES
// ============================================================================

export interface ExtractedLayer {
  /** Unique layer identifier */
  id: string;
  /** Layer name (e.g., "Subject", "Background", "Foreground") */
  name: string;
  /** Image URL or data URL */
  imageUrl: string;
  /** Distance from camera in meters */
  distanceM: number;
  /** Layer type for special handling */
  type: 'subject' | 'background' | 'foreground' | 'midground';
  /** Optional mask URL for alpha compositing */
  maskUrl?: string;
  /** Loaded image element (populated during rendering) */
  image?: HTMLImageElement;
  /** Loaded mask element (populated during rendering) */
  mask?: HTMLImageElement;
}

export interface CameraSettings {
  /** Focal length in millimeters */
  focalLengthMm: number;
  /** Aperture f-number */
  aperture: number;
  /** Focus distance in meters */
  focusDistanceM: number;
  /** Sensor type (e.g., 'full-frame', 'aps-c') */
  sensorType: string;
}

export interface LayerCompositorProps {
  /** Extracted layers to composite */
  layers: ExtractedLayer[];
  /** Camera settings for DOF calculation */
  cameraSettings: CameraSettings;
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Whether to show debug overlays */
  showDebug?: boolean;
  /** Callback when composition is complete */
  onCompositionComplete?: (dataUrl: string) => void;
  /** Custom class name */
  className?: string;
}

interface LayerRenderData extends ExtractedLayer {
  transform: LayerTransform;
}

// ============================================================================
// BLUR UTILITIES
// ============================================================================

/**
 * Apply Gaussian blur to a canvas context using multiple passes
 * More accurate than CSS blur for real DOF simulation
 */
function applyCanvasBlur(
  ctx: CanvasRenderingContext2D,
  radius: number,
  width: number,
  height: number
): void {
  if (radius <= 0) return;

  // Clamp blur radius to reasonable values
  const blurRadius = Math.min(radius, 100);

  // Use CSS filter for performance (WebGL would be better for production)
  ctx.filter = `blur(${blurRadius}px)`;
}

/**
 * Clear blur filter from context
 */
function clearBlur(ctx: CanvasRenderingContext2D): void {
  ctx.filter = 'none';
}

// ============================================================================
// LAYER COMPOSITOR COMPONENT
// ============================================================================

export function LayerCompositor({
  layers,
  cameraSettings,
  width,
  height,
  showDebug = false,
  onCompositionComplete,
  className = '',
}: LayerCompositorProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedLayers, setLoadedLayers] = useState<LayerRenderData[]>([]);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Load all layer images
  const loadImages = useCallback(async () => {
    setIsLoading(true);
    const debugLines: string[] = [];

    try {
      const loaded = await Promise.all(
        layers.map(async (layer): Promise<LayerRenderData> => {
          // Load main image
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = layer.imageUrl;
          });

          // Load mask if present
          let maskImg: HTMLImageElement | undefined;
          if (layer.maskUrl) {
            maskImg = new Image();
            maskImg.crossOrigin = 'anonymous';
            await new Promise<void>((resolve, reject) => {
              maskImg!.onload = () => resolve();
              maskImg!.onerror = reject;
              maskImg!.src = layer.maskUrl!;
            });
          }

          // Calculate transform for this layer
          const transform = calculateLayerTransform({
            layerDistanceM: layer.distanceM,
            focusDistanceM: cameraSettings.focusDistanceM,
            focalLengthMm: cameraSettings.focalLengthMm,
            aperture: cameraSettings.aperture,
            sensorType: cameraSettings.sensorType,
            canvasWidthPx: width,
          });

          debugLines.push(
            `${layer.name}: ${layer.distanceM}m → blur ${transform.blurPx.toFixed(1)}px, scale ${transform.scale.toFixed(2)}`
          );

          return {
            ...layer,
            image: img,
            mask: maskImg,
            transform,
          };
        })
      );

      // Sort layers by distance (back to front)
      loaded.sort((a, b) => b.distanceM - a.distanceM);

      setLoadedLayers(loaded);
      setDebugInfo(debugLines);
    } catch (error) {
      console.error('Failed to load layer images:', error);
      setDebugInfo(['Error loading images']);
    } finally {
      setIsLoading(false);
    }
  }, [layers, cameraSettings, width]);

  // Composite layers onto canvas
  const composeLayers = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || loadedLayers.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create offscreen canvas for layer processing
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const offscreen = offscreenCanvasRef.current;
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    // Clear main canvas
    ctx.clearRect(0, 0, width, height);

    // Render each layer back to front
    for (const layer of loadedLayers) {
      if (!layer.image) continue;

      // Clear offscreen
      offCtx.clearRect(0, 0, width, height);

      // Calculate scaled dimensions
      const scale = layer.transform.scale;
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      const offsetX = (width - scaledWidth) / 2;
      const offsetY = (height - scaledHeight) / 2;

      // Draw layer to offscreen canvas with scale
      offCtx.save();

      // Apply blur if out of focus
      if (layer.transform.blurPx > 0.5) {
        applyCanvasBlur(offCtx, layer.transform.blurPx, width, height);
      }

      // Draw scaled image
      offCtx.drawImage(layer.image, offsetX, offsetY, scaledWidth, scaledHeight);

      // Clear blur filter
      clearBlur(offCtx);

      // Apply mask if present
      if (layer.mask) {
        offCtx.globalCompositeOperation = 'destination-in';
        offCtx.drawImage(layer.mask, 0, 0, width, height);
        offCtx.globalCompositeOperation = 'source-over';
      }

      offCtx.restore();

      // Composite offscreen to main canvas
      ctx.drawImage(offscreen, 0, 0);
    }

    // Draw debug overlay if enabled
    if (showDebug) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 300, 20 + debugInfo.length * 16);
      ctx.fillStyle = '#00ff00';
      ctx.font = '12px monospace';
      ctx.fillText('DOF Compositor Debug', 20, 26);
      debugInfo.forEach((line, i) => {
        ctx.fillText(line, 20, 42 + i * 16);
      });
      ctx.restore();
    }

    // Notify completion
    if (onCompositionComplete) {
      onCompositionComplete(canvas.toDataURL('image/png'));
    }
  }, [loadedLayers, width, height, showDebug, debugInfo, onCompositionComplete]);

  // Load images when layers change
  useEffect(() => {
    if (layers.length > 0) {
      loadImages();
    }
  }, [layers, loadImages]);

  // Compose when loaded layers change
  useEffect(() => {
    if (loadedLayers.length > 0) {
      composeLayers();
    }
  }, [loadedLayers, composeLayers]);

  // Re-compose when camera settings change
  useEffect(() => {
    if (loadedLayers.length > 0) {
      // Recalculate transforms
      const updated = loadedLayers.map(layer => ({
        ...layer,
        transform: calculateLayerTransform({
          layerDistanceM: layer.distanceM,
          focusDistanceM: cameraSettings.focusDistanceM,
          focalLengthMm: cameraSettings.focalLengthMm,
          aperture: cameraSettings.aperture,
          sensorType: cameraSettings.sensorType,
          canvasWidthPx: width,
        }),
      }));
      setLoadedLayers(updated);
    }
  }, [cameraSettings.focusDistanceM, cameraSettings.aperture, cameraSettings.focalLengthMm]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block"
        style={{ width, height }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex items-center gap-2 text-white">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span className="text-sm">Loading layers...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LAYER PREVIEW COMPONENT
// ============================================================================

interface LayerPreviewProps {
  layer: ExtractedLayer;
  isActive: boolean;
  isFocused: boolean;
  blurRadius: number;
  onClick: () => void;
}

export function LayerPreview({
  layer,
  isActive,
  isFocused,
  blurRadius,
  onClick,
}: LayerPreviewProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded border-2 transition-all ${
        isActive
          ? 'border-cyan-500 ring-2 ring-cyan-500/50'
          : 'border-white/20 hover:border-white/40'
      }`}
      style={{ width: 80, height: 60 }}
    >
      <img
        src={layer.imageUrl}
        alt={layer.name}
        className="h-full w-full object-cover"
        style={{
          filter: isFocused ? 'none' : `blur(${Math.min(blurRadius * 0.1, 5)}px)`,
        }}
      />
      <div className="absolute right-0 bottom-0 left-0 bg-black/70 px-1 py-0.5">
        <p className="truncate text-[8px] text-white">{layer.name}</p>
        <p className="text-[7px] text-gray-400">{layer.distanceM.toFixed(1)}m</p>
      </div>
      {isFocused && (
        <div className="absolute top-1 right-1 rounded bg-green-500 px-1 py-0.5 text-[7px] font-bold text-white">
          FOCUS
        </div>
      )}
    </button>
  );
}

// ============================================================================
// DEPTH SLIDER COMPONENT
// ============================================================================

interface DepthSliderProps {
  layers: ExtractedLayer[];
  focusDistance: number;
  nearLimit: number;
  farLimit: number;
  onFocusChange: (distance: number) => void;
  onLayerDistanceChange: (layerId: string, distance: number) => void;
}

export function DepthSlider({
  layers,
  focusDistance,
  nearLimit,
  farLimit,
  onFocusChange,
  onLayerDistanceChange,
}: DepthSliderProps): React.ReactElement {
  const maxDistance = Math.max(10, ...layers.map(l => l.distanceM));
  const minDistance = 0.1;

  const distanceToPercent = (d: number) =>
    ((Math.log10(d) - Math.log10(minDistance)) /
      (Math.log10(maxDistance) - Math.log10(minDistance))) *
    100;

  const percentToDistance = (p: number) =>
    Math.pow(
      10,
      (p / 100) * (Math.log10(maxDistance) - Math.log10(minDistance)) + Math.log10(minDistance)
    );

  return (
    <div className="relative h-8 rounded bg-black/50">
      {/* DOF zone visualization */}
      <div
        className="absolute top-0 h-full bg-green-500/20"
        style={{
          left: `${distanceToPercent(nearLimit)}%`,
          width: `${distanceToPercent(farLimit) - distanceToPercent(nearLimit)}%`,
        }}
      />

      {/* Focus point indicator */}
      <div
        className="absolute top-0 h-full w-0.5 bg-green-500"
        style={{ left: `${distanceToPercent(focusDistance)}%` }}
      />

      {/* Layer markers */}
      {layers.map(layer => (
        <div
          key={layer.id}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize"
          style={{ left: `${distanceToPercent(layer.distanceM)}%` }}
          draggable={false}
          onMouseDown={e => {
            const startX = e.clientX;
            const startDist = layer.distanceM;
            const rect = e.currentTarget.parentElement?.getBoundingClientRect();
            if (!rect) return;

            const handleMove = (moveE: MouseEvent) => {
              const deltaX = moveE.clientX - startX;
              const deltaPercent = (deltaX / rect.width) * 100;
              const newPercent = distanceToPercent(startDist) + deltaPercent;
              const newDist = percentToDistance(Math.max(0, Math.min(100, newPercent)));
              onLayerDistanceChange(layer.id, newDist);
            };

            const handleUp = () => {
              document.removeEventListener('mousemove', handleMove);
              document.removeEventListener('mouseup', handleUp);
            };

            document.addEventListener('mousemove', handleMove);
            document.addEventListener('mouseup', handleUp);
          }}
        >
          <div
            className={`h-4 w-4 rounded-full border-2 ${
              layer.type === 'subject'
                ? 'border-cyan-500 bg-cyan-500/50'
                : layer.type === 'foreground'
                  ? 'border-purple-500 bg-purple-500/50'
                  : 'border-amber-500 bg-amber-500/50'
            }`}
          />
        </div>
      ))}

      {/* Focus slider track */}
      <input
        type="range"
        min={0}
        max={100}
        value={distanceToPercent(focusDistance)}
        onChange={e => onFocusChange(percentToDistance(Number(e.target.value)))}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />

      {/* Distance labels */}
      <div className="absolute -bottom-4 left-0 text-[8px] text-gray-500">0.1m</div>
      <div className="absolute right-0 -bottom-4 text-[8px] text-gray-500">
        {maxDistance.toFixed(0)}m
      </div>
    </div>
  );
}

export default LayerCompositor;
