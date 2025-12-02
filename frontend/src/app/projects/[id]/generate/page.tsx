"use client";

import { useState, useEffect, useRef } from "react";
import { fetchAPI } from "@/lib/api";
import { useParams } from "next/navigation";
import { EngineSelectorV2 } from '@/components/generations/EngineSelectorV2';
import { PromptBuilder } from '@/components/prompts/PromptBuilder';
import {
    Loader2, Send, Image as ImageIcon, Video,
    Wand2, Settings, History, ChevronRight,
    Sparkles, Zap, Layers, AlertCircle, Check, X,
    Play, Ratio, ChevronDown, SlidersHorizontal, Users, Trash2, Copy, CheckSquare
} from 'lucide-react';
import { ADVANCED_OPTIONS } from "@/components/storyboard/CreateStyleModal";
import { Element, Generation, Scene } from "@/lib/store";
import { clsx } from "clsx";
import { GenerationCard } from "@/components/generations/GenerationCard";
import { ShotNavigator } from "@/components/generations/ShotNavigator";
import { ElementPicker } from "@/components/generations/ElementPicker";
import { MagicPromptButton } from "@/components/generations/MagicPromptButton";
import { StyleSelectorModal, StyleConfig } from "@/components/storyboard/StyleSelectorModal";
import { useSession } from "@/context/SessionContext";
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    DragStartEvent,
    DragEndEvent
} from "@dnd-kit/core";

import { EditElementModal } from "@/components/elements/EditElementModal";
import { VideoMaskEditor } from "@/components/generations/VideoMaskEditor";
import { ImageMaskEditor } from "@/components/generations/ImageMaskEditor";

