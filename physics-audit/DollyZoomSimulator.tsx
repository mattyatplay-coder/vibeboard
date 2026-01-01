/**
 * DollyZoomSimulator Component
 *
 * Simulates the "Hitchcock Effect" - dolly + zoom to change perspective
 * while maintaining subject framing.
 *
 * Mode A: Constant Framing - Subject stays same size, background changes
 * Mode B: Constant Distance - Camera stays put, zoom changes perspective
 */

'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    calculateDollyZoom,
    calculateFOV,
    calculateSubjectFrameSize,
    calculateDistanceForFraming,
    FOCAL_LENGTHS,
} from '@/lib/opticalPhysics';
import { Play, Pause, RotateCcw, ArrowLeftRight, ZoomIn } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type SimulationMode = 'constant-framing' | 'constant-distance';

export interface DollyZoomSimulatorProps {
    /** Current focal length in mm */
    focalLengthMm: number;
    /** Current camera distance in meters */
    distanceM: number;
    /** Subject height in meters (default 1.7m for standing human) */
    subjectHeightM?: number;
    /** Sensor type for calculations */
    sensorType: string;
    /** Callback when focal length changes */
    onFocalLengthChange: (focalMm: number) => void;
    /** Callback when distance changes */
    onDistanceChange: (distanceM: number) => void;
    /** Optional: Reference image URL for visualization */
    referenceImageUrl?: string;
    /** Whether simulator is expanded/visible */
    isExpanded?: boolean;
}

interface AnimationKeyframe {
    focalLengthMm: number;
    distanceM: number;
    fov: number;
    backgroundScale: number;
}

// ============================================================================
// ANIMATION PRESETS
// ============================================================================

