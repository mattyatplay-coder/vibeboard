/**
 * SceneDepthControls Component
 *
 * Controls for positioning foreground and background layers in 3D space
 * Integrates with the optical physics engine for accurate DOF simulation
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    calculateBlurRadius,
    calculateDOF,
    STANDARD_FRAMING_DISTANCES,
} from '@/lib/opticalPhysics';
import type { ExtractedLayer } from './LayerCompositor';
import {
    Layers,
    Move,
    Eye,
    EyeOff,
    Lock,
    Unlock,
    ChevronDown,
    ChevronUp,
    Trash2,
    Plus,
    X,
    Image,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface LayerConfig extends ExtractedLayer {
    /** Is layer visible */
    isVisible: boolean;
    /** Is layer locked (can't be moved) */
    isLocked: boolean;
    /** Layer opacity (0-1) */
    opacity: number;
    /** Z-index for rendering order override */
    zIndex: number;
    /** Horizontal position offset (-100 to 100, percentage of canvas width) */
    offsetX?: number;
    /** Vertical position offset (-100 to 100, percentage of canvas height) */
    offsetY?: number;
    /** Scale factor (0.1 to 3) */
    scale?: number;
}

export interface CameraSettings {
    focalLengthMm: number;
    aperture: number;
    focusDistanceM: number;
    sensorType: string;
}

export interface SceneDepthControlsProps {
    /** Array of layers to control */
    layers: LayerConfig[];
    /** Camera settings for DOF calculations */
    cameraSettings: CameraSettings;
    /** Canvas dimensions for blur calculation */
    canvasWidth: number;
    /** Callback when layer is updated */
    onLayerUpdate: (layerId: string, updates: Partial<LayerConfig>) => void;
    /** Callback when layer is deleted */
    onLayerDelete: (layerId: string) => void;
    /** Callback when layer order changes */
    onLayerReorder: (layers: LayerConfig[]) => void;
    /** Callback when focus distance changes */
    onFocusDistanceChange: (distanceM: number) => void;
    /** Whether panel is expanded */
    isExpanded?: boolean;
}

// ============================================================================
// LAYER ITEM COMPONENT
// ============================================================================

interface LayerItemProps {
    layer: LayerConfig;
    blurRadius: number;
    isInFocus: boolean;
    nearLimit: number;
    farLimit: number;
    focusDistance: number;
    onUpdate: (updates: Partial<LayerConfig>) => void;
    onDelete: () => void;
    onClear: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
}

