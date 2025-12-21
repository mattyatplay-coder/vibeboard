/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { useState, useRef, useEffect } from "react";
import { X, Upload, Check, ChevronRight, Search, Ratio, Plus, ChevronDown, Settings2, Sliders, Dice5, FileJson, FolderOpen, Library, Database } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { useDropzone } from "react-dropzone";
import { ParameterManager } from "../generations/ParameterManager";
import { CreateStyleModal, CustomStyle } from "./CreateStyleModal";
import { LoRAManager } from "../loras/LoRAManager";

import { CinematicTagsModal } from "./CinematicTagsModal";
import { DataBackupModal } from "../settings/DataBackupModal";
import { NegativePromptManager } from "../prompts/NegativePromptManager";
import { ALL_CATEGORIES, CinematicTag, CATEGORY_MAP } from "@/data/CinematicTags";

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
    seed?: number;
    negativePrompt?: string;
    workflow?: { name: string; file: File | null };
    motionVideo?: string | File | null;
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
        name: "Pop Art",
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
    {
        id: "cyberpunk",
        name: "Cyberpunk",
        image: "https://picsum.photos/seed/cyberpunk/200",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        promptSuffix: ", cyberpunk, neon lights, futuristic city, rain, holographic, blade runner inspired, dystopian"
    },
    {
        id: "vaporwave",
        name: "Vaporwave",
        image: "https://picsum.photos/seed/vaporwave/200",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        promptSuffix: ", vaporwave aesthetic, pink and blue, 80s retro, glitch art, greek statues, palm trees, sunset grid"
    },
    {
        id: "documentary",
        name: "Documentary",
        image: "https://picsum.photos/seed/documentary/200",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        promptSuffix: ", documentary style, realistic, natural lighting, handheld footage, intimate, observational"
    },
    {
        id: "horror",
        name: "Horror",
        image: "https://picsum.photos/seed/horror/200",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        promptSuffix: ", horror atmosphere, dark shadows, unsettling, tension, desaturated, grainy, creepy"
    },
    {
        id: "western",
        name: "Western",
        image: "https://picsum.photos/seed/western/200",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        promptSuffix: ", western movie, desert landscape, dusty, sepia tones, wide shots, cowboy aesthetic"
    },
    {
        id: "noir_color",
        name: "Neo-Noir",
        image: "https://picsum.photos/seed/neonoir/200",
        video: "https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
        promptSuffix: ", neo-noir, color noir, neon lights in darkness, rain-slicked streets, mysterious, stylized shadows"
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

            {isSelected && (
                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                </div>
            )}

            <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-medium text-gray-300 bg-black/60 py-0.5 backdrop-blur-sm">
                {preset.name}
            </span>
        </button>
    );
}

interface StyleSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (config: StyleConfig) => void;
    initialAspectRatio?: string;
    projectId: string;
    config?: StyleConfig; // Added config prop for external control
}

