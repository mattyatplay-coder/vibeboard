'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Aperture, ChevronDown, Info, Sparkles, X, Star, Filter, Settings2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Tooltip } from '@/components/ui/Tooltip';

// ============================================================================
// TYPE DEFINITIONS (matching backend CameraDatabase.ts)
// ============================================================================

interface SensorSpec {
    width_mm: number;
    height_mm: number;
    diagonal_mm: number;
    crop_factor_ff: number;
    coc_mm: number;
}

interface CameraSpec {
    id: string;
    brand: string;
    model: string;
    category: 'cinema' | 'mirrorless' | 'dslr' | 'phone' | 'action' | 'medium_format';
    sensor_spec: SensorSpec;
    resolution: string;
    base_iso: number;
    log_color_space: string;
    prompt_keywords: string[];
    aspect_ratios: string[];
}

interface LensSpec {
    id: string;
    brand: string;
    model: string;
    family: string;
    focal_length_mm: number;
    min_t_stop: number;
    max_t_stop: number;
    is_anamorphic: boolean;
    squeeze_factor?: number;
    prompt_keywords: string[];
    flare_color?: string;
}

interface LensFamily {
    id: string;
    brand: string;
    name: string;
    type: 'prime' | 'zoom' | 'anamorphic' | 'vintage' | 'specialty';
    is_anamorphic: boolean;
    squeeze_factor?: number;
    flare_color?: string;
    focal_lengths: number[];
    min_t_stop: number;
}

