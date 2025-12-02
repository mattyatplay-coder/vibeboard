"use client";

import { useState, useRef, useEffect } from "react";
import { X, Upload, Check, ChevronRight, Search, Ratio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

import { useDropzone } from "react-dropzone";
import { ParameterManager } from "../generations/ParameterManager";

export interface StyleConfig {
    preset: any;
    referenceImage: string | File | null;
    inspiration: string;
    aspectRatio: string;
    camera?: {
        type?: string;
        angle?: string;
    };
    lighting?: {
        type?: string;
    };
    location?: {
        type?: string;
    };
    strength?: number;
    loras?: { id: string; name: string; strength: number }[];
    sampler?: { id: string; name: string; value: string };
    scheduler?: { id: string; name: string; value: string };
    guidanceScale?: number;
    steps?: number;
    negativePrompt?: string;
}

interface StyleSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (config: StyleConfig) => void;
    initialAspectRatio?: string;
    projectId: string;
}

const STYLE_PRESETS = [
    {
        id: "film_noir",
        name: "Film Noir",
        image: "/presets/film_noir.png",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        promptSuffix: ", high contrast black and white, dramatic shadows, dutch angle, 1940s film grain, mystery, crime thriller atmosphere"
    },
    {
        id: "cinematic",
        name: "Cinematic",
        image: "/presets/cinematic.png",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        promptSuffix: ", cinematic lighting, shallow depth of field, anamorphic lens, color graded, 8k resolution, highly detailed"
    },
    {
        id: "vintage",
        name: "Vintage",
        image: "/presets/vintage.png",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        promptSuffix: ", vintage 1970s aesthetic, film grain, faded colors, retro fashion, polaroid style, nostalgic"
    },
    {
        id: "anime",
        name: "Anime",
        image: "/presets/anime.png",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        promptSuffix: ", anime style, cel shaded, vibrant colors, expressive characters, studio ghibli inspired, detailed background"
    },
    {
        id: "3d_cartoon",
        name: "3D Cartoon",
        image: "/presets/3d_cartoon.png",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        promptSuffix: ", 3d render, pixar style, cute, soft lighting, ambient occlusion, clay material, character design"
    },
    {
        id: "colored",
        name: "Colored",
        image: "/presets/colored.png",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        promptSuffix: ", vibrant color palette, saturated, neon lights, colorful, rainbow, psychedelic, vivid"
    },
    {
        id: "dreamy",
        name: "Dreamy",
        image: "/presets/dreamy.png",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
        promptSuffix: ", dreamy atmosphere, soft focus, pastel colors, ethereal, fantasy, magical, glowing"
    },
    {
        id: "hand_drawn",
        name: "Hand Drawn",
        image: "https://picsum.photos/seed/hand/200",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        promptSuffix: ", hand drawn, pencil sketch, charcoal, rough lines, artistic, illustration, sketchbook style"
    },
    {
        id: "2d_novel",
        name: "2D Novel",
        image: "https://picsum.photos/seed/novel/200",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        promptSuffix: ", visual novel style, 2d character art, clean lines, flat colors, anime portrait, dialogue scene"
    },
    {
        id: "scribble",
        name: "Scribble",
        image: "https://picsum.photos/seed/scribble/200",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        promptSuffix: ", scribble art, messy lines, doodle style, marker pen, childish, abstract, chaotic"
    },
    {
        id: "storyboard",
        name: "Storyboard",
        image: "https://picsum.photos/seed/storyboard/200",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        promptSuffix: ", storyboard sketch, black and white, rough composition, arrows, camera movement indicators, pre-visualization"
    },
    {
        id: "low_key",
        name: "Low Key",
        image: "https://picsum.photos/seed/lowkey/200",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        promptSuffix: ", low key lighting, dark background, rim light, silhouette, moody, mystery, noir"
    },
    {
        id: "indie",
        name: "Indie",
        image: "https://picsum.photos/seed/indie/200",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        promptSuffix: ", indie movie aesthetic, a24 style, natural lighting, raw, emotional, handheld camera, mumblecore"
    },
    {
        id: "y2k",
        name: "Y2K",
        image: "https://picsum.photos/seed/y2k/200",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        promptSuffix: ", y2k aesthetic, year 2000, futuristic, chrome, glossy, matrix style, cyber, techno"
    },
    {
        id: "pop",
        name: "Pop",
        image: "https://picsum.photos/seed/pop/200",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
        promptSuffix: ", pop art, comic book style, halftones, bold outlines, roy lichtenstein, vibrant, retro"
    },
    {
        id: "grunge",
        name: "Grunge",
        image: "https://picsum.photos/seed/grunge/200",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        promptSuffix: ", grunge aesthetic, dirty, distressed, texture, 90s rock, dark, edgy, urban"
    },
    {
        id: "boost",
        name: "Boost",
        image: "https://picsum.photos/seed/boost/200",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        promptSuffix: ", high quality, 4k, detailed, sharp focus, masterpiece, trending on artstation, award winning"
    },
];

