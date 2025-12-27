'use client';

/**
 * Acoustic Studio Panel
 *
 * The main UI for the Acoustic Mapping system. This panel allows users to:
 * - See real-time acoustic parameters synced to their lens selection
 * - Toggle "Sync to Lens" on/off for manual control
 * - Adjust Atmosphere vs Action balance (Environment vs Foley)
 * - View the dynamic waveform visualization
 *
 * Designed to integrate with Shot Navigator and the Generate page.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AudioWaveform,
    Mic2,
    Volume2,
    Link2,
    Unlink2,
    Music,
    Wind,
    Footprints,
    Settings2,
    X,
    ChevronDown,
    Sparkles,
    RefreshCw,
} from 'lucide-react';
import { clsx } from 'clsx';
import { AcousticWaveform } from './AcousticWaveform';

// ============================================================================
// TYPES
// ============================================================================

export interface AcousticSettings {
    /** Reverb level (0 = dry, 1 = wet) */
    reverbLevel: number;
    /** Stereo width (0 = mono, 1 = wide) */
    stereoWidth: number;
    /** Foley detail level (0 = distant, 1 = close-mic) */
    foleyDetail: number;
    /** Atmosphere vs Action balance (0 = all atmosphere, 1 = all action) */
    atmosphereActionBalance: number;
    /** Whether settings are synced to lens */
    syncToLens: boolean;
}

export interface AcousticStudioPanelProps {
    /** Current focal length from Lens Kit */
    focalLength: number;
    /** Whether the panel is open */
    isOpen: boolean;
    /** Close handler */
    onClose: () => void;
    /** Settings change handler */
    onSettingsChange?: (settings: AcousticSettings) => void;
    /** Current settings (if controlled) */
    settings?: AcousticSettings;
    /** Embedded mode (side panel) */
    embedded?: boolean;
    /** Genre for IR recommendations */
    genre?: string;
}

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

const DEFAULT_SETTINGS: AcousticSettings = {
    reverbLevel: 0.5,
    stereoWidth: 0.6,
    foleyDetail: 0.5,
    atmosphereActionBalance: 0.5,
    syncToLens: true,
};

// ============================================================================
// LENS ACOUSTIC PRESETS (Mirror of backend)
// ============================================================================

interface LensAcousticPreset {
    range: [number, number];
    reverb: number;
    stereoWidth: number;
    foleyDetail: number;
    description: string;
}

const LENS_PRESETS: LensAcousticPreset[] = [
    { range: [14, 24], reverb: 0.85, stereoWidth: 1.0, foleyDetail: 0.2, description: 'Environment' },
    { range: [24, 35], reverb: 0.65, stereoWidth: 0.8, foleyDetail: 0.4, description: 'Wide Natural' },
    { range: [35, 50], reverb: 0.45, stereoWidth: 0.6, foleyDetail: 0.65, description: 'Dialogue' },
    { range: [50, 85], reverb: 0.35, stereoWidth: 0.45, foleyDetail: 0.75, description: 'Focused' },
    { range: [85, 135], reverb: 0.15, stereoWidth: 0.25, foleyDetail: 0.9, description: 'Intimate' },
    { range: [135, 500], reverb: 0.05, stereoWidth: 0.1, foleyDetail: 1.0, description: 'Isolated' },
];

function getLensPreset(focalLength: number): LensAcousticPreset {
    for (const preset of LENS_PRESETS) {
        if (focalLength >= preset.range[0] && focalLength < preset.range[1]) {
            return preset;
        }
    }
    return LENS_PRESETS[LENS_PRESETS.length - 1];
}

// ============================================================================
// GENRE IR RECOMMENDATIONS
// ============================================================================

const GENRE_IR_OPTIONS = [
    { id: 'metallic_hall', genre: 'sci-fi', label: 'Metallic Hall', description: 'Cold, spaceship corridors' },
    { id: 'canyon', genre: 'western', label: 'Open Canyon', description: 'Vast desert echo' },
    { id: 'basement', genre: 'horror', label: 'Dark Basement', description: 'Claustrophobic, damp' },
    { id: 'cathedral', genre: 'fantasy', label: 'Cathedral', description: 'Majestic, ancient' },
    { id: 'jazz_club', genre: 'noir', label: 'Jazz Club', description: 'Smoky, intimate' },
    { id: 'living_room', genre: 'romance', label: 'Living Room', description: 'Warm, cozy' },
    { id: 'stadium', genre: 'action', label: 'Stadium', description: 'Massive, impactful' },
];

// ============================================================================
// SLIDER COMPONENT
// ============================================================================

interface SliderProps {
    label: string;
    icon: React.ReactNode;
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
    leftLabel?: string;
    rightLabel?: string;
    color?: 'blue' | 'purple' | 'cyan' | 'amber';
}