export function StyleSelectorModal({ isOpen, onClose, onApply, initialAspectRatio, projectId, config: configProp }: StyleSelectorModalProps) {
    // Basic Style State
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedStyle, setSelectedStyle] = useState<any>(null);
    const [selectedPreset, setSelectedPreset] = useState<any>(null); // Restored
    const [searchQuery, setSearchQuery] = useState(""); // Restored
    const [referenceImage, setReferenceImage] = useState<string | File | null>(null);

    // Internal Configuration State
    const [config, setConfig] = useState<StyleConfig>({
        preset: null,
        referenceImage: null,
        inspiration: "",
        aspectRatio: initialAspectRatio || "16:9",
        strength: 80,
        guidanceScale: 7.5,
        steps: 30,
        seed: undefined,
        loras: [],
        motionVideo: null,
        negativePrompt: ""
    });

    // Advanced Parameters State (helpers if needed, but we rely on config)
    const [selectedLoRAs, setSelectedLoRAs] = useState<{ id: string; name: string; strength: number }[]>([]);

    // Sync state with incoming config prop
    useEffect(() => {
        if (isOpen && configProp) {
            setConfig(prev => ({
                ...prev,
                ...configProp,
                // Ensure defaults if missing in prop
                strength: configProp.strength !== undefined ? configProp.strength : prev.strength,
                steps: configProp.steps || prev.steps,
                guidanceScale: configProp.guidanceScale || prev.guidanceScale,
                loras: configProp.loras || prev.loras,
                negativePrompt: configProp.negativePrompt !== undefined ? configProp.negativePrompt : prev.negativePrompt,
                aspectRatio: configProp.aspectRatio || prev.aspectRatio
            }));

            // Sync helper states if they exist and are used separately (selectedLoRAs seems used in my previous edit, but maybe in original too?)
            // Original code didn't show selectedLoRAs usage. But I might need to check if it's used.
            // Based on my Previous Edit, I added `selectedLoRAs`. 
            // If the rest of the file uses `config.loras`, I should ensure that's what is used.
            // If I see `selectedLoRAs` being used in the file, I should keep it.
            // But I broke the file because `config` was missing.
            // I'll assume `config` is the source of truth.
        }
    }, [isOpen, configProp]);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [customPresets, setCustomPresets] = useState<any[]>([]);
    const [activePopover, setActivePopover] = useState<string | null>(null);
    const [expandedSections, setExpandedSections] = useState<string[]>(["loras"]);
    const [activeManager, setActiveManager] = useState<'lora' | 'sampler' | 'scheduler' | 'tags' | 'negative' | null>(null);
    const [initialTagCategory, setInitialTagCategory] = useState<string | undefined>(undefined);
    const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

    const toggleSection = (section: string) => {
        setExpandedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    const handleAddTag = (tag: CinematicTag, categoryId: string) => {
        const prefix = config.inspiration ? `${config.inspiration}, ` : "";
        // Use the tag's prompt directly - it already includes the proper formatting
        setConfig({ ...config, inspiration: prefix + tag.prompt });
        // Keep the panel open so users can add multiple tags
    };

    const openTagsPanel = (categoryId?: string) => {
        setInitialTagCategory(categoryId);
        setActiveManager(activeManager === 'tags' ? null : 'tags');
    };

    const handleApply = () => {
        onApply(config);
        onClose();
    };

    const handleCreateStyle = (style: CustomStyle) => {
        const suffix = style.tags.length > 0 ? `, ${style.tags.join(", ")}` : "";
        const newPreset = {
            id: style.id,
            name: style.name,
            image: style.image,
            video: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            inspiration: style.tags.join(", "),
            promptSuffix: suffix
        };
        setCustomPresets([...customPresets, newPreset]);
        setConfig(prev => ({
            ...prev,
            preset: newPreset.id,
            inspiration: newPreset.inspiration,
        }));
    };

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

    const handleLoRAStrengthChange = (loraId: string, strength: number) => {
        setConfig(prev => ({
            ...prev,
            loras: prev.loras?.map(l => l.id === loraId ? { ...l, strength } : l)
        }));
    };

    const handleSelectSampler = (sampler: any) => {
        setConfig(prev => ({ ...prev, sampler: sampler || undefined }));
    };

    const handleSelectScheduler = (scheduler: any) => {
        setConfig(prev => ({ ...prev, scheduler: scheduler || undefined }));
    };

    const generateRandomSeed = () => {
        setConfig(prev => ({ ...prev, seed: Math.floor(Math.random() * 2147483647) }));
    };

    const allPresets = [...STYLE_PRESETS, ...customPresets];
    const filteredPresets = searchQuery
        ? allPresets.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : allPresets;

    const onDrop = (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setConfig({ ...config, referenceImage: acceptedFiles[0] });
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [], 'video/*': [] },
        maxFiles: 1
    });

    const previewUrl = config.referenceImage
        ? (typeof config.referenceImage === 'string' ? config.referenceImage : URL.createObjectURL(config.referenceImage))
        : null;

    useEffect(() => {
        return () => {
            if (previewUrl && typeof config.referenceImage !== 'string') {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [config.referenceImage]);

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
                        <div className="flex gap-4 items-start max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                                style={{ width: '900px' }}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between p-4 border-b border-white/10">
                                    <h2 className="text-lg font-bold text-white">Style & Parameters</h2>
                                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* 3-Column Content */}
                                <div className="flex-1 overflow-hidden flex">
                                    {/* LEFT COLUMN - Style Presets */}
                                    <div className="w-[280px] border-r border-white/10 flex flex-col">
                                        <div className="p-3 border-b border-white/5">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                <input
                                                    type="text"
                                                    placeholder="Search styles..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-3">
                                            <div className="grid grid-cols-3 gap-2">
                                                {filteredPresets.map((preset) => (
                                                    <PresetCard
                                                        key={preset.id}
                                                        preset={preset}
                                                        isSelected={config.preset === preset.id}
                                                        onClick={() => {
                                                            setConfig({
                                                                ...config,
                                                                preset: preset.id,
                                                                inspiration: preset.inspiration || config.inspiration,
                                                            });
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="p-3 border-t border-white/5">
                                            <button
                                                onClick={() => setIsCreateModalOpen(true)}
                                                className="w-full py-2 border border-dashed border-white/20 hover:border-blue-500/50 hover:bg-blue-500/10 rounded-lg text-xs text-gray-400 hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Create New Style
                                            </button>
                                            <button
                                                onClick={() => setIsBackupModalOpen(true)}
                                                className="w-full mt-2 py-2 border border-dashed border-white/20 hover:border-green-500/50 hover:bg-green-500/10 rounded-lg text-xs text-gray-400 hover:text-green-400 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Database className="w-4 h-4" />
                                                Data Management
                                            </button>
                                        </div>
                                    </div>

                                    {/* MIDDLE COLUMN - Reference & Advanced Settings */}
                                    <div className="w-[310px] border-r border-white/10 flex flex-col overflow-y-auto">
                                        <div className="p-4 space-y-4">
                                            {/* Reference Image */}
                                            <div>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Reference Image (Structure/Character)</span>
                                                <div
                                                    {...getRootProps()}
                                                    className={clsx(
                                                        "relative w-full aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer overflow-hidden",
                                                        isDragActive ? "border-blue-500 bg-blue-500/10" : "border-white/20 bg-white/5 hover:bg-white/10"
                                                    )}
                                                >
                                                    <input {...getInputProps()} />
                                                    {previewUrl ? (
                                                        <>
                                                            {(config.referenceImage instanceof File ? config.referenceImage.type.startsWith('video') : false) ? (
                                                                <video src={previewUrl} className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop />
                                                            ) : (
                                                                <img src={previewUrl} className="absolute inset-0 w-full h-full object-cover" alt="Reference" />
                                                            )}
                                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                                <Upload className="w-6 h-6 text-white" />
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setConfig({ ...config, referenceImage: null });
                                                                }}
                                                                className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-red-500 rounded text-white transition-colors"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div className="text-center">
                                                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                                            <p className="text-xs text-gray-400">Drop image or click to upload</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Motion/Pose Video (New) */}
                                            <div>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Motion / Pose Video</span>
                                                <div className="relative w-full aspect-video border-2 border-dashed border-white/20 bg-white/5 hover:bg-white/10 rounded-xl flex flex-col items-center justify-center transition-colors overflow-hidden">
                                                    {config.motionVideo ? (
                                                        <>
                                                            <video
                                                                src={typeof config.motionVideo === 'string' ? config.motionVideo : URL.createObjectURL(config.motionVideo)}
                                                                className="absolute inset-0 w-full h-full object-cover"
                                                                autoPlay muted loop
                                                            />
                                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10 cursor-pointer">
                                                                <label className="cursor-pointer">
                                                                    <Upload className="w-6 h-6 text-white" />
                                                                    <input
                                                                        type="file"
                                                                        accept="video/*"
                                                                        className="hidden"
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) setConfig({ ...config, motionVideo: file });
                                                                        }}
                                                                    />
                                                                </label>
                                                            </div>
                                                            <button
                                                                onClick={() => setConfig({ ...config, motionVideo: null })}
                                                                className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-red-500 rounded text-white z-20 transition-colors"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                                            <p className="text-xs text-gray-400">Upload Motion Video</p>
                                                            <input
                                                                type="file"
                                                                accept="video/*"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) setConfig({ ...config, motionVideo: file });
                                                                }}
                                                            />
                                                        </label>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Advanced Settings Accordion */}
                                            <div className="border border-white/10 rounded-lg overflow-hidden">
                                                <button
                                                    onClick={() => toggleSection("loras")}
                                                    className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors"
                                                >
                                                    <span className="text-xs font-bold text-gray-300 flex items-center gap-2">
                                                        <Settings2 className="w-3.5 h-3.5" />
                                                        LoRAs & Checkpoints
                                                    </span>
                                                    <ChevronDown className={clsx(
                                                        "w-4 h-4 text-gray-400 transition-transform",
                                                        expandedSections.includes("loras") && "rotate-180"
                                                    )} />
                                                </button>

                                                {expandedSections.includes("loras") && (
                                                    <div className="p-3 border-t border-white/5 space-y-3">
                                                        {config.loras && config.loras.length > 0 && (
                                                            <div className="space-y-2">
                                                                <span className="text-[10px] font-bold text-gray-500 uppercase">LoRA Strengths</span>
                                                                {config.loras.map(lora => (
                                                                    <div key={lora.id} className="bg-black/20 rounded-lg p-2 border border-white/5">
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <span className="text-xs text-gray-300 truncate flex-1">{lora.name}</span>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[10px] text-gray-500 w-8 text-right">{lora.strength.toFixed(1)}</span>
                                                                                <button
                                                                                    onClick={() => handleToggleLoRA(lora)}
                                                                                    className="text-gray-500 hover:text-red-400"
                                                                                >
                                                                                    <X className="w-3 h-3" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                        <input
                                                                            type="range"
                                                                            min="0"
                                                                            max="2"
                                                                            step="0.1"
                                                                            value={lora.strength}
                                                                            onChange={(e) => handleLoRAStrengthChange(lora.id, parseFloat(e.target.value))}
                                                                            className="w-full accent-blue-500 h-1"
                                                                        />
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
                                                            {activeManager === 'lora' ? "Close Manager" : "+ Add LoRAs"}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Sampler & Scheduler Accordion */}
                                            <div className="border border-white/10 rounded-lg overflow-hidden">
                                                <button
                                                    onClick={() => toggleSection("sampler-scheduler")}
                                                    className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors"
                                                >
                                                    <span className="text-xs font-bold text-gray-300 flex items-center gap-2">
                                                        <Sliders className="w-3.5 h-3.5" />
                                                        Sampler & Scheduler
                                                    </span>
                                                    <ChevronDown className={clsx(
                                                        "w-4 h-4 text-gray-400 transition-transform",
                                                        expandedSections.includes("sampler-scheduler") && "rotate-180"
                                                    )} />
                                                </button>

                                                {expandedSections.includes("sampler-scheduler") && (
                                                    <div className="p-3 border-t border-white/5">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {/* Sampler */}
                                                            <div>
                                                                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Sampler</span>
                                                                <button
                                                                    onClick={() => setActiveManager(activeManager === 'sampler' ? null : 'sampler')}
                                                                    className={clsx(
                                                                        "w-full px-2 py-1.5 border rounded text-xs text-left truncate transition-colors",
                                                                        activeManager === 'sampler'
                                                                            ? "border-blue-500/50 text-blue-400 bg-blue-500/10"
                                                                            : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                                                                    )}
                                                                >
                                                                    {config.sampler?.name || "DPM++ SDE Kar..."}
                                                                </button>
                                                            </div>

                                                            {/* Scheduler */}
                                                            <div>
                                                                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Scheduler</span>
                                                                <button
                                                                    onClick={() => setActiveManager(activeManager === 'scheduler' ? null : 'scheduler')}
                                                                    className={clsx(
                                                                        "w-full px-2 py-1.5 border rounded text-xs text-left truncate transition-colors",
                                                                        activeManager === 'scheduler'
                                                                            ? "border-blue-500/50 text-blue-400 bg-blue-500/10"
                                                                            : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                                                                    )}
                                                                >
                                                                    {config.scheduler?.name || "Karras"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Workflow Accordion */}
                                            <div className="border border-white/10 rounded-lg overflow-hidden">
                                                <button
                                                    onClick={() => toggleSection("workflow")}
                                                    className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors"
                                                >
                                                    <span className="text-xs font-bold text-gray-300 flex items-center gap-2">
                                                        <Sliders className="w-3.5 h-3.5" />
                                                        Workflow
                                                    </span>
                                                    <ChevronDown className={clsx(
                                                        "w-4 h-4 text-gray-400 transition-transform",
                                                        expandedSections.includes("workflow") && "rotate-180"
                                                    )} />
                                                </button>

                                                {expandedSections.includes("workflow") && (
                                                    <div className="p-3 border-t border-white/5 space-y-3">
                                                        {/* Workflow Upload */}
                                                        <div>
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Custom Workflow (JSON)</span>
                                                            {config.workflow?.name ? (
                                                                <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                                                                    <FileJson className="w-4 h-4 text-green-400" />
                                                                    <span className="text-xs text-green-300 flex-1 truncate">{config.workflow.name}</span>
                                                                    <button
                                                                        onClick={() => setConfig(prev => ({ ...prev, workflow: undefined }))}
                                                                        className="text-gray-400 hover:text-red-400"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-white/20 hover:border-purple-500/50 hover:bg-purple-500/10 rounded-lg cursor-pointer transition-colors">
                                                                    <FolderOpen className="w-4 h-4 text-gray-400" />
                                                                    <span className="text-xs text-gray-400">Upload ComfyUI/Workflow JSON</span>
                                                                    <input
                                                                        type="file"
                                                                        accept=".json"
                                                                        className="hidden"
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) {
                                                                                setConfig(prev => ({
                                                                                    ...prev,
                                                                                    workflow: { name: file.name, file }
                                                                                }));
                                                                            }
                                                                        }}
                                                                    />
                                                                </label>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* RIGHT COLUMN - Quick Tags & Parameters */}
                                    <div className="flex-1 flex flex-col overflow-y-auto">
                                        <div className="p-4 space-y-4">
                                            {/* Quick Add Tags */}
                                            <div>
                                                <button
                                                    onClick={() => openTagsPanel()}
                                                    className={clsx(
                                                        "w-full px-3 py-2 rounded-lg border text-sm font-medium flex items-center justify-between transition-colors",
                                                        activeManager === 'tags'
                                                            ? "bg-blue-500/10 border-blue-500/50 text-blue-400"
                                                            : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white"
                                                    )}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <span>🎬</span> Add Cinematic Tags
                                                    </span>
                                                    <ChevronRight className="w-4 h-4 opacity-50" />
                                                </button>
                                            </div>

                                            {/* Cinematic Inspiration - moved here so users can see selected tags */}
                                            <div>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Cinematic Inspiration</span>
                                                <textarea
                                                    value={config.inspiration}
                                                    onChange={(e) => setConfig({ ...config, inspiration: e.target.value })}
                                                    placeholder="E.g., 'Retro, gritty, eclectic, stylish, noir...'"
                                                    className="w-full h-20 bg-black/30 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/30 resize-none"
                                                />
                                            </div>

                                            {/* Reference Strength */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reference Strength</span>
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

                                            {/* CFG Scale */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">CFG Scale</span>
                                                    <span className="text-xs text-gray-400">{config.guidanceScale?.toFixed(1) || "3.5"}</span>
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

                                            {/* Steps */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Steps</span>
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

                                            {/* Seed */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Seed</span>
                                                    <button
                                                        onClick={generateRandomSeed}
                                                        className="text-xs text-gray-400 hover:text-blue-400 flex items-center gap-1 transition-colors"
                                                    >
                                                        <Dice5 className="w-3 h-3" />
                                                        Random
                                                    </button>
                                                </div>
                                                <input
                                                    type="number"
                                                    value={config.seed || ""}
                                                    onChange={(e) => setConfig({ ...config, seed: e.target.value ? parseInt(e.target.value) : undefined })}
                                                    placeholder="Random"
                                                    className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
                                                />
                                            </div>

                                            {/* Aspect Ratio */}
                                            <div>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                                                    <Ratio className="w-3 h-3" /> Aspect Ratio
                                                </span>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {['16:9', '9:16', '1:1', '2.35:1'].map((ratio) => (
                                                        <button
                                                            key={ratio}
                                                            onClick={() => setConfig({ ...config, aspectRatio: ratio })}
                                                            className={clsx(
                                                                "px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border",
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

                                            {/* Negative Prompt */}
                                            <div>
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Negative Prompt</span>
                                                        <button
                                                            onClick={() => setActiveManager(activeManager === 'negative' ? null : 'negative')}
                                                            className={clsx(
                                                                "text-[10px] flex items-center gap-1 font-medium transition-colors",
                                                                activeManager === 'negative' ? "text-red-400" : "text-gray-500 hover:text-white"
                                                            )}
                                                        >
                                                            <Library className="w-3 h-3" />
                                                            Library
                                                        </button>
                                                    </div>
                                                    <textarea
                                                        value={config.negativePrompt || ""}
                                                        onChange={(e) => setConfig({ ...config, negativePrompt: e.target.value })}
                                                        placeholder="E.g., 'blur, distortion, low quality, watermark...'"
                                                        className="w-full h-16 bg-black/30 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/30 resize-none"
                                                    />
                                                </div>
                                            </div>
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
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        Apply Style
                                    </button>
                                </div>
                            </motion.div>

                            {/* Side Panels for LoRA/Sampler/Scheduler */}
                            <AnimatePresence>
                                {activeManager === 'lora' && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="h-full max-h-[90vh]"
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
                                        className="h-full max-h-[90vh]"
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
                                        className="h-full max-h-[90vh]"
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
                                {activeManager === 'tags' && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="h-full max-h-[90vh]"
                                    >
                                        <CinematicTagsModal
                                            isOpen={true}
                                            onClose={() => setActiveManager(null)}
                                            onSelectTag={handleAddTag}
                                            initialCategory={initialTagCategory}
                                            embedded={true}
                                        />
                                    </motion.div>
                                )}
                                {activeManager === 'negative' && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="h-full max-h-[90vh]"
                                    >
                                        <NegativePromptManager
                                            projectId={projectId}
                                            isOpen={true}
                                            onClose={() => setActiveManager(null)}
                                            currentPrompt={config.negativePrompt}
                                            onSelect={(prompt) => setConfig({ ...config, negativePrompt: prompt })}
                                            embedded={true}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            <DataBackupModal
                isOpen={isBackupModalOpen}
                onClose={() => setIsBackupModalOpen(false)}
                projectId={projectId}
            />

            {/* Create Style Modal */}
            <CreateStyleModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleCreateStyle}
            />
        </>
    );
}