function PresetCard({ preset, isSelected, onClick }: { preset: any, isSelected: boolean, onClick: () => void }) {
    const [isHovered, setIsHovered] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (isHovered && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => { });
        } else if (!isHovered && videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    }, [isHovered]);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="group relative aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all"
        >
            {/* Placeholder for image */}
            <div className="w-full h-full bg-white/5 group-hover:bg-white/10 transition-colors">
                {isHovered ? (
                    <video
                        ref={videoRef}
                        src={preset.video}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                    />
                ) : (
                    <img src={preset.image} alt={preset.name} className="w-full h-full object-cover" />
                )}
            </div>

            <div className={clsx(
                "absolute inset-0 ring-2 ring-inset transition-all",
                isSelected ? "ring-blue-500 bg-blue-500/10" : "ring-transparent"
            )} />

            <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-medium text-gray-300 bg-black/60 py-0.5 backdrop-blur-sm">
                {preset.name}
            </span>
        </button>
    );
}



// ... imports

import { CreateStyleModal, CustomStyle, ADVANCED_OPTIONS } from "./CreateStyleModal";
import { LoRAManager } from "../loras/LoRAManager";
import { Plus, ChevronDown, Settings2 } from "lucide-react";

// ... existing imports

export function StyleSelectorModal({ isOpen, onClose, onApply, initialAspectRatio = "16:9", projectId }: StyleSelectorModalProps) {
    const [selectedPreset, setSelectedPreset] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [config, setConfig] = useState<StyleConfig>({
        preset: null,
        referenceImage: null,
        inspiration: "",
        aspectRatio: initialAspectRatio,
        strength: 80,
        loras: []
    });

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [customPresets, setCustomPresets] = useState<any[]>([]);

    // Popover state
    const [activePopover, setActivePopover] = useState<string | null>(null);

    const handleAddTag = (tag: string, category: string) => {
        const prefix = config.inspiration ? `${config.inspiration}, ` : "";
        let newTag = tag;

        // Add context to the tag based on category
        if (category === 'cameras') newTag = `shot on ${tag}`;
        else if (category === 'lenses') newTag = `${tag} lens`;
        else if (category === 'films') newTag = `${tag} film stock`;
        else if (category === 'colors') newTag = `${tag} color grading`;
        else if (category === 'lighting') newTag = `${tag} lighting`;
        else if (category === 'cameraMotions') newTag = `${tag} camera movement`;
        else if (category === 'moods') newTag = `${tag} mood`;

        setConfig({ ...config, inspiration: prefix + newTag });
        setActivePopover(null);
    };

    const handleApply = () => {
        onApply(config);
        onClose();
    };

    const handleCreateStyle = (style: CustomStyle) => {
        // Generate prompt suffix from tags
        const suffix = style.tags.length > 0 ? `, ${style.tags.join(", ")}` : "";

        const newPreset = {
            id: style.id,
            name: style.name,
            image: style.image,
            // For now, no video preview for custom styles, or reuse one
            video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            inspiration: style.tags.join(", "),
            promptSuffix: suffix
        };
        setCustomPresets([...customPresets, newPreset]);

        // Auto-select the new preset
        setConfig(prev => ({
            ...prev,
            preset: newPreset.id,
            inspiration: newPreset.inspiration,
            // promptSuffix: newPreset.promptSuffix // Removed promptSuffix from config
        }));
    };

    const allPresets = [...STYLE_PRESETS, ...customPresets];

    const onDrop = (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setConfig({ ...config, referenceImage: acceptedFiles[0] });
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': [],
            'video/*': []
        },
        maxFiles: 1
    });

    // Create preview URL
    const previewUrl = config.referenceImage
        ? (typeof config.referenceImage === 'string' ? config.referenceImage : URL.createObjectURL(config.referenceImage))
        : null;

    // Cleanup preview URL
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [config.referenceImage]);

    // LoRA & Parameter State
    const [activeManager, setActiveManager] = useState<'lora' | 'sampler' | 'scheduler' | null>(null);
    const [availableLoRAs, setAvailableLoRAs] = useState<any[]>([]);

    const handleToggleLoRA = (lora: any) => {
        const currentLoras = config.loras || [];
        const exists = currentLoras.find(l => l.id === lora.id);

        if (exists) {
            setConfig({
                ...config,
                loras: currentLoras.filter(l => l.id !== lora.id)
            });
        } else {
            setConfig({
                ...config,
                loras: [...currentLoras, { id: lora.id, name: lora.name, strength: lora.strength || 1.0 }]
            });
        }
    };

    const handleSelectSampler = (sampler: any) => {
        setConfig(prev => ({ ...prev, sampler: sampler || undefined }));
    };

    const handleSelectScheduler = (scheduler: any) => {
        setConfig(prev => ({ ...prev, scheduler: scheduler || undefined }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
                    <div className="flex gap-4 items-start max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full max-h-[85vh]"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                <h2 className="text-lg font-bold text-white">Style & Parameters</h2>
                                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                {/* LoRA Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-gray-400 tracking-wider">LORAS & MODELS</span>
                                        <button
                                            onClick={() => setActiveManager(activeManager === 'lora' ? null : 'lora')}
                                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                        >
                                            <Settings2 className="w-3 h-3" /> Manage
                                        </button>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                        <p className="text-xs text-gray-500 mb-2">Active LoRAs will be applied to generation.</p>

                                        {/* Selected LoRAs List */}
                                        {config.loras && config.loras.length > 0 && (
                                            <div className="space-y-2 mb-3">
                                                {config.loras.map(lora => (
                                                    <div key={lora.id} className="flex items-center justify-between bg-black/20 rounded px-2 py-1.5 border border-white/5">
                                                        <span className="text-xs text-gray-300">{lora.name}</span>
                                                        <button
                                                            onClick={() => handleToggleLoRA(lora)}
                                                            className="text-gray-500 hover:text-red-400"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setActiveManager(activeManager === 'lora' ? null : 'lora')}
                                            className={clsx(
                                                "w-full py-2 border border-dashed rounded-lg text-xs transition-colors",
                                                activeManager === 'lora'
                                                    ? "border-blue-500/50 text-blue-400 bg-blue-500/10"
                                                    : "border-white/20 text-gray-400 hover:text-white hover:bg-white/5"
                                            )}
                                        >
                                            {activeManager === 'lora' ? "Close Manager" : "+ Add / Manage LoRAs"}
                                        </button>
                                    </div>
                                </div>

                                {/* Sampler & Scheduler Section */}
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Sampler */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-gray-400 tracking-wider">SAMPLER</span>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                            <div className="text-xs text-white mb-2 truncate">
                                                {config.sampler ? config.sampler.name : "Default"}
                                            </div>
                                            <button
                                                onClick={() => setActiveManager(activeManager === 'sampler' ? null : 'sampler')}
                                                className={clsx(
                                                    "w-full py-1.5 border border-dashed rounded text-[10px] transition-colors",
                                                    activeManager === 'sampler'
                                                        ? "border-blue-500/50 text-blue-400 bg-blue-500/10"
                                                        : "border-white/20 text-gray-400 hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                {activeManager === 'sampler' ? "Close" : "Select"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Scheduler */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-gray-400 tracking-wider">SCHEDULER</span>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                            <div className="text-xs text-white mb-2 truncate">
                                                {config.scheduler ? config.scheduler.name : "Default"}
                                            </div>
                                            <button
                                                onClick={() => setActiveManager(activeManager === 'scheduler' ? null : 'scheduler')}
                                                className={clsx(
                                                    "w-full py-1.5 border border-dashed rounded text-[10px] transition-colors",
                                                    activeManager === 'scheduler'
                                                        ? "border-blue-500/50 text-blue-400 bg-blue-500/10"
                                                        : "border-white/20 text-gray-400 hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                {activeManager === 'scheduler' ? "Close" : "Select"}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Presets */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-gray-400 tracking-wider">PRESETS</span>
                                        <button className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                                            View all <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {allPresets.map((preset) => (
                                            <PresetCard
                                                key={preset.id}
                                                preset={preset}
                                                isSelected={config.preset === preset.id}
                                                onClick={() => {
                                                    setConfig({
                                                        ...config,
                                                        preset: preset.id,
                                                        // If it's a custom preset, populate inspiration
                                                        inspiration: preset.inspiration || config.inspiration,
                                                        // promptSuffix: preset.promptSuffix // Removed promptSuffix from config
                                                    });
                                                }}
                                            />
                                        ))}

                                        {/* New Preset Button */}
                                        <button
                                            onClick={() => setIsCreateModalOpen(true)}
                                            className="aspect-square rounded-lg border border-dashed border-white/20 hover:border-white/40 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-2 group"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors text-gray-400">
                                                <Plus className="w-4 h-4" />
                                            </div>
                                            <span className="text-[10px] font-medium text-gray-400 group-hover:text-white">New Preset</span>
                                        </button>
                                    </div>
                                </div>

                                {/* ... rest of content ... */}

                                {/* Style Reference */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-gray-400 tracking-wider">STYLE REFERENCE</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <div
                                            {...getRootProps()}
                                            className={clsx(
                                                "w-24 h-24 flex-shrink-0 border border-dashed rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer relative overflow-hidden",
                                                isDragActive ? "border-blue-500 bg-blue-500/10" : "border-white/20 bg-white/5 hover:bg-white/10"
                                            )}
                                        >
                                            <input {...getInputProps()} />
                                            {previewUrl ? (
                                                <>
                                                    {(config.referenceImage instanceof File ? config.referenceImage.type.startsWith('video') : (typeof config.referenceImage === 'string' && config.referenceImage.endsWith('.mp4'))) ? (
                                                        <video src={previewUrl} className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop />
                                                    ) : (
                                                        <img src={previewUrl} className="absolute inset-0 w-full h-full object-cover" />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                        <Upload className="w-4 h-4 text-white" />
                                                    </div>
                                                </>
                                            ) : (
                                                <Upload className="w-6 h-6 text-gray-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col justify-center gap-2 relative">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Quick Add Tags</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {[
                                                    { id: 'lighting', label: 'Lighting', icon: '💡' },
                                                    { id: 'cameraMotions', label: 'Motion', icon: '🎥' },
                                                    { id: 'moods', label: 'Mood', icon: '🎭' },
                                                    { id: 'advanced', label: 'Advanced', icon: '⚙️' }
                                                ].map(cat => (
                                                    <div key={cat.id} className="relative">
                                                        <button
                                                            onClick={() => setActivePopover(activePopover === cat.id ? null : cat.id)}
                                                            className={clsx(
                                                                "w-full px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 hover:text-white flex items-center justify-between transition-colors",
                                                                activePopover === cat.id && "bg-white/10 border-white/30 text-white"
                                                            )}
                                                        >
                                                            <span className="flex items-center gap-1.5 truncate">
                                                                <span>{cat.icon}</span> {cat.label}
                                                            </span>
                                                            <ChevronDown className="w-3 h-3 opacity-50" />
                                                        </button>

                                                        {/* Popover */}
                                                        {activePopover === cat.id && (
                                                            <div className={clsx(
                                                                "absolute top-full mt-1 bg-[#1a1a1a] border border-white/20 rounded-lg shadow-xl z-50 p-1",
                                                                cat.id === 'advanced' ? "right-0 w-64 max-h-80 overflow-y-auto p-2" : "left-0 w-48 max-h-48 overflow-y-auto"
                                                            )}>
                                                                {cat.id === 'advanced' ? (
                                                                    <div className="space-y-3">
                                                                        {Object.entries(ADVANCED_OPTIONS).map(([key, options]) => (
                                                                            <div key={key}>
                                                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">
                                                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                                                </p>
                                                                                <div className="grid grid-cols-1 gap-0.5">
                                                                                    {(options as string[]).map(opt => (
                                                                                        <button
                                                                                            key={opt}
                                                                                            onClick={() => handleAddTag(opt, key)}
                                                                                            className="w-full text-left px-2 py-1 text-xs text-gray-300 hover:bg-blue-500/20 hover:text-blue-400 rounded transition-colors truncate"
                                                                                        >
                                                                                            {opt}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    (ADVANCED_OPTIONS as any)[cat.id]?.map((opt: string) => (
                                                                        <button
                                                                            key={opt}
                                                                            onClick={() => handleAddTag(opt, cat.id)}
                                                                            className="w-full text-left px-2 py-1.5 text-xs text-gray-300 hover:bg-blue-500/20 hover:text-blue-400 rounded transition-colors truncate"
                                                                        >
                                                                            {opt}
                                                                        </button>
                                                                    ))
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Strength Slider */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-gray-400 tracking-wider">REFERENCE STRENGTH</span>
                                        <span className="text-xs text-gray-400">{config.strength}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={config.strength || 80}
                                        onChange={(e) => setConfig({ ...config, strength: parseInt(e.target.value) })}
                                        className="w-full accent-blue-500 cursor-pointer"
                                    />
                                </div>

                                {/* CFG Scale Slider */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-gray-400 tracking-wider">CFG SCALE</span>
                                        <span className="text-xs text-gray-400">{config.guidanceScale || 3.5}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="20"
                                        step="0.1"
                                        value={config.guidanceScale || 3.5}
                                        onChange={(e) => setConfig({ ...config, guidanceScale: parseFloat(e.target.value) })}
                                        className="w-full accent-blue-500 cursor-pointer"
                                    />
                                </div>

                                {/* Steps Slider */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-gray-400 tracking-wider">STEPS</span>
                                        <span className="text-xs text-gray-400">{config.steps || 28}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="50"
                                        step="1"
                                        value={config.steps || 28}
                                        onChange={(e) => setConfig({ ...config, steps: parseInt(e.target.value) })}
                                        className="w-full accent-blue-500 cursor-pointer"
                                    />
                                </div>

                                {/* Aspect Ratio & Inspiration */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block flex items-center gap-2">
                                            <Ratio className="w-3 h-3" /> Aspect Ratio
                                        </label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {['16:9', '9:16', '1:1', '2.35:1'].map((ratio) => (
                                                <button
                                                    key={ratio}
                                                    onClick={() => setConfig({ ...config, aspectRatio: ratio })}
                                                    className={clsx(
                                                        "px-3 py-2 rounded-lg text-xs font-medium transition-colors border",
                                                        config.aspectRatio === ratio
                                                            ? "bg-blue-600 border-blue-500 text-white"
                                                            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                                    )}
                                                >
                                                    {ratio}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cinematic Inspiration</p>
                                        <textarea
                                            value={config.inspiration}
                                            onChange={(e) => setConfig({ ...config, inspiration: e.target.value })}
                                            placeholder="E.g., 'Retro, gritty, eclectic, stylish, noir...'"
                                            className="w-full h-20 bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30 resize-none mb-4"
                                        />

                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Negative Prompt</p>
                                        <textarea
                                            value={config.negativePrompt || ""}
                                            onChange={(e) => setConfig({ ...config, negativePrompt: e.target.value })}
                                            placeholder="E.g., 'blur, distortion, low quality, watermark...'"
                                            className="w-full h-20 bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-white/10 bg-[#1a1a1a] flex justify-end gap-2">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApply}
                                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    Apply
                                </button>
                            </div>
                        </motion.div>

                        {/* Side Panels */}
                        <AnimatePresence>
                            {activeManager === 'lora' && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full"
                                >
                                    <LoRAManager
                                        projectId={projectId}
                                        isOpen={true}
                                        onClose={() => setActiveManager(null)}
                                        embedded={true}
                                        selectedIds={config.loras?.map(l => l.id)}
                                        onToggle={handleToggleLoRA}
                                    />
                                </motion.div>
                            )}
                            {activeManager === 'sampler' && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full"
                                >
                                    <ParameterManager
                                        projectId={projectId}
                                        type="sampler"
                                        isOpen={true}
                                        onClose={() => setActiveManager(null)}
                                        embedded={true}
                                        selectedId={config.sampler?.id}
                                        onSelect={handleSelectSampler}
                                    />
                                </motion.div>
                            )}
                            {activeManager === 'scheduler' && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full"
                                >
                                    <ParameterManager
                                        projectId={projectId}
                                        type="scheduler"
                                        isOpen={true}
                                        onClose={() => setActiveManager(null)}
                                        embedded={true}
                                        selectedId={config.scheduler?.id}
                                        onSelect={handleSelectScheduler}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