function Slider({
    label,
    icon,
    value,
    onChange,
    disabled,
    leftLabel,
    rightLabel,
    color = 'cyan',
}: SliderProps) {
    const colorClasses = {
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
        cyan: 'bg-cyan-500',
        amber: 'bg-amber-500',
    };

    return (
        <div className={clsx('space-y-2', disabled && 'opacity-50')}>
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-zinc-500">
                    {icon}
                    {label}
                </label>
                <span className="font-mono text-xs text-zinc-400">{Math.round(value * 100)}%</span>
            </div>

            {/* Custom slider */}
            <div className="relative">
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={value * 100}
                    onChange={e => onChange(parseInt(e.target.value) / 100)}
                    disabled={disabled}
                    className={clsx(
                        'h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-800',
                        'focus:outline-none focus:ring-2 focus:ring-cyan-500/30',
                        '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
                        '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
                        '[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg',
                        '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110',
                        disabled && 'cursor-not-allowed'
                    )}
                    style={{
                        background: `linear-gradient(to right, ${
                            color === 'blue'
                                ? '#3b82f6'
                                : color === 'purple'
                                  ? '#a855f7'
                                  : color === 'amber'
                                    ? '#f59e0b'
                                    : '#06b6d4'
                        } ${value * 100}%, #27272a ${value * 100}%)`,
                    }}
                />
            </div>

            {/* Labels */}
            {(leftLabel || rightLabel) && (
                <div className="flex justify-between text-[9px] text-zinc-600">
                    <span>{leftLabel}</span>
                    <span>{rightLabel}</span>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AcousticStudioPanel({
    focalLength,
    isOpen,
    onClose,
    onSettingsChange,
    settings: externalSettings,
    embedded = false,
    genre,
}: AcousticStudioPanelProps) {
    // Local state (fallback if not controlled)
    const [localSettings, setLocalSettings] = useState<AcousticSettings>(DEFAULT_SETTINGS);
    const settings = externalSettings || localSettings;

    const [selectedIR, setSelectedIR] = useState<string | null>(null);
    const [showIRDropdown, setShowIRDropdown] = useState(false);

    // Get lens-synced values
    const lensPreset = useMemo(() => getLensPreset(focalLength), [focalLength]);

    // Update settings
    const updateSettings = useCallback(
        (updates: Partial<AcousticSettings>) => {
            const newSettings = { ...settings, ...updates };
            if (onSettingsChange) {
                onSettingsChange(newSettings);
            } else {
                setLocalSettings(newSettings);
            }
        },
        [settings, onSettingsChange]
    );

    // Sync to lens values
    const syncToLens = useCallback(() => {
        updateSettings({
            reverbLevel: lensPreset.reverb,
            stereoWidth: lensPreset.stereoWidth,
            foleyDetail: lensPreset.foleyDetail,
            syncToLens: true,
        });
    }, [lensPreset, updateSettings]);

    // Auto-sync when lens changes and sync is enabled
    React.useEffect(() => {
        if (settings.syncToLens) {
            updateSettings({
                reverbLevel: lensPreset.reverb,
                stereoWidth: lensPreset.stereoWidth,
                foleyDetail: lensPreset.foleyDetail,
            });
        }
    }, [focalLength, settings.syncToLens]);

    // Panel content
    const content = (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-4">
                <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-2">
                        <Music className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Acoustic Studio</h2>
                        <p className="text-[10px] text-zinc-500">Perspective-Matched Audio</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Sync Status Banner */}
            <div
                className={clsx(
                    'flex items-center justify-between border-b px-4 py-2',
                    settings.syncToLens
                        ? 'border-cyan-500/20 bg-cyan-500/10'
                        : 'border-amber-500/20 bg-amber-500/10'
                )}
            >
                <div className="flex items-center gap-2">
                    {settings.syncToLens ? (
                        <Link2 className="h-4 w-4 text-cyan-400" />
                    ) : (
                        <Unlink2 className="h-4 w-4 text-amber-400" />
                    )}
                    <span
                        className={clsx(
                            'text-xs font-medium',
                            settings.syncToLens ? 'text-cyan-400' : 'text-amber-400'
                        )}
                    >
                        {settings.syncToLens
                            ? `Synced to ${focalLength}mm Lens`
                            : 'Manual Mode - Lens Sync Off'}
                    </span>
                </div>

                <button
                    onClick={() => updateSettings({ syncToLens: !settings.syncToLens })}
                    className={clsx(
                        'rounded-lg px-3 py-1 text-xs font-medium transition-all',
                        settings.syncToLens
                            ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                            : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                    )}
                >
                    {settings.syncToLens ? 'Unlock' : 'Sync to Lens'}
                </button>
            </div>

            {/* Waveform Visualizer */}
            <div className="border-b border-white/10 p-4">
                <AcousticWaveform
                    focalLength={focalLength}
                    isSyncing={settings.syncToLens}
                    showControls={false}
                    size="full"
                />
            </div>

            {/* Main Controls */}
            <div className="flex-1 space-y-6 overflow-y-auto p-4">
                {/* Reverb & Width */}
                <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-400">
                        <Volume2 className="h-4 w-4" />
                        Spatial Acoustics
                    </h3>

                    <Slider
                        label="Reverb Wash"
                        icon={<Wind className="h-3 w-3" />}
                        value={settings.reverbLevel}
                        onChange={v => updateSettings({ reverbLevel: v, syncToLens: false })}
                        disabled={settings.syncToLens}
                        leftLabel="Dry"
                        rightLabel="Wet"
                        color="blue"
                    />

                    <Slider
                        label="Stereo Width"
                        icon={<AudioWaveform className="h-3 w-3" />}
                        value={settings.stereoWidth}
                        onChange={v => updateSettings({ stereoWidth: v, syncToLens: false })}
                        disabled={settings.syncToLens}
                        leftLabel="Mono"
                        rightLabel="Wide"
                        color="cyan"
                    />
                </div>

                {/* Foley Detail */}
                <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-400">
                        <Mic2 className="h-4 w-4" />
                        Proximity Detail
                    </h3>

                    <Slider
                        label="Foley Snap"
                        icon={<Footprints className="h-3 w-3" />}
                        value={settings.foleyDetail}
                        onChange={v => updateSettings({ foleyDetail: v, syncToLens: false })}
                        disabled={settings.syncToLens}
                        leftLabel="Distant"
                        rightLabel="Close-Mic"
                        color="purple"
                    />
                </div>

                {/* Atmosphere vs Action Balance */}
                <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-400">
                        <Settings2 className="h-4 w-4" />
                        Layer Mix
                    </h3>

                    <Slider
                        label="Atmospheric Bias"
                        icon={<Sparkles className="h-3 w-3" />}
                        value={settings.atmosphereActionBalance}
                        onChange={v => updateSettings({ atmosphereActionBalance: v })}
                        leftLabel="Environment"
                        rightLabel="Action"
                        color="amber"
                    />

                    <p className="text-[10px] text-zinc-600">
                        Balance between ambient sounds (wind, room tone) and action foley (footsteps,
                        impacts).
                    </p>
                </div>

                {/* Genre IR Selector */}
                <div className="space-y-3">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-400">
                        <RefreshCw className="h-4 w-4" />
                        Impulse Response (Genre)
                    </h3>

                    <div className="relative">
                        <button
                            onClick={() => setShowIRDropdown(!showIRDropdown)}
                            className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-left transition-colors hover:bg-zinc-700"
                        >
                            <span className="text-sm text-white">
                                {selectedIR
                                    ? GENRE_IR_OPTIONS.find(ir => ir.id === selectedIR)?.label
                                    : 'Select Reverb Space...'}
                            </span>
                            <ChevronDown
                                className={clsx(
                                    'h-4 w-4 text-zinc-400 transition-transform',
                                    showIRDropdown && 'rotate-180'
                                )}
                            />
                        </button>

                        <AnimatePresence>
                            {showIRDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-white/10 bg-zinc-800 shadow-xl"
                                >
                                    {GENRE_IR_OPTIONS.map(ir => (
                                        <button
                                            key={ir.id}
                                            onClick={() => {
                                                setSelectedIR(ir.id);
                                                setShowIRDropdown(false);
                                            }}
                                            className={clsx(
                                                'flex w-full flex-col px-3 py-2 text-left transition-colors',
                                                selectedIR === ir.id
                                                    ? 'bg-cyan-500/20'
                                                    : 'hover:bg-white/5'
                                            )}
                                        >
                                            <span className="text-sm text-white">{ir.label}</span>
                                            <span className="text-[10px] text-zinc-500">
                                                {ir.description}
                                            </span>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Footer - Current Profile */}
            <div className="border-t border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase text-zinc-500">
                            Acoustic Profile
                        </span>
                        <p className="font-mono text-sm text-white">{lensPreset.description}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-bold uppercase text-zinc-500">Focal</span>
                        <p className="font-mono text-sm text-cyan-400">{focalLength}mm</p>
                    </div>
                </div>
            </div>
        </div>
    );

    // Embedded mode (side panel)
    if (embedded) {
        return (
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="h-[90vh] w-[380px] overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
                    >
                        {content}
                    </motion.div>
                )}
            </AnimatePresence>
        );
    }

    // Modal mode
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="max-h-[85vh] w-[420px] overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
                    >
                        {content}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default AcousticStudioPanel;