function LayerItem({
    layer,
    blurRadius,
    isInFocus,
    nearLimit,
    farLimit,
    focusDistance,
    onUpdate,
    onDelete,
    onClear,
    onMoveUp,
    onMoveDown,
    canMoveUp,
    canMoveDown,
}: LayerItemProps): React.ReactElement {
    const [isExpanded, setIsExpanded] = useState(false);

    const layerTypeColors: Record<string, string> = {
        subject: 'cyan',
        foreground: 'purple',
        background: 'amber',
        midground: 'green',
    };

    const color = layerTypeColors[layer.type] || 'gray';
    const focusStatus = isInFocus ? 'In Focus' : layer.distanceM < focusDistance ? 'Foreground' : 'Background';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`rounded border transition-all ${
                layer.isVisible
                    ? `border-${color}-500/30 bg-${color}-500/10`
                    : 'border-white/10 bg-white/5 opacity-50'
            }`}
        >
            {/* Header */}
            <div
                className="flex cursor-pointer items-center gap-2 p-2"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Visibility toggle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onUpdate({ isVisible: !layer.isVisible });
                    }}
                    className="text-gray-400 hover:text-white"
                >
                    {layer.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </button>

                {/* Lock toggle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onUpdate({ isLocked: !layer.isLocked });
                    }}
                    className="text-gray-400 hover:text-white"
                >
                    {layer.isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                </button>

                {/* Layer thumbnail */}
                <div
                    className={`h-8 w-8 overflow-hidden rounded border border-${color}-500/50`}
                    style={{
                        filter: isInFocus ? 'none' : `blur(${Math.min(blurRadius * 0.05, 3)}px)`,
                    }}
                >
                    {layer.imageUrl ? (
                        <img src={layer.imageUrl} alt={layer.name} className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-800">
                            <Image className="h-4 w-4 text-gray-600" />
                        </div>
                    )}
                </div>

                {/* Layer info */}
                <div className="flex-1 min-w-0">
                    <p className="truncate text-[10px] font-medium text-white">{layer.name}</p>
                    <p className="text-[8px] text-gray-500">
                        {layer.distanceM.toFixed(2)}m • {focusStatus}
                    </p>
                </div>

                {/* Blur indicator */}
                <div className="text-right">
                    <p className={`text-[9px] ${isInFocus ? 'text-green-400' : 'text-gray-400'}`}>
                        {isInFocus ? 'Sharp' : `${blurRadius.toFixed(1)}px`}
                    </p>
                </div>

                {/* Clear layer button (X) */}
                {layer.imageUrl && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClear();
                        }}
                        className="rounded p-0.5 text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                        title="Clear layer image"
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}

                {/* Expand toggle */}
                <div className="text-gray-400">
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </div>
            </div>

            {/* Expanded controls */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-white/10"
                    >
                        <div className="space-y-3 p-2">
                            {/* Distance slider */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-gray-400">Distance</span>
                                    <span className="text-[9px] text-white">{layer.distanceM.toFixed(2)}m</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="range"
                                        min={0.1}
                                        max={20}
                                        step={0.1}
                                        value={layer.distanceM}
                                        onChange={(e) => onUpdate({ distanceM: Number(e.target.value) })}
                                        disabled={layer.isLocked}
                                        className={`w-full accent-${color}-500`}
                                    />
                                    {/* DOF zone indicator */}
                                    <div
                                        className="absolute top-1/2 h-1 -translate-y-1/2 bg-green-500/30"
                                        style={{
                                            left: `${(nearLimit / 20) * 100}%`,
                                            width: `${((Math.min(farLimit, 20) - nearLimit) / 20) * 100}%`,
                                        }}
                                    />
                                </div>
                                <div className="flex justify-between text-[8px] text-gray-500">
                                    <span>0.1m</span>
                                    <span>20m</span>
                                </div>
                            </div>

                            {/* Opacity slider */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-gray-400">Opacity</span>
                                    <span className="text-[9px] text-white">{Math.round(layer.opacity * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={layer.opacity}
                                    onChange={(e) => onUpdate({ opacity: Number(e.target.value) })}
                                    className="w-full"
                                />
                            </div>

                            {/* Position controls */}
                            <div className="space-y-2 border-t border-white/10 pt-2">
                                <div className="flex items-center gap-1">
                                    <Move className="h-3 w-3 text-gray-400" />
                                    <span className="text-[9px] font-medium text-gray-300">Position</span>
                                </div>

                                {/* X Position */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-gray-400">X Offset</span>
                                        <span className="text-[9px] text-white">{layer.offsetX ?? 0}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={-100}
                                        max={100}
                                        step={1}
                                        value={layer.offsetX ?? 0}
                                        onChange={(e) => onUpdate({ offsetX: Number(e.target.value) })}
                                        disabled={layer.isLocked}
                                        className="w-full accent-blue-500"
                                    />
                                </div>

                                {/* Y Position */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-gray-400">Y Offset</span>
                                        <span className="text-[9px] text-white">{layer.offsetY ?? 0}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={-100}
                                        max={100}
                                        step={1}
                                        value={layer.offsetY ?? 0}
                                        onChange={(e) => onUpdate({ offsetY: Number(e.target.value) })}
                                        disabled={layer.isLocked}
                                        className="w-full accent-green-500"
                                    />
                                </div>

                                {/* Scale */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-gray-400">Scale</span>
                                        <span className="text-[9px] text-white">{Math.round((layer.scale ?? 1) * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={10}
                                        max={300}
                                        step={5}
                                        value={(layer.scale ?? 1) * 100}
                                        onChange={(e) => onUpdate({ scale: Number(e.target.value) / 100 })}
                                        disabled={layer.isLocked}
                                        className="w-full accent-purple-500"
                                    />
                                </div>

                                {/* Reset position button */}
                                <button
                                    onClick={() => onUpdate({ offsetX: 0, offsetY: 0, scale: 1 })}
                                    disabled={layer.isLocked}
                                    className="w-full rounded bg-white/5 py-1 text-[9px] text-gray-400 hover:bg-white/10 disabled:opacity-50"
                                >
                                    Reset Position
                                </button>
                            </div>

                            {/* Quick distance presets */}
                            <div className="flex flex-wrap gap-1">
                                {Object.entries(STANDARD_FRAMING_DISTANCES).slice(0, 5).map(([key, dist]) => (
                                    <button
                                        key={key}
                                        onClick={() => onUpdate({ distanceM: dist })}
                                        disabled={layer.isLocked}
                                        className={`rounded px-1.5 py-0.5 text-[8px] ${
                                            Math.abs(layer.distanceM - dist) < 0.1
                                                ? `bg-${color}-500/30 text-${color}-300`
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        } disabled:opacity-50`}
                                    >
                                        {dist}m
                                    </button>
                                ))}
                            </div>

                            {/* Layer order and delete */}
                            <div className="flex items-center justify-between border-t border-white/10 pt-2">
                                <div className="flex gap-1">
                                    <button
                                        onClick={onMoveUp}
                                        disabled={!canMoveUp}
                                        className="rounded bg-white/5 p-1 text-gray-400 hover:bg-white/10 disabled:opacity-30"
                                    >
                                        <ChevronUp className="h-3 w-3" />
                                    </button>
                                    <button
                                        onClick={onMoveDown}
                                        disabled={!canMoveDown}
                                        className="rounded bg-white/5 p-1 text-gray-400 hover:bg-white/10 disabled:opacity-30"
                                    >
                                        <ChevronDown className="h-3 w-3" />
                                    </button>
                                </div>
                                <button
                                    onClick={onDelete}
                                    className="rounded bg-red-500/10 p-1 text-red-400 hover:bg-red-500/20"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SceneDepthControls({
    layers,
    cameraSettings,
    canvasWidth,
    onLayerUpdate,
    onLayerDelete,
    onLayerReorder,
    onFocusDistanceChange,
    isExpanded = true,
}: SceneDepthControlsProps): React.ReactElement | null {
    // Calculate DOF limits
    const dofLimits = useMemo(() => {
        return calculateDOF({
            focalLengthMm: cameraSettings.focalLengthMm,
            aperture: cameraSettings.aperture,
            focusDistanceM: cameraSettings.focusDistanceM,
            sensorType: cameraSettings.sensorType,
        });
    }, [cameraSettings]);

    // Calculate blur for each layer
    const layerBlurs = useMemo(() => {
        return layers.map((layer) => {
            const blur = calculateBlurRadius({
                focalLengthMm: cameraSettings.focalLengthMm,
                aperture: cameraSettings.aperture,
                focusDistanceM: cameraSettings.focusDistanceM,
                elementDistanceM: layer.distanceM,
                sensorType: cameraSettings.sensorType,
                imageWidthPx: canvasWidth,
            });
            const isInFocus =
                layer.distanceM >= dofLimits.nearLimitM && layer.distanceM <= dofLimits.farLimitM;
            return { layerId: layer.id, blur, isInFocus };
        });
    }, [layers, cameraSettings, canvasWidth, dofLimits]);

    // Handle layer reordering
    const moveLayer = useCallback(
        (index: number, direction: 'up' | 'down') => {
            const newLayers = [...layers];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= newLayers.length) return;
            [newLayers[index], newLayers[targetIndex]] = [newLayers[targetIndex], newLayers[index]];
            onLayerReorder(newLayers);
        },
        [layers, onLayerReorder]
    );

    if (!isExpanded) return null;

    return (
        <div className="space-y-3 rounded-lg border border-white/10 bg-black/40 p-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-cyan-400" />
                    <h4 className="text-xs font-medium text-white">Scene Depth</h4>
                </div>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-gray-400">
                    {layers.length} layers
                </span>
            </div>

            {/* DOF Info */}
            <div className="rounded bg-green-500/10 p-2">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] text-green-400">Depth of Field Zone</span>
                    <span className="text-[9px] text-white">
                        {dofLimits.nearLimitM.toFixed(2)}m - {dofLimits.isHyperfocal ? '∞' : `${dofLimits.farLimitM.toFixed(2)}m`}
                    </span>
                </div>
                <div className="mt-1 text-[8px] text-gray-500">
                    Total DOF: {dofLimits.isHyperfocal ? 'Infinity' : `${dofLimits.totalDOF.toFixed(2)}m`}
                </div>
            </div>

            {/* Focus distance control */}
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] text-gray-400">Focus Distance</span>
                    <span className="text-[10px] font-medium text-white">
                        {cameraSettings.focusDistanceM.toFixed(2)}m
                    </span>
                </div>
                <input
                    type="range"
                    min={0.1}
                    max={20}
                    step={0.1}
                    value={cameraSettings.focusDistanceM}
                    onChange={(e) => onFocusDistanceChange(Number(e.target.value))}
                    className="w-full accent-green-500"
                />

                {/* Quick focus presets */}
                <div className="flex flex-wrap gap-1">
                    {layers
                        .filter((l) => l.type === 'subject')
                        .map((l) => (
                            <button
                                key={l.id}
                                onClick={() => onFocusDistanceChange(l.distanceM)}
                                className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[8px] text-cyan-300 hover:bg-cyan-500/30"
                            >
                                Focus: {l.name}
                            </button>
                        ))}
                </div>
            </div>

            {/* Layer list */}
            <div className="space-y-2">
                <AnimatePresence>
                    {layers.map((layer, index) => {
                        const blurData = layerBlurs.find((b) => b.layerId === layer.id);
                        return (
                            <LayerItem
                                key={layer.id}
                                layer={layer}
                                blurRadius={blurData?.blur || 0}
                                isInFocus={blurData?.isInFocus || false}
                                nearLimit={dofLimits.nearLimitM}
                                farLimit={dofLimits.farLimitM}
                                focusDistance={cameraSettings.focusDistanceM}
                                onUpdate={(updates) => onLayerUpdate(layer.id, updates)}
                                onDelete={() => onLayerDelete(layer.id)}
                                onClear={() => onLayerUpdate(layer.id, { imageUrl: '' })}
                                onMoveUp={() => moveLayer(index, 'up')}
                                onMoveDown={() => moveLayer(index, 'down')}
                                canMoveUp={index > 0}
                                canMoveDown={index < layers.length - 1}
                            />
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Empty state */}
            {layers.length === 0 && (
                <div className="rounded border border-dashed border-white/20 p-4 text-center">
                    <p className="text-[10px] text-gray-500">No layers extracted yet</p>
                    <p className="mt-1 text-[9px] text-gray-600">
                        Use AI Layer Separation to create depth layers
                    </p>
                </div>
            )}

            {/* Depth visualization */}
            {layers.length > 0 && (
                <div className="border-t border-white/10 pt-3">
                    <p className="mb-2 text-[9px] text-gray-400">Depth Map</p>
                    <div className="relative h-8 rounded bg-gradient-to-r from-purple-500/30 via-green-500/30 to-amber-500/30">
                        {/* DOF zone */}
                        <div
                            className="absolute top-0 h-full bg-green-500/40"
                            style={{
                                left: `${(dofLimits.nearLimitM / 20) * 100}%`,
                                width: `${((Math.min(dofLimits.farLimitM, 20) - dofLimits.nearLimitM) / 20) * 100}%`,
                            }}
                        />

                        {/* Focus point */}
                        <div
                            className="absolute top-0 h-full w-0.5 bg-green-400"
                            style={{ left: `${(cameraSettings.focusDistanceM / 20) * 100}%` }}
                        />

                        {/* Layer markers */}
                        {layers.map((layer) => {
                            const blurData = layerBlurs.find((b) => b.layerId === layer.id);
                            const color = layer.type === 'subject' ? 'cyan' : layer.type === 'foreground' ? 'purple' : 'amber';
                            return (
                                <div
                                    key={layer.id}
                                    className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-${color}-500 ${
                                        blurData?.isInFocus ? `bg-${color}-500` : `bg-${color}-500/30`
                                    }`}
                                    style={{ left: `${(layer.distanceM / 20) * 100}%` }}
                                    title={`${layer.name}: ${layer.distanceM.toFixed(1)}m`}
                                />
                            );
                        })}

                        {/* Distance labels */}
                        <div className="absolute -bottom-4 left-0 text-[7px] text-gray-500">0m</div>
                        <div className="absolute -bottom-4 right-0 text-[7px] text-gray-500">20m</div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SceneDepthControls;