interface CameraPreset {
    id: string;
    name: string;
    description: string;
    cameraId: string;
    lensId: string | null;
    style: string;
    modifier: string;
    camera: CameraSpec | null;
    lens: LensSpec | null;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface CameraLensSelectorProps {
    selectedCamera: CameraSpec | null;
    selectedLens: LensSpec | null;
    onCameraChange: (camera: CameraSpec | null) => void;
    onLensChange: (lens: LensSpec | null) => void;
    onModifierChange?: (modifier: string) => void;
    onClose?: () => void;
    embedded?: boolean;
}

// Category colors for visual organization
const CAMERA_CATEGORY_COLORS: Record<string, string> = {
    cinema: 'border-red-500/50 bg-red-500/20 text-red-300',
    mirrorless: 'border-blue-500/50 bg-blue-500/20 text-blue-300',
    dslr: 'border-amber-500/50 bg-amber-500/20 text-amber-300',
    phone: 'border-green-500/50 bg-green-500/20 text-green-300',
    action: 'border-purple-500/50 bg-purple-500/20 text-purple-300',
    medium_format: 'border-pink-500/50 bg-pink-500/20 text-pink-300',
};

const LENS_TYPE_COLORS: Record<string, string> = {
    prime: 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300',
    zoom: 'border-orange-500/50 bg-orange-500/20 text-orange-300',
    anamorphic: 'border-blue-500/50 bg-blue-500/20 text-blue-300',
    vintage: 'border-amber-500/50 bg-amber-500/20 text-amber-300',
    specialty: 'border-purple-500/50 bg-purple-500/20 text-purple-300',
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export function CameraLensSelector({
    selectedCamera,
    selectedLens,
    onCameraChange,
    onLensChange,
    onModifierChange,
    onClose,
    embedded = false,
}: CameraLensSelectorProps) {
    // ========================================================================
    // STATE
    // ========================================================================
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'camera' | 'lens' | 'presets'>('presets');
    const [cameras, setCameras] = useState<CameraSpec[]>([]);
    const [lensFamilies, setLensFamilies] = useState<LensFamily[]>([]);
    const [lenses, setLenses] = useState<LensSpec[]>([]);
    const [presets, setPresets] = useState<CameraPreset[]>([]);
    const [loading, setLoading] = useState(false);
    const [cameraFilter, setCameraFilter] = useState<string>('all');
    const [lensFilter, setLensFilter] = useState<'all' | 'anamorphic' | 'spherical'>('all');
    const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
    const [modifier, setModifier] = useState<string>('');
    const [showInfo, setShowInfo] = useState<string | null>(null);

    // ========================================================================
    // DATA FETCHING
    // ========================================================================

    // Fetch cameras
    useEffect(() => {
        const fetchCameras = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/cameras`);
                const data = await res.json();
                if (data.success) {
                    setCameras(data.cameras);
                }
            } catch (err) {
                console.error('Failed to fetch cameras:', err);
            }
        };
        fetchCameras();
    }, []);

    // Fetch lens families
    useEffect(() => {
        const fetchLensFamilies = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/cameras/lenses/families`);
                const data = await res.json();
                if (data.success) {
                    setLensFamilies(data.families);
                }
            } catch (err) {
                console.error('Failed to fetch lens families:', err);
            }
        };
        fetchLensFamilies();
    }, []);

    // Fetch lenses based on filter
    useEffect(() => {
        const fetchLenses = async () => {
            setLoading(true);
            try {
                let url = `${BACKEND_URL}/api/cameras/lenses`;
                const params = new URLSearchParams();
                if (lensFilter !== 'all') {
                    params.set('anamorphic', lensFilter === 'anamorphic' ? 'true' : 'false');
                }
                if (selectedFamily) {
                    params.set('family', selectedFamily);
                }
                if (params.toString()) {
                    url += `?${params.toString()}`;
                }

                const res = await fetch(url);
                const data = await res.json();
                if (data.success) {
                    setLenses(data.lenses);
                }
            } catch (err) {
                console.error('Failed to fetch lenses:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLenses();
    }, [lensFilter, selectedFamily]);

    // Fetch presets
    useEffect(() => {
        const fetchPresets = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/cameras/presets`);
                const data = await res.json();
                if (data.success) {
                    setPresets(data.presets);
                }
            } catch (err) {
                console.error('Failed to fetch presets:', err);
            }
        };
        fetchPresets();
    }, []);

    // Build cinematic modifier when selections change
    useEffect(() => {
        const buildModifier = async () => {
            if (!selectedCamera && !selectedLens) {
                setModifier('');
                onModifierChange?.('');
                return;
            }

            try {
                const res = await fetch(`${BACKEND_URL}/api/cameras/cinematic-modifier`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        cameraId: selectedCamera?.id,
                        lensId: selectedLens?.id,
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    setModifier(data.modifier);
                    onModifierChange?.(data.modifier);
                }
            } catch (err) {
                console.error('Failed to build modifier:', err);
            }
        };
        buildModifier();
    }, [selectedCamera, selectedLens, onModifierChange]);

    // ========================================================================
    // FILTERED DATA
    // ========================================================================

    const filteredCameras = useMemo(() => {
        if (cameraFilter === 'all') return cameras;
        return cameras.filter(c => c.category === cameraFilter);
    }, [cameras, cameraFilter]);

    const camerasByBrand = useMemo(() => {
        const grouped: Record<string, CameraSpec[]> = {};
        filteredCameras.forEach(camera => {
            if (!grouped[camera.brand]) grouped[camera.brand] = [];
            grouped[camera.brand].push(camera);
        });
        return grouped;
    }, [filteredCameras]);

    const filteredLensFamilies = useMemo(() => {
        if (lensFilter === 'all') return lensFamilies;
        return lensFamilies.filter(f => {
            if (lensFilter === 'anamorphic') return f.is_anamorphic;
            return !f.is_anamorphic;
        });
    }, [lensFamilies, lensFilter]);

    // ========================================================================
    // HANDLERS
    // ========================================================================

    const handlePresetSelect = useCallback((preset: CameraPreset) => {
        if (preset.camera) onCameraChange(preset.camera);
        if (preset.lens) onLensChange(preset.lens);
        setModifier(preset.modifier);
        onModifierChange?.(preset.modifier);
    }, [onCameraChange, onLensChange, onModifierChange]);

    const handleFamilySelect = useCallback((familyId: string) => {
        setSelectedFamily(selectedFamily === familyId ? null : familyId);
    }, [selectedFamily]);

    // ========================================================================
    // COMPACT BUTTON (when closed)
    // ========================================================================

    if (!isOpen && !embedded) {
        return (
            <Tooltip content="Camera & Lens - Professional Optics" side="top">
                <button
                    onClick={() => setIsOpen(true)}
                    className={clsx(
                        'flex h-10 items-center gap-2 rounded-xl border px-3 transition-all hover:scale-105',
                        selectedCamera || selectedLens
                            ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                            : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                    )}
                >
                    <Camera className="h-4 w-4" />
                    <span className="text-xs font-medium">
                        {selectedCamera ? `${selectedCamera.brand} ${selectedCamera.model}` : 'Camera'}
                    </span>
                    {selectedLens && (
                        <span className="rounded-full bg-cyan-500/30 px-1.5 py-0.5 text-[10px]">
                            {selectedLens.focal_length_mm}mm
                        </span>
                    )}
                    {selectedLens?.is_anamorphic && (
                        <span className="rounded-full bg-blue-500/30 px-1.5 py-0.5 text-[10px] text-blue-300">
                            ANAMORPHIC
                        </span>
                    )}
                </button>
            </Tooltip>
        );
    }

    // ========================================================================
    // PANEL CONTENT
    // ========================================================================

    const panelContent = (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-4">
                <div className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-cyan-400" />
                    <h2 className="text-lg font-bold text-white">Camera & Lens</h2>
                </div>
                {(!embedded || onClose) && (
                    <button
                        onClick={() => onClose ? onClose() : setIsOpen(false)}
                        className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                    >
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                )}
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-white/10">
                {(['presets', 'camera', 'lens'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={clsx(
                            'flex-1 px-4 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors',
                            activeTab === tab
                                ? 'border-b-2 border-cyan-400 text-cyan-400'
                                : 'text-gray-500 hover:text-gray-300'
                        )}
                    >
                        {tab === 'presets' && <Star className="mr-1 inline h-3 w-3" />}
                        {tab === 'camera' && <Camera className="mr-1 inline h-3 w-3" />}
                        {tab === 'lens' && <Aperture className="mr-1 inline h-3 w-3" />}
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                    {/* PRESETS TAB */}
                    {activeTab === 'presets' && (
                        <motion.div
                            key="presets"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-2 p-4"
                        >
                            <p className="mb-4 text-xs text-gray-500">
                                Curated camera + lens combinations for specific looks
                            </p>
                            {presets.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => handlePresetSelect(preset)}
                                    className={clsx(
                                        'w-full rounded-lg border p-3 text-left transition-all',
                                        selectedCamera?.id === preset.cameraId && selectedLens?.id === preset.lensId
                                            ? 'border-cyan-500/50 bg-cyan-500/20'
                                            : 'border-white/10 bg-white/5 hover:border-white/20'
                                    )}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-white">{preset.name}</span>
                                                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-gray-400">
                                                    {preset.style}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-[11px] text-gray-400">{preset.description}</p>
                                        </div>
                                    </div>
                                    {/* Preview of what will be added */}
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {preset.modifier.split(', ').slice(0, 4).map((kw, i) => (
                                            <span key={i} className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-gray-500">
                                                {kw}
                                            </span>
                                        ))}
                                        {preset.modifier.split(', ').length > 4 && (
                                            <span className="text-[9px] text-gray-600">+more</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </motion.div>
                    )}

                    {/* CAMERA TAB */}
                    {activeTab === 'camera' && (
                        <motion.div
                            key="camera"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="p-4"
                        >
                            {/* Filter Bar */}
                            <div className="mb-4 flex flex-wrap gap-1.5">
                                {['all', 'cinema', 'mirrorless', 'phone', 'action'].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setCameraFilter(cat)}
                                        className={clsx(
                                            'rounded-full px-2.5 py-1 text-[10px] font-medium uppercase transition-colors',
                                            cameraFilter === cat
                                                ? 'bg-cyan-500/20 text-cyan-400'
                                                : 'bg-white/5 text-gray-500 hover:bg-white/10'
                                        )}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {/* Camera List by Brand */}
                            <div className="space-y-4">
                                {Object.entries(camerasByBrand).map(([brand, brandCameras]) => (
                                    <div key={brand}>
                                        <div className="mb-2 text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                                            {brand}
                                        </div>
                                        <div className="space-y-1.5">
                                            {brandCameras.map(camera => (
                                                <button
                                                    key={camera.id}
                                                    onClick={() => onCameraChange(selectedCamera?.id === camera.id ? null : camera)}
                                                    className={clsx(
                                                        'w-full rounded-lg border p-2.5 text-left transition-all',
                                                        selectedCamera?.id === camera.id
                                                            ? 'border-cyan-500/50 bg-cyan-500/20'
                                                            : 'border-white/10 bg-white/5 hover:border-white/20'
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-medium text-white">{camera.model}</span>
                                                        <span className={clsx('rounded border px-1.5 py-0.5 text-[9px]', CAMERA_CATEGORY_COLORS[camera.category])}>
                                                            {camera.category}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 flex gap-3 text-[10px] text-gray-500">
                                                        <span>{camera.resolution}</span>
                                                        <span>ISO {camera.base_iso}</span>
                                                        <span>{camera.log_color_space}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* LENS TAB */}
                    {activeTab === 'lens' && (
                        <motion.div
                            key="lens"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="p-4"
                        >
                            {/* Filter Bar */}
                            <div className="mb-4 flex gap-2">
                                <button
                                    onClick={() => setLensFilter('all')}
                                    className={clsx(
                                        'rounded-full px-3 py-1 text-[10px] font-medium transition-colors',
                                        lensFilter === 'all'
                                            ? 'bg-cyan-500/20 text-cyan-400'
                                            : 'bg-white/5 text-gray-500 hover:bg-white/10'
                                    )}
                                >
                                    All Lenses
                                </button>
                                <button
                                    onClick={() => setLensFilter('spherical')}
                                    className={clsx(
                                        'rounded-full px-3 py-1 text-[10px] font-medium transition-colors',
                                        lensFilter === 'spherical'
                                            ? 'bg-cyan-500/20 text-cyan-400'
                                            : 'bg-white/5 text-gray-500 hover:bg-white/10'
                                    )}
                                >
                                    Spherical
                                </button>
                                <button
                                    onClick={() => setLensFilter('anamorphic')}
                                    className={clsx(
                                        'rounded-full px-3 py-1 text-[10px] font-medium transition-colors',
                                        lensFilter === 'anamorphic'
                                            ? 'bg-blue-500/20 text-blue-400'
                                            : 'bg-white/5 text-gray-500 hover:bg-white/10'
                                    )}
                                >
                                    Anamorphic
                                </button>
                            </div>

                            {/* Lens Families */}
                            <div className="mb-4">
                                <div className="mb-2 text-[10px] tracking-wider text-gray-500 uppercase">
                                    Lens Families
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {filteredLensFamilies.map(family => (
                                        <button
                                            key={family.id}
                                            onClick={() => handleFamilySelect(family.id)}
                                            className={clsx(
                                                'rounded-lg border px-2 py-1 text-[10px] transition-all',
                                                selectedFamily === family.id
                                                    ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-400'
                                                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                                            )}
                                        >
                                            {family.brand} {family.name}
                                            {family.is_anamorphic && (
                                                <span className="ml-1 rounded bg-blue-500/30 px-1 text-[8px] text-blue-300">A</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Individual Lenses */}
                            <div className="space-y-1.5">
                                {loading ? (
                                    <div className="py-8 text-center text-sm text-gray-500">Loading lenses...</div>
                                ) : (
                                    lenses.slice(0, 50).map(lens => (
                                        <button
                                            key={lens.id}
                                            onClick={() => onLensChange(selectedLens?.id === lens.id ? null : lens)}
                                            className={clsx(
                                                'w-full rounded-lg border p-2.5 text-left transition-all',
                                                selectedLens?.id === lens.id
                                                    ? lens.is_anamorphic
                                                        ? 'border-blue-500/50 bg-blue-500/20'
                                                        : 'border-cyan-500/50 bg-cyan-500/20'
                                                    : 'border-white/10 bg-white/5 hover:border-white/20'
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-xs font-medium text-white">
                                                        {lens.brand} {lens.model}
                                                    </span>
                                                    <span className="ml-2 font-mono text-xs text-cyan-400">
                                                        {lens.focal_length_mm}mm
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-500">
                                                        T{lens.min_t_stop.toFixed(1)}
                                                    </span>
                                                    {lens.is_anamorphic && (
                                                        <span className="rounded bg-blue-500/30 px-1.5 py-0.5 text-[9px] text-blue-300">
                                                            {lens.squeeze_factor}x
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {lens.is_anamorphic && lens.flare_color && (
                                                <div className="mt-1 text-[10px] text-blue-400/80">
                                                    {lens.flare_color} streak flares • Oval bokeh
                                                </div>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer - Active Modifier Preview */}
            {(selectedCamera || selectedLens) && (
                <div className="border-t border-white/10 bg-black/30 p-3">
                    <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">CINEMATIC MODIFIER:</span>
                        <button
                            onClick={() => {
                                onCameraChange(null);
                                onLensChange(null);
                            }}
                            className="text-[10px] text-gray-500 hover:text-white"
                        >
                            Clear
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {modifier.split(', ').slice(0, 6).map((kw, i) => (
                            <span
                                key={i}
                                className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] text-cyan-300"
                            >
                                {kw}
                            </span>
                        ))}
                        {modifier.split(', ').length > 6 && (
                            <span className="text-[9px] text-gray-500">+{modifier.split(', ').length - 6} more</span>
                        )}
                    </div>
                    {/* DOF Info for selected camera */}
                    {selectedCamera && (
                        <div className="mt-2 flex items-center gap-2 text-[9px] text-gray-500">
                            <span>Sensor: {selectedCamera.sensor_spec.width_mm.toFixed(1)}×{selectedCamera.sensor_spec.height_mm.toFixed(1)}mm</span>
                            <span>CoC: {selectedCamera.sensor_spec.coc_mm}mm</span>
                            <span>Crop: {selectedCamera.sensor_spec.crop_factor_ff.toFixed(2)}×</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    // ========================================================================
    // RENDER
    // ========================================================================

    if (embedded) {
        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-[90vh] w-[420px] overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
            >
                {panelContent}
            </motion.div>
        );
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="max-h-[85vh] w-[480px] overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {panelContent}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

// ============================================================================
// COMPACT VARIANT FOR TOOLBAR
// ============================================================================

export function CameraLensCompact({
    selectedCamera,
    selectedLens,
    onOpenFullSelector,
}: {
    selectedCamera: CameraSpec | null;
    selectedLens: LensSpec | null;
    onOpenFullSelector: () => void;
}) {
    return (
        <Tooltip content="Camera & Lens - Professional Optics" side="top">
            <button
                onClick={onOpenFullSelector}
                className={clsx(
                    'flex h-10 items-center gap-2 rounded-xl border px-3 transition-all hover:scale-105',
                    selectedCamera || selectedLens
                        ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                )}
            >
                <Camera className="h-4 w-4" />
                <span className="max-w-[100px] truncate text-xs font-medium">
                    {selectedCamera ? selectedCamera.brand : selectedLens ? selectedLens.brand : 'Camera'}
                </span>
                {selectedLens && (
                    <span className="rounded-full bg-cyan-500/30 px-1.5 py-0.5 text-[10px]">
                        {selectedLens.focal_length_mm}mm
                    </span>
                )}
                {selectedLens?.is_anamorphic && (
                    <span className="rounded-full bg-blue-500/30 px-1 py-0.5 text-[9px] text-blue-300">A</span>
                )}
                <ChevronDown className="h-3 w-3" />
            </button>
        </Tooltip>
    );
}

export default CameraLensSelector;