const DOLLY_ZOOM_PRESETS = [
    {
        id: 'classic-vertigo',
        name: 'Vertigo',
        description: 'Classic Hitchcock - zoom in, dolly out',
        startFocal: 28,
        endFocal: 85,
        duration: 3,
    },
    {
        id: 'reverse-vertigo',
        name: 'Reverse Vertigo',
        description: 'Modern horror - zoom out, dolly in',
        startFocal: 85,
        endFocal: 28,
        duration: 3,
    },
    {
        id: 'subtle-compression',
        name: 'Subtle',
        description: 'Gentle background shift',
        startFocal: 35,
        endFocal: 50,
        duration: 2,
    },
    {
        id: 'dramatic-expansion',
        name: 'Dramatic',
        description: 'Wide to telephoto transition',
        startFocal: 24,
        endFocal: 135,
        duration: 4,
    },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DollyZoomSimulator({
    focalLengthMm,
    distanceM,
    subjectHeightM = 1.7,
    sensorType,
    onFocalLengthChange,
    onDistanceChange,
    referenceImageUrl,
    isExpanded = true,
}: DollyZoomSimulatorProps): React.ReactElement | null {
    // Simulation state
    const [mode, setMode] = useState<SimulationMode>('constant-framing');
    const [isAnimating, setIsAnimating] = useState(false);
    const [animationProgress, setAnimationProgress] = useState(0);
    const [animationPreset, setAnimationPreset] = useState(DOLLY_ZOOM_PRESETS[0]);

    // Target values for animation
    const [targetFocalMm, setTargetFocalMm] = useState(focalLengthMm);

    // Calculate current FOV
    const currentFOV = useMemo(() => {
        return calculateFOV({ focalLengthMm, sensorType });
    }, [focalLengthMm, sensorType]);

    // Calculate subject frame size
    const subjectFrameSize = useMemo(() => {
        return calculateSubjectFrameSize(subjectHeightM, distanceM, focalLengthMm, sensorType);
    }, [subjectHeightM, distanceM, focalLengthMm, sensorType]);

    // Calculate dolly zoom effect preview
    const dollyZoomPreview = useMemo(() => {
        // Fix (User Feedback): Vertigo/Reverse Vertigo were switched in preview.
        // When animating, we must compare Current Focal vs Animation Start Focal
        // to show the "accumulated" effect.
        // Default behavior (Current vs Target) works for static/manual interaction.
        const startState = isAnimating ? animationPreset.startFocal : focalLengthMm;
        const endState = isAnimating ? focalLengthMm : targetFocalMm;

        return calculateDollyZoom({
            initialFocalMm: startState,
            finalFocalMm: endState,
            initialDistanceM: distanceM,
            subjectHeightM,
            sensorType,
        });
    }, [focalLengthMm, targetFocalMm, distanceM, subjectHeightM, sensorType, isAnimating, animationPreset]);

    // Handle mode A: Constant Framing (adjust distance with focal length)
    const handleConstantFramingZoom = useCallback(
        (newFocalMm: number) => {
            if (mode !== 'constant-framing') return;

            // Calculate new distance to maintain same framing
            const focalRatio = newFocalMm / focalLengthMm;
            const newDistance = distanceM * focalRatio;

            onFocalLengthChange(newFocalMm);
            onDistanceChange(newDistance);
        },
        [mode, focalLengthMm, distanceM, onFocalLengthChange, onDistanceChange]
    );

    // Handle mode B: Constant Distance (only change focal length)
    const handleConstantDistanceZoom = useCallback(
        (newFocalMm: number) => {
            if (mode !== 'constant-distance') return;
            onFocalLengthChange(newFocalMm);
        },
        [mode, onFocalLengthChange]
    );

    // Unified zoom handler
    const handleZoom = useCallback(
        (newFocalMm: number) => {
            if (mode === 'constant-framing') {
                handleConstantFramingZoom(newFocalMm);
            } else {
                handleConstantDistanceZoom(newFocalMm);
            }
            setTargetFocalMm(newFocalMm);
        },
        [mode, handleConstantFramingZoom, handleConstantDistanceZoom]
    );

    // Animate dolly zoom
    const startAnimation = useCallback(() => {
        if (isAnimating) return;

        setIsAnimating(true);
        setAnimationProgress(0);

        const startFocal = animationPreset.startFocal;
        const endFocal = animationPreset.endFocal;
        const duration = animationPreset.duration * 1000; // ms
        const startTime = performance.now();

        // Set initial values
        const initialDistance = distanceM;
        onFocalLengthChange(startFocal);
        if (mode === 'constant-framing') {
            const initialFocalRatio = startFocal / focalLengthMm;
            onDistanceChange(initialDistance * initialFocalRatio);
        }

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            setAnimationProgress(progress);

            // Ease in-out
            const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            const currentFocal = startFocal + (endFocal - startFocal) * eased;
            onFocalLengthChange(currentFocal);

            if (mode === 'constant-framing') {
                const focalRatio = currentFocal / startFocal;
                onDistanceChange(initialDistance * focalRatio);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setIsAnimating(false);
            }
        };

        requestAnimationFrame(animate);
    }, [
        isAnimating,
        animationPreset,
        mode,
        focalLengthMm,
        distanceM,
        onFocalLengthChange,
        onDistanceChange,
    ]);

    // Stop animation
    const stopAnimation = useCallback(() => {
        setIsAnimating(false);
    }, []);

    // Reset to starting position
    const resetAnimation = useCallback(() => {
        setIsAnimating(false);
        setAnimationProgress(0);
        onFocalLengthChange(animationPreset.startFocal);
        if (mode === 'constant-framing') {
            const targetFrameSize = subjectFrameSize;
            const newDist = calculateDistanceForFraming(
                subjectHeightM,
                targetFrameSize,
                animationPreset.startFocal,
                sensorType
            );
            onDistanceChange(newDist);
        }
    }, [animationPreset, mode, subjectHeightM, subjectFrameSize, sensorType, onFocalLengthChange, onDistanceChange]);

    if (!isExpanded) return null;

    return (
        <div className="space-y-3 rounded-lg border border-white/10 bg-black/40 p-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-white">Dolly Zoom Simulator</h4>
                <div className="flex gap-1">
                    <button
                        onClick={() => setMode('constant-framing')}
                        className={`rounded px-2 py-1 text-[9px] transition-all ${mode === 'constant-framing'
                            ? 'bg-cyan-500/30 text-cyan-300'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        <ArrowLeftRight className="mr-1 inline h-3 w-3" />
                        Framing
                    </button>
                    <button
                        onClick={() => setMode('constant-distance')}
                        className={`rounded px-2 py-1 text-[9px] transition-all ${mode === 'constant-distance'
                            ? 'bg-amber-500/30 text-amber-300'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        <ZoomIn className="mr-1 inline h-3 w-3" />
                        Distance
                    </button>
                </div>
            </div>

            {/* Mode description */}
            <p className="text-[9px] text-gray-500">
                {mode === 'constant-framing'
                    ? 'Subject stays same size while background perspective changes (Hitchcock effect)'
                    : 'Camera stays put - only focal length changes (pure zoom)'}
            </p>

            {/* Visual preview */}
            <div className="relative aspect-video overflow-hidden rounded border border-white/10 bg-black/60">
                {referenceImageUrl ? (
                    <img
                        src={referenceImageUrl}
                        alt="Reference"
                        className="h-full w-full object-cover"
                        style={{
                            transform:
                                mode === 'constant-framing'
                                    ? `scale(${dollyZoomPreview.backgroundScale})`
                                    : 'none',
                            transition: 'transform 0.3s ease-out',
                        }}
                    />
                ) : (
                    // Placeholder visualization
                    <div className="flex h-full items-center justify-center">
                        <div className="relative">
                            {/* Subject placeholder */}
                            <div
                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-500 bg-cyan-500/20"
                                style={{
                                    width: 40 * subjectFrameSize,
                                    height: 80 * subjectFrameSize,
                                }}
                            />
                            {/* Background grid */}
                            <div
                                className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"
                                style={{
                                    transform: `scale(${dollyZoomPreview.backgroundScale})`,
                                    transition: 'transform 0.3s ease-out',
                                    width: 200,
                                    height: 100,
                                    marginLeft: -100,
                                    marginTop: -50,
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* FOV indicator */}
                <div className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-white">
                    FOV: {currentFOV.horizontalDeg.toFixed(1)}°
                </div>

                {/* Background scale indicator */}
                <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-white">
                    BG: {(dollyZoomPreview.backgroundScale * 100).toFixed(0)}%
                </div>
            </div>

            {/* Distance Slider (Added per user request) */}
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] text-gray-400">Camera Distance</span>
                    <span className="text-[10px] font-medium text-white">{distanceM.toFixed(2)}m</span>
                </div>
                <input
                    type="range"
                    min={0.5}
                    max={10}
                    step={0.1}
                    value={distanceM}
                    onChange={(e) => onDistanceChange(Number(e.target.value))}
                    disabled={isAnimating}
                    className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-[8px] text-gray-500">
                    <span>0.5m (Close)</span>
                    <span>10m (Wide)</span>
                </div>
            </div>

            {/* Focal length slider */}
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] text-gray-400">Focal Length</span>
                    <span className="text-[10px] font-medium text-white">{focalLengthMm}mm</span>
                </div>
                <input
                    type="range"
                    min={14}
                    max={200}
                    value={focalLengthMm}
                    onChange={(e) => handleZoom(Number(e.target.value))}
                    disabled={isAnimating}
                    className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-[8px] text-gray-500">
                    <span>14mm (Wide)</span>
                    <span>200mm (Tele)</span>
                </div>
            </div>

            {/* Quick focal length buttons */}
            <div className="flex flex-wrap gap-1">
                {[24, 35, 50, 85, 135].map((focal) => (
                    <button
                        key={focal}
                        onClick={() => handleZoom(focal)}
                        disabled={isAnimating}
                        className={`rounded px-2 py-1 text-[9px] transition-all ${focalLengthMm === focal
                            ? 'bg-cyan-500/30 text-cyan-300'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        {focal}mm
                    </button>
                ))}
            </div>

            {/* Animation presets */}
            <div className="border-t border-white/10 pt-3">
                <p className="mb-2 text-[9px] text-gray-400">Animation Presets</p>
                <div className="grid grid-cols-2 gap-1">
                    {DOLLY_ZOOM_PRESETS.map((preset) => (
                        <button
                            key={preset.id}
                            onClick={() => setAnimationPreset(preset)}
                            className={`rounded border p-1.5 text-left transition-all ${animationPreset.id === preset.id
                                ? 'border-purple-500/50 bg-purple-500/20'
                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                }`}
                        >
                            <p className="text-[9px] font-medium text-white">{preset.name}</p>
                            <p className="text-[8px] text-gray-500">{preset.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Animation controls */}
            <div className="flex items-center gap-2">
                <button
                    onClick={isAnimating ? stopAnimation : startAnimation}
                    className={`flex flex-1 items-center justify-center gap-1 rounded py-2 text-[10px] font-medium transition-all ${isAnimating
                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                        : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                        }`}
                >
                    {isAnimating ? (
                        <>
                            <Pause className="h-3 w-3" /> Stop
                        </>
                    ) : (
                        <>
                            <Play className="h-3 w-3" /> Play {animationPreset.name}
                        </>
                    )}
                </button>
                <button
                    onClick={resetAnimation}
                    disabled={isAnimating}
                    className="rounded bg-white/5 p-2 text-gray-400 transition-all hover:bg-white/10 disabled:opacity-50"
                >
                    <RotateCcw className="h-3 w-3" />
                </button>
            </div>

            {/* Animation progress */}
            {isAnimating && (
                <div className="h-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                        className="h-full bg-purple-500"
                        style={{ width: `${animationProgress * 100}%` }}
                    />
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-2">
                <div className="text-center">
                    <p className="text-[8px] text-gray-500">Distance</p>
                    <p className="text-[10px] font-medium text-white">{distanceM.toFixed(2)}m</p>
                </div>
                <div className="text-center">
                    <p className="text-[8px] text-gray-500">Subject</p>
                    <p className="text-[10px] font-medium text-white">
                        {(subjectFrameSize * 100).toFixed(0)}%
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-[8px] text-gray-500">Compression</p>
                    <p className="text-[10px] font-medium text-white">
                        {dollyZoomPreview.backgroundScale > 1 ? '+' : ''}
                        {((dollyZoomPreview.backgroundScale - 1) * 100).toFixed(0)}%
                    </p>
                </div>
            </div>
        </div>
    );
}

export default DollyZoomSimulator;