export default function GeneratePage() {
    const params = useParams();

    const projectId = params.id as string;

    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generations, setGenerations] = useState<Generation[]>([]);
    const [elements, setElements] = useState<Element[]>([]);
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [aspectRatio, setAspectRatio] = useState("16:9");
    const [strength, setStrength] = useState(0.75); // Default strength
    const [variations, setVariations] = useState(1); // Default variations
    const [duration, setDuration] = useState("5"); // Default video duration
    const [isFocused, setIsFocused] = useState(false); // Input focus state
    const [mode, setMode] = useState<'image' | 'video'>('image'); // Generation mode
    const [steps, setSteps] = useState(30);
    const [guidanceScale, setGuidanceScale] = useState(7.5);
    const [seed, setSeed] = useState<number | undefined>(undefined); // Seed for reproducible results
    const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
    const { selectedSessionId, sessions } = useSession();

    // Drag and Drop state
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // Autocomplete state
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionQuery, setSuggestionQuery] = useState("");
    const [cursorPosition, setCursorPosition] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
    const [styleConfig, setStyleConfig] = useState<StyleConfig | null>(null);
    const [isElementPickerOpen, setIsElementPickerOpen] = useState(false);

    // Edit Modal State
    const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPromptBuilderOpen, setIsPromptBuilderOpen] = useState(false);

    // Engine State
    const [engineConfig, setEngineConfig] = useState<{ provider: string, model: string }>({
        provider: 'fal',
        model: 'fal-ai/flux/dev'
    });

    const handleAddTag = (tag: string, category: string) => {
        const prefix = prompt ? `${prompt}, ` : "";
        let newTag = tag;

        // Add context to the tag based on category
        if (category === 'cameras') newTag = `shot on ${tag}`;
        else if (category === 'lenses') newTag = `${tag} lens`;
        else if (category === 'films') newTag = `${tag} film stock`;
        else if (category === 'colors') newTag = `${tag} color grading`;
        else if (category === 'lighting') newTag = `${tag} lighting`;
        else if (category === 'cameraMotions') newTag = `${tag} camera movement`;
        else if (category === 'moods') newTag = `${tag} mood`;

        setPrompt(prefix + newTag);
        // Removed setActivePopover(null) as popover is replaced by modal
    };

    const handleStyleApply = (config: StyleConfig) => {
        setStyleConfig(config);
        setAspectRatio(config.aspectRatio);

        // Append inspiration to prompt if present
        if (config.inspiration) {
            setPrompt(prev => {
                const cleanPrev = prev.trim();
                return cleanPrev ? `${cleanPrev} -- ${config.inspiration}` : config.inspiration;
            });
        }

        // Update strength if present (convert 0-100 to 0-1 and invert for API denoising strength)
        // UI: 100% = High Resemblance (Low Noise)
        // API: 0.0 = Low Noise (High Resemblance)
        if (config.strength !== undefined) {
            setStrength(1 - (config.strength / 100));
        }

        setIsStyleModalOpen(false);
    };

    useEffect(() => {
        if (projectId) {
            loadGenerations();
            loadElements();
            loadScenes();

            // Check backend config
            fetchAPI('/health').then(data => {
                if (data.falConfigured === false) {
                    console.log("Fal.ai not configured, defaulting to ComfyUI");
                    setEngineConfig(prev => ({ ...prev, provider: 'comfy' }));
                }
            }).catch(console.error);

            // Poll for updates
            const interval = setInterval(() => {
                loadGenerations();
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [projectId, selectedSessionId]);

    const loadElements = async () => {
        try {
            console.log("Loading elements...");
            const data = await fetchAPI(`/elements`); // Fetch global elements
            const mapped: Element[] = data.map((e: any) => ({
                id: e.id,
                name: e.name,
                type: e.type,
                tags: e.tags || [],
                metadata: e.metadata,
                session: e.session,
                url: `http://localhost:3001${e.fileUrl}`,
                projectId: e.projectId
            }));
            setElements(mapped);
            console.log("Loaded elements:", mapped.length);
            console.log("Current Project ID:", projectId);
            console.log("First Element Project ID:", mapped[0]?.projectId);
            console.log("Filtered count:", mapped.filter(e => e.projectId === projectId).length);
        } catch (err) {
            console.error(err);
        }
    };

    const loadScenes = async () => {
        try {
            console.log("Loading scenes. Selected Session:", selectedSessionId);
            const endpoint = selectedSessionId
                ? `/projects/${projectId}/scenes?sessionId=${selectedSessionId}`
                : `/projects/${projectId}/scenes`;
            console.log("Scene endpoint:", endpoint);
            const data = await fetchAPI(endpoint);
            setScenes(data);
        } catch (err) {
            console.error("Failed to load scenes", err);
        }
    };

    const loadGenerations = async () => {
        try {
            const endpoint = selectedSessionId
                ? `/projects/${params.id}/generations?sessionId=${selectedSessionId}`
                : `/projects/${params.id}/generations`;

            const data = await fetchAPI(endpoint);
            setGenerations(data);
        } catch (error) {
            console.error("Failed to load generations:", error);
        }
    };



    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        try {
            const isVideo = engineConfig.model?.includes('video') || engineConfig.model?.includes('t2v') || engineConfig.model?.includes('i2v');
            const mode = isVideo
                ? (selectedElementIds.length > 0 ? 'image_to_video' : 'text_to_video')
                : 'text_to_image';

            await fetchAPI(`/projects/${projectId}/generations`, {
                method: "POST",
                body: JSON.stringify({
                    mode,
                    inputPrompt: prompt,
                    aspectRatio,
                    sourceElementIds: selectedElementIds,
                    variations: 1,
                    sessionId: selectedSessionId,
                    engine: engineConfig.provider,
                    falModel: engineConfig.model,
                    // Pass structured style data if available
                    shotType: styleConfig?.camera?.type,
                    cameraAngle: styleConfig?.camera?.angle,
                    lighting: styleConfig?.lighting?.type,
                    location: styleConfig?.location?.type,
                    strength: strength, // Use the separate strength state
                    loras: styleConfig?.loras, // Pass selected LoRAs
                    sampler: styleConfig?.sampler, // Pass selected Sampler
                    scheduler: styleConfig?.scheduler, // Pass selected Scheduler
                    guidanceScale: styleConfig?.guidanceScale, // Pass selected CFG Scale
                    steps: styleConfig?.steps, // Pass selected Steps
                    duration: duration, // Pass selected Duration
                    negativePrompt: styleConfig?.negativePrompt, // Pass Negative Prompt
                })
            });
            setPrompt("");
            loadGenerations();
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpdateGeneration = async (id: string, updates: Partial<Generation>) => {
        try {
            await fetchAPI(`/projects/${projectId}/generations/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(updates)
            });
            loadGenerations();
        } catch (err) {
            console.error("Failed to update generation", err);
        }
    };

    const handleDeleteGeneration = async (id: string) => {
        try {
            await fetchAPI(`/projects/${projectId}/generations/${id}`, {
                method: 'DELETE'
            });
            loadGenerations();
        } catch (err) {
            console.error("Failed to delete generation", err);
        }
    };

    const handleIterateGeneration = async (newPrompt: string) => {
        if (!newPrompt.trim()) return;
        setIsGenerating(true);
        try {
            await fetchAPI(`/projects/${projectId}/generations`, {
                method: "POST",
                body: JSON.stringify({
                    mode: "text_to_image",
                    inputPrompt: newPrompt,
                    aspectRatio,
                    sourceElementIds: selectedElementIds,
                    variations: 1,
                    sessionId: selectedSessionId,
                    engine: engineConfig.provider,
                    falModel: engineConfig.model,
                    shotType: styleConfig?.camera?.type,
                    cameraAngle: styleConfig?.camera?.angle,
                    lighting: styleConfig?.lighting?.type,
                    location: styleConfig?.location?.type,
                })
            });
            loadGenerations();
        } catch (err: any) {
            console.error("Iteration failed:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAnimate = async (imageUrl: string) => {
        setIsGenerating(true);
        try {
            await fetchAPI(`/projects/${projectId}/generations`, {
                method: "POST",
                body: JSON.stringify({
                    mode: "image_to_video",
                    inputPrompt: prompt || "animate this image", // Use current prompt or default
                    sourceImageUrl: imageUrl,
                    variations: 1,
                    sessionId: selectedSessionId,
                    engine: 'fal', // Force Fal for video
                    falModel: 'fal-ai/wan-i2v', // Explicitly set model
                })
            });
            loadGenerations();
        } catch (err: any) {
            console.error("Animation failed:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    // Retake / Inpainting Logic
    const [isRetakeModalOpen, setIsRetakeModalOpen] = useState(false);
    const [retakeVideoUrl, setRetakeVideoUrl] = useState<string | null>(null);

    // Image Inpainting Logic
    const [isImageInpaintModalOpen, setIsImageInpaintModalOpen] = useState(false);
    const [inpaintImageUrl, setInpaintImageUrl] = useState<string | null>(null);
    const [inpaintAspectRatio, setInpaintAspectRatio] = useState<string | null>(null);

    const handleRetake = (videoUrl: string) => {
        setRetakeVideoUrl(videoUrl);
        setIsRetakeModalOpen(true);
    };

    const handleInpaint = (imageUrl: string, aspectRatio?: string) => {
        setInpaintImageUrl(imageUrl);
        if (aspectRatio) setInpaintAspectRatio(aspectRatio);
        setIsImageInpaintModalOpen(true);
    };

    const handleSaveInpaint = async (maskDataUrl: string, inpaintPrompt: string, negativePrompt: string, strength: number, seed?: number) => {
        console.log("handleSaveInpaint called", { inpaintPrompt, strength, seed, hasMask: !!maskDataUrl });
        if (!inpaintImageUrl) {
            console.error("No inpaintImageUrl found");
            return;
        }
        setIsGenerating(true);
        try {
            // Get original image dimensions to prevent resolution loss
            const img = new Image();
            img.src = inpaintImageUrl;
            await new Promise((resolve) => { img.onload = resolve; });

            const payload = {
                mode: "image_inpainting",
                // Prioritize inpaintPrompt. If user cleared it, send empty string so backend handles it.
                // Only fallback to "inpaint this area" if inpaintPrompt is undefined (initial load)
                inputPrompt: inpaintPrompt !== undefined ? inpaintPrompt : (prompt || "inpaint this area"),
                negativePrompt: negativePrompt,
                sourceImageUrl: inpaintImageUrl,
                maskUrl: maskDataUrl,
                variations: 1,
                sessionId: selectedSessionId,
                engine: 'replicate', // Use Replicate for TRUE inpainting
                strength: strength || 0.99, // High strength for inpainting
                aspectRatio: inpaintAspectRatio || "16:9",
                width: img.naturalWidth, // Pass original dimensions
                height: img.naturalHeight,
                falModel: 'black-forest-labs/flux-fill-dev', // FLUX.1 Fill - professional-grade inpainting
                seed: seed, // Pass seed for reproducibility
            };
            console.log("Sending inpainting request with dimensions:", payload.width, "x", payload.height);

            await fetchAPI(`/projects/${projectId}/generations`, {
                method: "POST",
                body: JSON.stringify(payload),
            });
            loadGenerations();
        } catch (err: any) {
            console.error("Inpainting failed:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveRetake = async (maskDataUrl: string) => {
        if (!retakeVideoUrl) return;
        setIsGenerating(true);
        try {
            await fetchAPI(`/projects/${projectId}/generations`, {
                method: "POST",
                body: JSON.stringify({
                    mode: "video_inpainting", // This mode needs to be handled in backend
                    inputPrompt: prompt || "retake this shot",
                    sourceVideoUrl: retakeVideoUrl,
                    maskUrl: maskDataUrl, // Pass the mask data URL (backend handles upload)
                    variations: 1,
                    sessionId: selectedSessionId,
                    engine: 'fal',
                    falModel: 'fal-ai/wan-vace-14b/inpainting', // Force VACE model
                })
            });
            loadGenerations();
        } catch (err: any) {
            console.error("Retake failed:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const position = e.target.selectionStart;
        setPrompt(value);
        setCursorPosition(position);

        // Check for @ trigger
        const textBeforeCursor = value.slice(0, position);
        const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

        if (lastAtSymbol !== -1) {
            const query = textBeforeCursor.slice(lastAtSymbol + 1);
            // Only show suggestions if there's no space after @ (unless it's the start of a name)
            if (!query.includes(" ")) {
                setSuggestionQuery(query);
                setShowSuggestions(true);
                return;
            }
        }
        setShowSuggestions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !showSuggestions) {
            e.preventDefault();
            handleGenerate();
        }
    };

    const selectSuggestion = (element: Element) => {
        const textBeforeCursor = prompt.slice(0, cursorPosition);
        const textAfterCursor = prompt.slice(cursorPosition);
        const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

        const newPrompt = textBeforeCursor.slice(0, lastAtSymbol) + `@${element.name} ` + textAfterCursor;
        setPrompt(newPrompt);
        setShowSuggestions(false);

        // Add to selected elements if not already there
        if (!selectedElementIds.includes(element.id)) {
            setSelectedElementIds(prev => [...prev, element.id]);
        }

        // Reset focus
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus({ preventScroll: true });
                const newCursorPos = lastAtSymbol + element.name.length + 2; // +2 for @ and space
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    const toggleElement = (element: Element) => {
        if (selectedElementIds.includes(element.id)) {
            setSelectedElementIds(prev => prev.filter(id => id !== element.id));
        } else {
            setSelectedElementIds(prev => [...prev, element.id]);
            // Optionally add to prompt if not present
            if (!prompt.includes(`@${element.name}`)) {
                setPrompt(prev => prev.trim() ? `${prev} @${element.name} ` : `@${element.name} `);
            }
        }
    };

    const filteredElements = elements.filter(el =>
        el.name.toLowerCase().includes(suggestionQuery.toLowerCase())
    );

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);
        setDragOverIndex(null);

        console.log("Drag End:", { active, over });

        if (over && active.data.current?.type === 'generation') {
            const generationId = active.id as string;
            const { sceneId, index } = over.data.current || {};

            console.log("Dropping generation:", { generationId, sceneId, index });

            if (sceneId && typeof index === 'number') {
                // Optimistic Update
                const generation = generations.find(g => g.id === generationId);
                if (generation) {
                    setScenes(prevScenes => {
                        return prevScenes.map(scene => {
                            if (scene.id === sceneId) {
                                const newShot = {
                                    id: `temp-${Date.now()}`, // Temporary ID
                                    sceneId,
                                    generationId,
                                    index,
                                    generation: generation,
                                    notes: ""
                                };
                                const updatedShots = [...(scene.shots || [])];
                                updatedShots.splice(index, 0, newShot);
                                // Re-index subsequent shots for local state consistency
                                for (let i = index + 1; i < updatedShots.length; i++) {
                                    updatedShots[i].index = i;
                                }
                                return { ...scene, shots: updatedShots };
                            }
                            return scene;
                        });
                    });
                }

                try {
                    await fetchAPI(`/projects/${projectId}/scenes/${sceneId}/shots`, {
                        method: 'POST',
                        body: JSON.stringify({
                            generationId,
                            index
                        })
                    });
                    loadScenes(); // Reload to get real IDs and confirm state
                } catch (err) {
                    console.error("Failed to add shot to scene", err);
                    loadScenes(); // Revert on error
                }
            } else {
                console.warn("Missing sceneId or index for drop", { sceneId, index });
            }
        }
    };

    const handleRemoveShot = async (shotId: string) => {
        // Find the scene containing the shot
        const scene = scenes.find(s => s.shots?.some(shot => shot.id === shotId));
        if (!scene) return;

        // Optimistic Update
        setScenes(prevScenes => prevScenes.map(s => {
            if (s.id === scene.id) {
                return {
                    ...s,
                    shots: s.shots?.filter(shot => shot.id !== shotId)
                };
            }
            return s;
        }));

        try {
            await fetchAPI(`/projects/${projectId}/scenes/${scene.id}/shots/${shotId}`, {
                method: 'DELETE'
            });
            loadScenes();
        } catch (err) {
            console.error("Failed to remove shot", err);
            loadScenes(); // Revert on error
        }
    };

    // Batch Selection State
    const [selectedGenerationIds, setSelectedGenerationIds] = useState<string[]>([]);

    const toggleGenerationSelection = (id: string) => {
        setSelectedGenerationIds(prev =>
            prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]
        );
    };

    const selectAllGenerations = () => {
        setSelectedGenerationIds(generations.map(g => g.id));
    };

    const deselectAllGenerations = () => {
        setSelectedGenerationIds([]);
    };

    const handleBatchDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedGenerationIds.length} generations?`)) return;

        try {
            await Promise.all(selectedGenerationIds.map(id =>
                fetchAPI(`/projects/${projectId}/generations/${id}`, { method: 'DELETE' })
            ));
            setSelectedGenerationIds([]);
            loadGenerations();
        } catch (err) {
            console.error("Batch delete failed", err);
        }
    };

    const handleBatchMove = async (targetSessionId: string) => {
        try {
            await Promise.all(selectedGenerationIds.map(id =>
                fetchAPI(`/projects/${projectId}/generations/${id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ sessionId: targetSessionId })
                })
            ));
            setSelectedGenerationIds([]);
            loadGenerations();
        } catch (err) {
            console.error("Batch move failed", err);
        }
    };

    const handleBatchCopyLinks = () => {
        const links = generations
            .filter(g => selectedGenerationIds.includes(g.id))
            .map(g => {
                const output = g.outputs?.[0];
                const rawUrl = output?.url;
                return rawUrl
                    ? (rawUrl.startsWith('http') ? rawUrl : `http://localhost:3001${rawUrl}`)
                    : null;
            })
            .filter(Boolean)
            .join('\n');

        if (links) {
            navigator.clipboard.writeText(links);
            // Optional: Show a toast or visual feedback
            alert(`Copied ${selectedGenerationIds.length} links to clipboard!`);
        }
    };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <div className="flex-1 flex overflow-hidden">
                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col overflow-hidden relative">
                        {/* Shot Navigator */}
                        <div className="flex-shrink-0 z-20 relative bg-black/50 backdrop-blur-sm border-b border-white/10">
                            <ShotNavigator
                                scenes={scenes}
                                activeDragId={activeDragId}
                                onDropIndexChange={setDragOverIndex}
                                onRemove={handleRemoveShot}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 pb-32 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            <header className="mb-8 flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight mb-2">Generate</h1>
                                    <p className="text-gray-400 mt-2">Create new shots using AI.</p>
                                </div>
                                {generations.length > 0 && (
                                    <button
                                        onClick={selectedGenerationIds.length === generations.length ? deselectAllGenerations : selectAllGenerations}
                                        className="text-sm text-blue-400 hover:text-blue-300"
                                    >
                                        {selectedGenerationIds.length === generations.length ? "Deselect All" : "Select All"}
                                    </button>
                                )}
                            </header>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Results Column */}
                                <div className="lg:col-span-3">
                                    <h2 className="text-xl font-bold mb-4">Recent Generations</h2>
                                    <div className="grid grid-cols-3 gap-4">
                                        {generations.map((gen, index) => (
                                            <GenerationCard
                                                key={gen.id || `gen-${index}`}
                                                generation={gen}
                                                onUpdate={handleUpdateGeneration}
                                                onDelete={handleDeleteGeneration}
                                                onIterate={handleIterateGeneration}
                                                onAnimate={handleAnimate}
                                                onEdit={() => {
                                                    setSelectedGeneration(gen);
                                                    setIsEditModalOpen(true);
                                                }}
                                                onRetake={handleRetake}
                                                onInpaint={handleInpaint}
                                                isSelected={selectedGenerationIds.includes(gen.id)}
                                                onToggleSelection={() => toggleGenerationSelection(gen.id)}
                                            />
                                        ))}
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Batch Action Toolbar */}
                        {selectedGenerationIds.length > 0 && (
                            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl px-6 py-3 flex items-center gap-6 animate-in slide-in-from-bottom-4 fade-in duration-200">
                                <span className="text-sm font-medium text-white">
                                    {selectedGenerationIds.length} selected
                                </span>
                                <div className="h-4 w-px bg-white/10" />
                                <div className="flex items-center gap-2">
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) handleBatchMove(e.target.value);
                                        }}
                                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Move to Session...</option>
                                        {sessions.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleBatchCopyLinks}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium transition-colors border border-blue-500/20"
                                        title="Copy Links for JDownloader"
                                    >
                                        <Copy className="w-4 h-4" />
                                        Copy Links
                                    </button>
                                    <button
                                        onClick={handleBatchDelete}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-medium transition-colors border border-red-500/20"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </button>
                                    <div className="h-4 w-px bg-white/10 mx-1" />
                                    <button
                                        onClick={selectedGenerationIds.length === generations.length ? deselectAllGenerations : selectAllGenerations}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium transition-colors border border-white/10"
                                    >
                                        <CheckSquare className="w-4 h-4" />
                                        {selectedGenerationIds.length === generations.length ? "Deselect All" : "Select All"}
                                    </button>
                                    <button
                                        onClick={deselectAllGenerations}
                                        className="p-1.5 text-gray-400 hover:text-white transition-colors ml-1"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                        {/* Fixed Bottom Bar */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent pt-12 pb-8 px-8 z-50 pointer-events-none">
                            <div className="w-full mx-auto pointer-events-auto">
                                <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-2 shadow-2xl flex flex-col gap-2">
                                    {/* Elements Drawer */}
                                    {isElementPickerOpen && (
                                        <div className="px-2 pt-2 pb-1 border-b border-white/5 animate-in slide-in-from-bottom-2 duration-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Reference Elements</span>
                                                <button onClick={() => setIsElementPickerOpen(false)} className="text-gray-500 hover:text-white">
                                                    <ChevronDown className="w-3 h-3" />
                                                </button>
                                            </div>
                                            {elements.length === 0 ? (
                                                <p className="text-xs text-gray-500 italic py-2">No elements uploaded yet.</p>
                                            ) : (
                                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                                    {elements.filter(el => el.projectId === projectId).map((el, index) => {
                                                        const isSelected = selectedElementIds.includes(el.id);
                                                        return (
                                                            <button
                                                                key={el.id || `el-${index}`}
                                                                onClick={() => toggleElement(el)}
                                                                className={clsx(
                                                                    "relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                                                                    isSelected ? "border-blue-500 ring-1 ring-blue-500/50" : "border-transparent opacity-60 hover:opacity-100"
                                                                )}
                                                                title={el.name}
                                                            >
                                                                {el.type === 'video' ? (
                                                                    <video src={el.url} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <img src={el.url} className="w-full h-full object-cover" />
                                                                )}
                                                                {isSelected && (
                                                                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-lg" />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Unified Prompt Bar */}
                                    <div className="flex gap-2 items-end">
                                        <div className="relative flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
                                            <textarea
                                                ref={textareaRef}
                                                value={prompt}
                                                onChange={handlePromptChange}
                                                onKeyDown={handleKeyDown}
                                                onFocus={() => setIsFocused(true)}
                                                onBlur={() => setIsFocused(false)}
                                                placeholder="Describe your shot... (Use @ to reference elements)"
                                                className={clsx(
                                                    "w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 resize-none py-3 px-4 transition-all duration-200 ease-in-out rounded-xl",
                                                    isFocused ? "h-32" : "h-10"
                                                )}
                                                rows={1}
                                            />
                                            {/* Selected Elements Display */}
                                            {selectedElementIds.length > 0 && (
                                                <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
                                                    {elements.filter(e => selectedElementIds.includes(e.id)).map((el, idx) => (
                                                        <div key={el.id || `selected-${idx}`} className="flex items-center gap-1.5 bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs border border-blue-500/30">
                                                            <span className="max-w-[100px] truncate">@{el.name}</span>
                                                            <button
                                                                onClick={() => toggleElement(el)}
                                                                className="hover:text-white"
                                                            >
                                                                X
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 pb-0.5">
                                            <button
                                                onClick={() => setIsPromptBuilderOpen(true)}
                                                className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 rounded-xl text-purple-300 transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/10"
                                                title="Open Smart Prompt Builder"
                                            >
                                                <Wand2 className="w-5 h-5" />
                                            </button>

                                            {/* Style Tools Button */}
                                            <button
                                                type="button"
                                                onClick={() => setIsStyleModalOpen(true)}
                                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap"
                                                title="Style & Settings"
                                            >
                                                <SlidersHorizontal className="w-5 h-5" />
                                                <span className="hidden xl:inline">Style</span>
                                                <div className="flex items-center gap-1 ml-1 pl-2 border-l border-white/10">
                                                    <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-gray-400">{aspectRatio}</span>
                                                </div>
                                            </button>

                                            {/* Element Picker Toggle */}
                                            <button
                                                type="button"
                                                onClick={() => setIsElementPickerOpen(!isElementPickerOpen)}
                                                className={clsx(
                                                    "p-2.5 rounded-xl transition-colors relative border border-white/10",
                                                    isElementPickerOpen ? "bg-white/10 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                                                )}
                                                title="Toggle Elements"
                                            >
                                                <Users className="w-5 h-5" />
                                                {selectedElementIds.length > 0 && (
                                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] flex items-center justify-center rounded-full">
                                                        {selectedElementIds.length}
                                                    </span>
                                                )}
                                            </button>

                                            {/* Mode Switch */}
                                            <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
                                                <button
                                                    onClick={() => {
                                                        setMode('image');
                                                        setEngineConfig(prev => ({ ...prev, provider: 'fal', model: 'fal-ai/flux/dev' }));
                                                    }}
                                                    className={clsx(
                                                        "p-1.5 rounded-lg transition-all",
                                                        mode === 'image' ? "bg-blue-500 text-white shadow-lg" : "text-gray-400 hover:text-white"
                                                    )}
                                                    title="Image Mode"
                                                >
                                                    <ImageIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setMode('video');
                                                        setEngineConfig(prev => ({ ...prev, provider: 'fal', model: 'fal-ai/kling-video/v1/standard/text-to-video' }));
                                                    }}
                                                    className={clsx(
                                                        "p-1.5 rounded-lg transition-all",
                                                        mode === 'video' ? "bg-blue-500 text-white shadow-lg" : "text-gray-400 hover:text-white"
                                                    )}
                                                    title="Video Mode"
                                                >
                                                    <Video className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="w-px h-8 bg-white/10 mx-1" />

                                            {/* Duration Dropdown (Video Only) */}
                                            {(engineConfig.model?.includes('video') || engineConfig.model?.includes('t2v') || engineConfig.model?.includes('wan') || engineConfig.model?.includes('kling') || engineConfig.model?.includes('ltx')) && (
                                                <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-lg border border-white/10 h-10">
                                                    <span className="text-xs text-gray-400 font-medium px-1">Sec</span>
                                                    <select
                                                        value={duration}
                                                        onChange={(e) => setDuration(e.target.value)}
                                                        className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
                                                    >
                                                        <option value="5" className="bg-[#1a1a1a]">5s</option>
                                                        <option value="10" className="bg-[#1a1a1a]">10s</option>
                                                    </select>
                                                </div>
                                            )}

                                            {/* Iterations Dropdown */}
                                            <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-lg border border-white/10 h-10">
                                                <span className="text-xs text-gray-400 font-medium px-1">Qty</span>
                                                <select
                                                    value={variations}
                                                    onChange={(e) => setVariations(parseInt(e.target.value))}
                                                    className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
                                                >
                                                    {[1, 2, 3, 4, 5, 6].map(n => (
                                                        <option key={n} value={n} className="bg-[#1a1a1a]">{n}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Engine Selector */}
                                            <EngineSelectorV2
                                                config={engineConfig}
                                                onChange={setEngineConfig}
                                                mode="image"
                                            />

                                            {/* Generate Button */}
                                            <button
                                                onClick={handleGenerate}
                                                disabled={isGenerating || !prompt?.trim()}
                                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 h-10"
                                            >
                                                {isGenerating ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Generating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-4 h-4" />
                                                        Generate
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Prompt Builder Modal */}
                                    {isPromptBuilderOpen && (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                                            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl relative">
                                                <button
                                                    onClick={() => setIsPromptBuilderOpen(false)}
                                                    className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>

                                                <PromptBuilder
                                                    initialPrompt={prompt}
                                                    modelId={engineConfig.model}
                                                    generationType={mode}
                                                    elements={elements
                                                        .filter(e => selectedElementIds.includes(e.id))
                                                        .map(e => ({
                                                            id: e.id,
                                                            name: e.name,
                                                            type: e.type as any,
                                                            description: e.name,
                                                            imageUrl: e.url,
                                                            consistencyWeight: 0.8
                                                        }))}
                                                    onPromptChange={(newPrompt, negativePrompt) => {
                                                        setPrompt(newPrompt);
                                                        // Negative prompt handling can be added here
                                                    }}
                                                    onRecommendationsChange={(recs) => {
                                                        if (recs?.steps) setSteps(recs.steps);
                                                        if (recs?.cfgScale) setGuidanceScale(recs.cfgScale);
                                                    }}
                                                    onClose={() => setIsPromptBuilderOpen(false)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals and Overlays - Moved outside pointer-events-none container */}
            <DragOverlay>
                {activeDragId ? (
                    <div className="px-4 py-2 bg-transparent border border-blue-400/30 rounded-full shadow-xl backdrop-blur-sm flex items-center justify-center">
                        <p className="text-white text-xs font-medium">Adding Shot...</p>
                    </div>
                ) : null}
            </DragOverlay>

            <StyleSelectorModal
                isOpen={isStyleModalOpen}
                onClose={() => setIsStyleModalOpen(false)}
                onApply={handleStyleApply}
                initialAspectRatio={aspectRatio}
                projectId={projectId}
            />

            <EditElementModal
                element={selectedGeneration ? {
                    id: selectedGeneration.id,
                    name: selectedGeneration.name || selectedGeneration.inputPrompt,
                    type: selectedGeneration.outputs?.[0]?.type || 'image',
                    url: selectedGeneration.outputs?.[0]?.url || '',
                    tags: selectedGeneration.tags || [],
                    session: selectedGeneration.session,
                    metadata: {}
                } : null}
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedGeneration(null);
                }}
                onSave={(id, updates) => {
                    // Map updates back to generation fields
                    const genUpdates: any = {};
                    if (updates.name) genUpdates.name = updates.name;
                    if (updates.tags) genUpdates.tags = updates.tags;
                    if (updates.sessionId !== undefined) genUpdates.sessionId = updates.sessionId;
                    handleUpdateGeneration(id, genUpdates);
                }}
                sessions={sessions}
            />

            <VideoMaskEditor
                isOpen={isRetakeModalOpen}
                onClose={() => setIsRetakeModalOpen(false)}
                videoUrl={retakeVideoUrl || ""}
                onSave={handleSaveRetake}
            />

            <ImageMaskEditor
                isOpen={isImageInpaintModalOpen}
                onClose={() => setIsImageInpaintModalOpen(false)}
                imageUrl={inpaintImageUrl || ""}
                onSave={handleSaveInpaint}
                initialPrompt={prompt}
            />
        </DndContext>
    );
}
