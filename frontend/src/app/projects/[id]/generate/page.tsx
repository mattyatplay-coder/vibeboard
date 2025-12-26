"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { fetchAPI } from "@/lib/api";
import { useParams } from "next/navigation";
import { EngineSelectorV2 } from '@/components/generations/EngineSelectorV2';
import { PromptBuilder } from '@/components/prompts/PromptBuilder';
import {
    Loader2, Image as ImageIcon, Video,
    Wand2, Sparkles, Layers, X,
    ChevronDown, SlidersHorizontal, Users, Trash2, Copy, CheckSquare,
    Database, Music, FilePlus, Tag as TagIcon, Code2, Package, GitBranch,
    Lightbulb
} from 'lucide-react';
import { Element, Generation, Scene } from "@/lib/store";
import { clsx } from "clsx";
import { GenerationCard } from "@/components/generations/GenerationCard";
import { GenerationSearch } from "@/components/generations/GenerationSearch";
import { ShotNavigator, ShotNavigatorRef } from "@/components/generations/ShotNavigator";
import { ElementReferencePicker } from "@/components/storyboard/ElementReferencePicker";
import { StyleSelectorModal, StyleConfig } from "@/components/storyboard/StyleSelectorModal";
import { useSession } from "@/context/SessionContext";
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    pointerWithin,
    useDraggable
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { snapCenterToCursor } from "@dnd-kit/modifiers";

import { SaveElementModal } from "@/components/generations/SaveElementModal";
import { EditElementModal } from "@/components/elements/EditElementModal";
import { VideoMaskEditor } from "@/components/generations/VideoMaskEditor";
import { ImageMaskEditor } from "@/components/generations/ImageMaskEditor";
import { AudioInputModal } from "@/components/generations/AudioInputModal";
import { DataBackupModal } from "@/components/settings/DataBackupModal";
import { TagSelectorModal } from "@/components/generation/TagSelectorModal";
import { CompactMotionSlider } from "@/components/generation/CompactMotionSlider";
import { Tag } from "@/components/tag-system";
import { getModelRequirements } from "@/lib/ModelConstraints";
import { ALL_MODELS, PROVIDER_DEFINITIONS } from "@/lib/ModelRegistry";
import { useEngineConfigStore } from "@/lib/engineConfigStore";
import { costTracker } from "@/lib/CostTracker";
import { usePromptWeighting } from "@/hooks/usePromptWeighting";
import { WeightHintTooltip } from "@/components/prompts/WeightHintTooltip";
import { usePromptVariablesStore, detectUnexpandedVariables } from "@/lib/promptVariablesStore";
import { PromptVariablesPanel } from "@/components/prompts/PromptVariablesPanel";
import { DynamicRatioIcon } from "@/components/ui/DynamicRatioIcon";
import { LensKitSelector } from "@/components/generation/LensKitSelector";
import { LensPreset, LENS_EFFECTS, buildLensPrompt } from "@/data/LensPresets";
import { usePropBinStore } from "@/lib/propBinStore";
import { PropBinPanel } from "@/components/prompts/PropBinPanel";
import { usePromptTreeStore } from "@/lib/promptTreeStore";
import { PromptTreePanel } from "@/components/prompts/PromptTreePanel";
import { useLightingStore } from "@/lib/lightingStore";
import { LightingStage } from "@/components/lighting/LightingStage";

interface PipelineStage {
    id: string;
    type: 'motion' | 'lipsync';
    videoFile?: File | null;
    videoUrl?: string | null;
    audioFile?: File | null;
    audioUrl?: string | null;
    model?: string; // Added for script parsing
    prompt?: string; // Added for script parsing
}

// Draggable Element Thumbnail - for dragging elements into Shot Navigator frame slots
interface DraggableElementThumbnailProps {
    element: Element;
    isSelected: boolean;
    onToggle: () => void;
}

function DraggableElementThumbnail({ element, isSelected, onToggle }: DraggableElementThumbnailProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `element-${element.id}`,
        data: {
            type: 'element',
            element: element,
            imageUrl: element.url || element.fileUrl || element.thumbnail
        }
    });

    const style = transform ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0 : 1,
        zIndex: isDragging ? 100 : undefined,
    } : undefined;

    return (
        <button
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={onToggle}
            className={clsx(
                "relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing",
                isSelected ? "border-blue-500 ring-1 ring-blue-500/50" : "border-transparent opacity-60 hover:opacity-100"
            )}
            title={`${element.name} (drag to Shot Navigator)`}
        >
            {element.type === 'video' ? (
                <video src={element.url} className="w-full h-full object-cover" />
            ) : (
                <img src={element.url || element.fileUrl || element.thumbnail} className="w-full h-full object-cover" />
            )}
            {isSelected && (
                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-lg" />
                </div>
            )}
        </button>
    );
}

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
    const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
    const [selectedGenerationIds, setSelectedGenerationIds] = useState<string[]>([]); // Added missing state
    const [searchResults, setSearchResults] = useState<Generation[] | null>(null); // Semantic search results
    const [searchQuery, setSearchQuery] = useState<string>(''); // Current search query
    const [referenceCreativity, setReferenceCreativity] = useState(0.6); // Default reference strength
    const [elementStrengths, setElementStrengths] = useState<Record<string, number>>({}); // Per-element strength
    const [motionScale, setMotionScale] = useState(0.5); // Motion scale for video models (0-1)
    const { selectedSessionId, sessions } = useSession();

    // Audio State for Avatar Models
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
    const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
    const [isElementPickerOpen, setIsElementPickerOpen] = useState(false);
    const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
    const [isSaveElementModalOpen, setIsSaveElementModalOpen] = useState(false);
    const [isBatchSaveMode, setIsBatchSaveMode] = useState(false);
    const [saveElementData, setSaveElementData] = useState<{ url: string, type: string } | null>(null);



    // Pipeline / Node Workflow State
    const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);

    // Legacy Wan Animation State (replaced by pipeline, but keeping if needed for standalone Animate mode)
    // const [motionVideo, setMotionVideo] = useState<File | null>(null);
    // const [motionVideoUrl, setMotionVideoUrl] = useState<string | null>(null);

    // Drag and Drop state
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [isOverShotNavigator, setIsOverShotNavigator] = useState(false);

    // Shot Navigator ref for calling methods from drag handler
    const shotNavigatorRef = useRef<ShotNavigatorRef>(null);

    // Autocomplete state
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionQuery, setSuggestionQuery] = useState("");
    const [cursorPosition, setCursorPosition] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [styleConfig, setStyleConfig] = useState<StyleConfig | null>(null);

    // Cost tracking - track which generation IDs we've already recorded costs for
    // We store IDs of generations that were already succeeded on first load to avoid double-counting
    const recordedCostIds = useRef<Set<string>>(new Set());
    const initialLoadComplete = useRef<boolean>(false);

    // Prompt Variables: $VariableName expansion
    const { expandPrompt, variables: promptVariables } = usePromptVariablesStore();

    // Prop Bin: #PropName expansion for object consistency
    const { expandPropReferences, props: propBinItems } = usePropBinStore();
    const [isPropBinOpen, setIsPropBinOpen] = useState(false);

    // Prompt Tree: Version control for prompts
    const { addNode: addPromptNode, getTree, activeNodeId: treeActiveNodeId } = usePromptTreeStore();
    const promptTreeNodes = getTree(projectId);
    const [isPromptTreeOpen, setIsPromptTreeOpen] = useState(false);

    // Virtual Gaffer: 3-point lighting designer
    const { lights, isEnabled: lightingEnabled, generatePromptModifier: getLightingModifier, getLightingDescription } = useLightingStore();
    const [isLightingStageOpen, setIsLightingStageOpen] = useState(false);

    // Prompt Weighting: Ctrl/Cmd + Arrow Up/Down to adjust weights (word:1.1)
    const { handleKeyDown: handleWeightingKeyDown, isModifierHeld } = usePromptWeighting({
        value: prompt,
        onChange: setPrompt,
    });

    // Edit Modal State
    const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPromptBuilderOpen, setIsPromptBuilderOpen] = useState(false);
    const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);
    const [isVariablesPanelOpen, setIsVariablesPanelOpen] = useState(false);

    // Lens Kit State
    const [selectedLens, setSelectedLens] = useState<LensPreset | null>(null);
    const [selectedLensEffects, setSelectedLensEffects] = useState<string[]>([]);
    const [isAnamorphic, setIsAnamorphic] = useState(false);

    // Engine State
    const [engineConfig, setEngineConfig] = useState<{ provider: string, model: string }>({
        provider: 'fal',
        model: 'fal-ai/flux/dev'
    });

    // Engine Stacking
    const [enableMotionStacking, setEnableMotionStacking] = useState(false);

    // Model Requirements - computed from current model
    const modelRequirements = React.useMemo(() => {
        const requirements = getModelRequirements(engineConfig.model);
        const needsImage = requirements.some(r => r.input === 'image' || r.input === 'faceReference');
        const needsAudio = requirements.some(r => r.input === 'audio');
        const needsMotionVideo = requirements.some(r => r.input === 'motionVideo');
        const currentModel = ALL_MODELS.find(m => m.id === engineConfig.model);
        const isVideo = currentModel?.type === 'video';
        return { needsImage, needsAudio, needsMotionVideo, isVideo, requirements };
    }, [engineConfig.model]);

    // Auto-update mode when model changes
    React.useEffect(() => {
        const currentModel = ALL_MODELS.find(m => m.id === engineConfig.model);
        if (currentModel) {
            setMode(currentModel.type === 'video' ? 'video' : 'image');
        }
    }, [engineConfig.model]);

    // Sync engine config to global store for SpendingWidget
    const setCurrentConfig = useEngineConfigStore(state => state.setCurrentConfig);
    React.useEffect(() => {
        const currentModel = ALL_MODELS.find(m => m.id === engineConfig.model);
        setCurrentConfig({
            modelId: engineConfig.model,
            duration: duration + 's',
            isVideo: currentModel?.type === 'video' || false,
        });
    }, [engineConfig.model, duration, setCurrentConfig]);

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
            const mapped: Element[] = data.map((e: Record<string, unknown>) => ({
                id: e.id,
                name: e.name,
                type: e.type,
                tags: e.tags || [],
                metadata: e.metadata,
                session: e.session,
                url: (() => {
                    const u = e.fileUrl as string;
                    if (!u) return '';
                    if (u.startsWith('http') || u.startsWith('data:')) return u;
                    return `http://localhost:3001${u.startsWith('/') ? '' : '/'}${u}`;
                })(),
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

            // On first load, just record the IDs of already-succeeded generations
            // so we don't count them as new costs
            if (!initialLoadComplete.current) {
                initialLoadComplete.current = true;
                for (const gen of data as Generation[]) {
                    if (gen.status === 'succeeded') {
                        recordedCostIds.current.add(gen.id);
                    }
                }
            } else {
                // Track costs for newly succeeded generations (after initial load)
                for (const gen of data as Generation[]) {
                    if (gen.status === 'succeeded' && !recordedCostIds.current.has(gen.id)) {
                        // Mark as recorded to prevent duplicate tracking
                        recordedCostIds.current.add(gen.id);

                        // Get model info
                        const modelId = gen.falModel || gen.usedLoras?.model || gen.usedLoras?.falModel;
                        const provider = gen.engine || gen.usedLoras?.provider || 'unknown';
                        const modelInfo = ALL_MODELS.find(m => m.id === modelId);
                        const isVideo = gen.outputs?.[0]?.type === 'video';

                        // Get duration from usedLoras or default
                        const durationSeconds = gen.usedLoras?.duration
                            ? parseInt(String(gen.usedLoras.duration).replace('s', ''), 10)
                            : (isVideo ? 5 : undefined);

                        // Record the cost
                        costTracker.recordGeneration({
                            modelId: modelId || 'unknown',
                            modelName: modelInfo?.name || modelId || 'Unknown Model',
                            provider: provider,
                            type: isVideo ? 'video' : 'image',
                            quantity: gen.outputs?.length || 1,
                            durationSeconds: durationSeconds,
                        });
                    }
                }
            }

            setGenerations(data);
        } catch (error) {
            console.error("Failed to load generations:", error);
        }
    };



    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        try {
            // Expand prompt variables ($VariableName -> actual value)
            let expandedPrompt = expandPrompt(prompt);

            // Expand prop references (#PropName -> prop description)
            expandedPrompt = expandPropReferences(expandedPrompt);

            // Add Lens Kit modifiers to the prompt (using buildLensPrompt helper)
            if (selectedLens || selectedLensEffects.length > 0 || isAnamorphic) {
                const lensPrompt = buildLensPrompt(selectedLens, isAnamorphic, selectedLensEffects);
                if (lensPrompt.positive) {
                    expandedPrompt = `${expandedPrompt}, ${lensPrompt.positive}`;
                }
                // Note: lensPrompt.negative can be added to negative prompt if needed
            }

            // Add Virtual Gaffer lighting modifiers
            if (lightingEnabled && lights.length > 0) {
                const lightingModifier = getLightingModifier();
                if (lightingModifier) {
                    expandedPrompt = `${expandedPrompt}, ${lightingModifier}`;
                }
            }
            // Handle Source Image Upload from Style Config
            let sourceImageUrl = null;
            if (styleConfig?.referenceImage) {
                if (styleConfig.referenceImage instanceof File) {
                    const formData = new FormData();
                    formData.append('file', styleConfig.referenceImage);
                    formData.append('name', 'Source Image');
                    formData.append('type', 'image');

                    try {
                        const res = await fetch(`http://localhost:3001/api/projects/${projectId}/elements`, {
                            method: 'POST',
                            body: formData
                        });
                        if (res.ok) {
                            const data = await res.json();
                            sourceImageUrl = data.fileUrl || data.url;
                        }
                    } catch (e) {
                        console.error("Failed to upload source image", e);
                    }
                } else if (typeof styleConfig.referenceImage === 'string') {
                    sourceImageUrl = styleConfig.referenceImage;
                }
            }

            // Handle Audio Upload (for Avatar models)
            let finalAudioUrl = audioUrl;
            console.log("[GeneratePage] debug - audioFile:", audioFile);
            console.log("[GeneratePage] debug - current audioUrl state:", audioUrl);

            if (audioFile) {
                console.log("[GeneratePage] Uploading audio file...");
                const formData = new FormData();
                formData.append('file', audioFile);
                formData.append('name', 'Audio Source');
                formData.append('type', 'audio');

                try {
                    const res = await fetch(`http://localhost:3001/api/projects/${projectId}/elements`, {
                        method: 'POST',
                        body: formData
                    });
                    if (res.ok) {
                        const data = await res.json();
                        finalAudioUrl = data.fileUrl || data.url;
                        console.log("[GeneratePage] Audio uploaded successfully:", finalAudioUrl);
                        // Update state so we don't re-upload if retrying without changing file
                        setAudioUrl(finalAudioUrl);
                    } else {
                        console.error("[GeneratePage] Audio upload failed with status:", res.status);
                    }
                } catch (e) {
                    console.error("Failed to upload audio file", e);
                }
            } else {
                console.log("[GeneratePage] No audioFile to upload.");
            }

            // Handle Pipeline Assets Upload
            // Iterate stages, upload files if needed, update stage URLs
            const updatedStages = await Promise.all(pipelineStages.map(async (stage) => {
                const updatedStage = { ...stage };

                // Upload Video (Motion Stage)
                if (stage.type === 'motion' && stage.videoFile) {
                    const formData = new FormData();
                    formData.append('file', stage.videoFile);
                    formData.append('name', 'Pipeline Motion Video');
                    formData.append('type', 'video');
                    try {
                        const res = await fetch(`http://localhost:3001/api/projects/${projectId}/elements`, {
                            method: 'POST', body: formData
                        });
                        if (res.ok) {
                            const data = await res.json();
                            updatedStage.videoUrl = data.url;
                        }
                    } catch (e) { console.error("Pipeline video upload failed", e); }
                }

                // Upload Audio (Lip Sync Stage) - Handles Video as Audio Source too
                if (stage.type === 'lipsync' && stage.audioFile) {
                    const formData = new FormData();
                    formData.append('file', stage.audioFile);
                    formData.append('name', 'Pipeline AudioSource');
                    // Determine type based on file (audio or video)
                    const isVideo = stage.audioFile.type.startsWith('video');
                    formData.append('type', isVideo ? 'video' : 'audio');

                    try {
                        const res = await fetch(`http://localhost:3001/api/projects/${projectId}/elements`, {
                            method: 'POST', body: formData
                        });
                        if (res.ok) {
                            const data = await res.json();
                            updatedStage.audioUrl = data.url;
                        }
                    } catch (e) { console.error("Pipeline audio upload failed", e); }
                }
                return updatedStage;
            }));

            // Construct NextStage Chain (Recursive)
            // Chain: Base -> Stage 1 -> Stage 2 ...
            let pipelineConfig: Record<string, unknown> | undefined = undefined;

            // Build from last stage backwards
            for (let i = updatedStages.length - 1; i >= 0; i--) {
                const stage = updatedStages[i];
                let stageOptions: Record<string, unknown> = {};

                if (stage.type === 'motion') {
                    // One-To-All Animation
                    stageOptions = {
                        model: 'fal-ai/one-to-all-animation/14b',
                        inputVideo: stage.videoUrl, // Driving video
                        prompt: prompt, // Use same prompt or allow override? Using base prompt for now.
                    };
                } else if (stage.type === 'lipsync') {
                    // Sync Lips
                    stageOptions = {
                        model: 'fal-ai/sync-lips', // or fal-ai/video-lipsync
                        audioUrl: stage.audioUrl,
                        prompt: prompt,
                    };
                }

                if (pipelineConfig) {
                    stageOptions.nextStage = pipelineConfig;
                }
                pipelineConfig = stageOptions;
            }

            const isVideo = engineConfig.model?.includes('video') || engineConfig.model?.includes('t2v') || engineConfig.model?.includes('i2v');

            // Determine mode:
            // If sourceImageUrl exists -> image_to_image (or image_to_video)
            // If only selectedElementIds (Reference Elements) -> text_to_image (Flux handles refs via IP-Adapter)
            // Video models usually treat input images as start frames (image_to_video)
            const mode = isVideo
                ? (sourceImageUrl || selectedElementIds.length > 0 ? 'image_to_video' : 'text_to_video')
                : (sourceImageUrl ? 'image_to_image' : 'text_to_image');

            await fetchAPI(`/projects/${projectId}/generations`, {
                method: "POST",
                body: JSON.stringify({
                    mode,
                    inputPrompt: expandedPrompt,
                    aspectRatio,
                    sourceElementIds: selectedElementIds,
                    sourceImages: sourceImageUrl ? [sourceImageUrl] : undefined, // Pass source image
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
                    guidanceScale: styleConfig?.guidanceScale || guidanceScale, // Pass selected CFG Scale
                    steps: styleConfig?.steps || steps, // Pass selected Steps
                    duration: duration, // Pass selected Duration
                    negativePrompt: styleConfig?.negativePrompt, // Pass Negative Prompt
                    audioUrl: finalAudioUrl, // Pass audio URL for avatar models
                    referenceStrengths: elementStrengths, // Pass per-element strengths
                    referenceCreativity: referenceCreativity, // Pass global creativity fallback
                    motionScale: motionScale, // Motion scale for video models (dedicated state)
                    // inputVideo: inputVideoUrl, // Only needed for standalone motion mode, if supported handling existed.

                    // Engine Stacking (Pipeline)
                    nextStage: (engineConfig.model === 'fal-ai/vidu/q2/reference-to-video' && pipelineConfig)
                        ? pipelineConfig
                        : undefined
                })
            });

            // Save prompt to Prompt Tree for version control
            addPromptNode(projectId, prompt, {
                negativePrompt: styleConfig?.negativePrompt,
                metadata: {
                    model: engineConfig.model,
                    aspectRatio,
                    lensPreset: selectedLens?.name,
                    selectedElements: selectedElementIds,
                },
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

    // Search handlers
    const handleSearchResults = (results: any[], query: string) => {
        setSearchResults(results as Generation[]);
        setSearchQuery(query);
    };

    const handleClearSearch = () => {
        setSearchResults(null);
        setSearchQuery('');
    };

    // Displayed generations - either search results or all
    const displayedGenerations = useMemo(() => {
        if (searchResults !== null) {
            return searchResults;
        }
        return generations;
    }, [searchResults, generations]);

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
                    styleGuideId: styleConfig?.preset?.id, // Link to preset if active
                    // Using current settings for iteration
                    ...styleConfig
                })
            });
            loadGenerations();
        } catch (error) {
            console.error("Failed to iterate generation:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUseSettings = (generation: Generation) => {
        // Restore Engine Model
        // Fallback to usedLoras if top-level fields are missing/undefined
        const engine = generation.engine || generation.usedLoras?.provider || 'fal';
        const model = generation.falModel || generation.usedLoras?.model || generation.usedLoras?.falModel;

        if (engine && model && typeof model === 'string') {
            setEngineConfig({
                provider: engine,
                model: model,
            });
        }

        // Restore Mode (Image/Video)
        const isVideo = generation.outputs?.[0]?.type === 'video';
        setMode(isVideo ? 'video' : 'image');

        // Restore Duration if Video
        if (isVideo && generation.usedLoras?.duration) {
            setDuration(String(generation.usedLoras.duration));
        }

        // Restore Prompt & Aspect Ratio
        if (generation.inputPrompt) setPrompt(generation.inputPrompt);
        if (generation.aspectRatio) setAspectRatio(generation.aspectRatio);

        // Restore Elements Selection
        if (generation.sourceElementIds) {
            if (Array.isArray(generation.sourceElementIds)) {
                setSelectedElementIds(generation.sourceElementIds);
            } else if (typeof generation.sourceElementIds === 'string') {
                try {
                    const parsed = JSON.parse(generation.sourceElementIds);
                    if (Array.isArray(parsed)) setSelectedElementIds(parsed);
                } catch (e) {
                    console.error("Failed to parse sourceElementIds", e);
                }
            }
        }

        // Restore Reference Strengths
        if (generation.usedLoras?.referenceStrengths) {
            setElementStrengths(generation.usedLoras.referenceStrengths);
        }

        // Restore Main Strength (Denoising Strength for API)
        // Note: generation.usedLoras.strength is 0-1 (Denoising)
        if (generation.usedLoras?.strength !== undefined) {
            setStrength(generation.usedLoras.strength);
        }

        // Restore StyleConfig structure
        // Helper to map string/object to object for dropdowns
        const mapToObj = (val?: string | Record<string, unknown>): { id: string; name: string; value: string } | undefined => {
            if (!val) return undefined;
            if (typeof val === 'object' && typeof val.id === 'string' && typeof val.name === 'string' && typeof val.value === 'string') {
                return val as { id: string; name: string; value: string };
            }
            if (typeof val === 'string') {
                return { id: val, name: val, value: val };
            }
            return undefined;
        };

        const restoredConfig: StyleConfig = {
            loras: generation.usedLoras?.loras?.map((l: Record<string, unknown>) => ({
                id: (l.id as string) || '',
                name: (l.name as string) || '',
                strength: (l.strength as number) || 1.0
            })) || [],
            steps: generation.usedLoras?.steps || 30,
            guidanceScale: generation.usedLoras?.guidanceScale || 7.5,
            negativePrompt: generation.usedLoras?.negativePrompt || "",
            // Restore Sampler/Scheduler if present
            sampler: mapToObj(generation.usedLoras?.sampler),
            scheduler: mapToObj(generation.usedLoras?.scheduler),

            // Preserve other fields empty or default since we can't fully restore them without more data
            inspiration: "",
            preset: null,
            referenceImage: null,
            aspectRatio: generation.aspectRatio || "16:9",
            strength: generation.usedLoras?.strength !== undefined ? (1 - generation.usedLoras.strength) * 100 : undefined,
            seed: generation.usedLoras?.seed
        };
        setStyleConfig(restoredConfig);
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
        } catch (err) {
            console.error("Animation failed:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpscale = async (imageUrl: string, model: string) => {
        setIsGenerating(true);
        try {
            await fetchAPI(`/projects/${projectId}/generations`, {
                method: "POST",
                body: JSON.stringify({
                    mode: "upscale",
                    inputPrompt: `Upscaled: ${prompt || 'upscale'}`,
                    sourceImageUrl: imageUrl,
                    variations: 1,
                    sessionId: selectedSessionId,
                    engine: 'fal',
                    falModel: model, // Use the selected upscale model
                })
            });
            loadGenerations();
        } catch (err) {
            console.error("Upscale failed:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    // Enhance Video (RIFE interpolation + MMAudio)
    const handleEnhanceVideo = async (generationId: string, mode: 'full' | 'audio-only' | 'smooth-only' = 'full') => {
        setIsGenerating(true);
        try {
            const result = await fetchAPI(`/projects/${projectId}/generations/${generationId}/enhance`, {
                method: "POST",
                body: JSON.stringify({
                    skipInterpolation: mode === 'audio-only',
                    skipAudio: mode === 'smooth-only',
                    targetFps: 24,
                    audioPrompt: prompt || "natural ambient sound matching the video content",
                })
            });
            console.log("Enhancement result:", result);
            loadGenerations();
        } catch (err) {
            console.error("Video enhancement failed:", err);
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
        } catch (err) {
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
        } catch (err) {
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
        // Handle prompt weighting (Ctrl/Cmd + Arrow Up/Down)
        handleWeightingKeyDown(e);

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
        el.projectId === projectId && el.name.toLowerCase().includes(suggestionQuery.toLowerCase())
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

    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        // Check if we're over any Shot Navigator droppable
        if (over) {
            const overId = String(over.id);
            const isInShotNavigator = overId.startsWith('shot-') ||
                overId === 'drop-end' ||
                overId === 'drop-empty' ||
                overId === 'shot-navigator-container';

            setIsOverShotNavigator(isInShotNavigator);
        } else {
            setIsOverShotNavigator(false);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);
        setDragOverIndex(null);
        setIsOverShotNavigator(false);

        console.log("Drag End:", { active, over });

        // Handle element drops (from Element strip)
        if (over && active.data.current?.type === 'element') {
            const { shotId, frameType } = over.data.current || {};
            if (shotId && frameType) {
                // Get image URL directly from the element data
                let imageUrl = active.data.current.imageUrl;

                // Ensure URL is absolute
                if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                    imageUrl = `http://localhost:3001${imageUrl}`;
                }

                if (imageUrl && shotNavigatorRef.current) {
                    const element = active.data.current.element;
                    console.log(`Dropping element "${element?.name}" into ${frameType} frame of shot ${shotId}:`, imageUrl);
                    await shotNavigatorRef.current.handleFrameDrop(shotId, frameType, imageUrl);
                } else {
                    console.warn('No image URL found for element:', active.data.current.element?.id);
                }
            }
            return;
        }

        // Handle generation drops
        if (over && active.data.current?.type === 'generation') {
            const generationId = active.id as string;
            const generation = generations.find(g => g.id === generationId);

            // Check if dropping on a frame slot (beginning/ending)
            const { shotId, frameType } = over.data.current || {};
            if (shotId && frameType && generation) {
                // Get the image URL from the generation
                // Priority: 1) image type, 2) video thumbnail, 3) any output url
                let imageUrl: string | null = null;
                const outputs = generation.outputs;
                if (Array.isArray(outputs) && outputs.length > 0) {
                    // First, try to find an image output
                    const imageOutput = outputs.find((o: any) => o.type === 'image');
                    if (imageOutput?.url) {
                        imageUrl = imageOutput.url;
                    } else {
                        // Fall back to video thumbnail or first output URL
                        const firstOutput = outputs[0];
                        imageUrl = firstOutput?.thumbnail_url || firstOutput?.url || null;
                    }
                }

                // Ensure URL is absolute
                if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                    imageUrl = `http://localhost:3001${imageUrl}`;
                }

                if (imageUrl && shotNavigatorRef.current) {
                    console.log(`Dropping generation into ${frameType} frame of shot ${shotId}:`, imageUrl);
                    // Call the ShotNavigator's handleFrameDrop method via ref
                    await shotNavigatorRef.current.handleFrameDrop(shotId, frameType, imageUrl);
                } else {
                    console.warn('No image URL found for generation:', generation.id, outputs);
                }
                return;
            }

            // Legacy: dropping on scene/index for old shot navigator
            const { sceneId, index } = over.data.current || {};

            console.log("Dropping generation:", { generationId, sceneId, index });

            if (sceneId && typeof index === 'number') {
                // Optimistic Update
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
                                const updatedShots = [...((scene.shots as unknown[]) || [])];
                                updatedShots.splice(index, 0, newShot);
                                // Re-index subsequent shots for local state consistency
                                for (let i = index + 1; i < updatedShots.length; i++) {
                                    (updatedShots[i] as Record<string, unknown>).index = i;
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
        const scene = scenes.find(s =>
            (s.shots as Array<{ id: string }>)?.some(shot => shot.id === shotId)
        );
        if (!scene) return;

        // Optimistic Update
        setScenes(prevScenes => prevScenes.map(s => {
            if (s.id === scene.id) {
                return {
                    ...s,
                    shots: (s.shots as Array<{ id: string }>)?.filter(shot => shot.id !== shotId)
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
        const selectedGens = generations.filter(g => selectedGenerationIds.includes(g.id));
        const links = selectedGens.map(g => {
            const url = g.outputs?.[0]?.url;
            if (!url) return null;
            return url.startsWith('http') ? url : `http://localhost:3001${url}`;
        }).filter(Boolean).join('\n');

        if (links) {
            navigator.clipboard.writeText(links);
            // TODO: toast.success(`Copied ${selectedGens.length} links`);
            alert(`Copied ${selectedGenerationIds.length} links to clipboard!`);
        }
    };

    const handleBatchSave = () => {
        if (!selectedGenerationIds.length) return;
        setIsBatchSaveMode(true);
        setIsSaveElementModalOpen(true);
    };

    const processBatchSave = async (commonType: string) => {
        console.log(`Saving ${selectedGenerationIds.length} generations as elements of type: ${commonType}`);

        const promises = selectedGenerationIds.map(async (id) => {
            const gen = generations.find(g => g.id === id);
            if (!gen || !gen.outputs?.[0]) return;

            const output = gen.outputs[0];
            const isVideo = output.type === 'video';
            const url = output.url.startsWith('http') || output.url.startsWith('data:')
                ? output.url
                : `http://localhost:3001${output.url}`;

            try {
                // Use from-generation endpoint if valid URL, OR download/upload if needed.
                // Since these are local URLs (usually), from-generation relies on backend downloading.
                // But backend expects external URL or local path.
                // Let's stick to the FormData upload which was working for batch, but UPDATE THE TYPE.

                const res = await fetch(url);
                const blob = await res.blob();
                const file = new File([blob], `batch-save-${id}.${isVideo ? 'mp4' : 'png'}`, { type: blob.type });

                const formData = new FormData();
                formData.append('file', file);
                formData.append('name', gen.inputPrompt?.slice(0, 50) || 'Saved Generation');
                // Use the CUSTOM TYPE selected by user
                formData.append('type', commonType);

                await fetch(`http://localhost:3001/api/projects/${projectId}/elements`, {
                    method: 'POST',
                    body: formData
                });
            } catch (err) {
                console.error(`Failed to save generation ${id}`, err);
            }
        });

        await Promise.all(promises);
        loadElements();
        deselectAllGenerations();
        setIsBatchSaveMode(false);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <div className="flex-1 flex overflow-hidden">
                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col overflow-hidden relative">
                        {/* Shot Navigator */}
                        <div className="flex-shrink-0 z-20 relative bg-black/50 backdrop-blur-sm border-b border-white/10">
                            <ShotNavigator
                                ref={shotNavigatorRef}
                                projectId={projectId}
                                scenes={scenes}
                                activeDragId={activeDragId}
                                isOverNavigator={isOverShotNavigator}
                                onDropIndexChange={setDragOverIndex}
                                onRemove={handleRemoveShot}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 pb-32">
                            <header className="mb-8">
                                <div className="flex items-center justify-between mb-4">
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
                                </div>

                                {/* Semantic Search Bar */}
                                <div className="max-w-xl">
                                    <GenerationSearch
                                        projectId={projectId}
                                        onSearchResults={handleSearchResults}
                                        onClearSearch={handleClearSearch}
                                    />
                                </div>
                            </header>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Results Column */}
                                <div className="lg:col-span-3">
                                    {/* Dynamic heading based on search state */}
                                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                        {searchQuery ? (
                                            <>
                                                <Database className="w-5 h-5 text-purple-400" />
                                                Results for "{searchQuery}"
                                                <span className="text-sm font-normal text-white/50">
                                                    ({displayedGenerations.length} found)
                                                </span>
                                            </>
                                        ) : (
                                            'Recent Generations'
                                        )}
                                    </h2>
                                    <div
                                        className="grid gap-3"
                                        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
                                    >
                                        {displayedGenerations.map((gen, index) => (
                                            <GenerationCard
                                                key={gen.id || `gen-${index}`}
                                                generation={gen}
                                                elements={elements} // Pass elements map
                                                onUpdate={handleUpdateGeneration}
                                                onDelete={handleDeleteGeneration}
                                                onIterate={handleIterateGeneration}
                                                onUseSettings={handleUseSettings}
                                                onAnimate={handleAnimate}
                                                onUpscale={handleUpscale}
                                                onEdit={() => {
                                                    setSelectedGeneration(gen);
                                                    setIsEditModalOpen(true);
                                                }}
                                                onRetake={handleRetake}
                                                onInpaint={handleInpaint}
                                                onEnhanceVideo={handleEnhanceVideo}
                                                isSelected={selectedGenerationIds.includes(gen.id)}
                                                onToggleSelection={() => toggleGenerationSelection(gen.id)}
                                                onSaveAsElement={(url, type) => {
                                                    setSaveElementData({ url, type });
                                                    setIsBatchSaveMode(false);
                                                    setIsSaveElementModalOpen(true);
                                                }}
                                            />
                                        ))}
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Batch Action Toolbar */}
                        {
                            selectedGenerationIds.length > 0 && (
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
                                            onClick={handleBatchSave}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg text-sm font-medium transition-colors border border-green-500/20"
                                            title="Save selected as elements"
                                        >
                                            <FilePlus className="w-4 h-4" />
                                            Save Elements
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
                            )
                        }
                        {/* Fixed Bottom Bar */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent pt-12 pb-8 px-8 z-50 pointer-events-none">
                            <div className="w-full mx-auto pointer-events-auto">
                                <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-2 shadow-2xl flex flex-col gap-2 relative">
                                    {/* @ Reference Suggestions Dropdown (Horizontal) - Moved here to span full width */}
                                    {showSuggestions && filteredElements.length > 0 && (
                                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1a1a1a] border border-white/20 rounded-xl shadow-2xl z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
                                            <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between bg-white/5">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-3 h-3 text-blue-400" />
                                                    <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                        Filtering: "{suggestionQuery}"
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-gray-500">
                                                    {filteredElements.length} match{filteredElements.length !== 1 ? 'es' : ''}
                                                </span>
                                            </div>
                                            <div className="p-2 flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                                {filteredElements.map((el, idx) => (
                                                    <button
                                                        key={el.id || `suggestion-${idx}`}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault(); // Prevent textarea blur
                                                            selectSuggestion(el);
                                                        }}
                                                        className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 group hover:border-blue-500 hover:scale-105 transition-all"
                                                        title={el.name}
                                                    >
                                                        {el.url ? (
                                                            el.type === 'video' ? (
                                                                <video src={el.url} className="w-full h-full object-cover" muted />
                                                            ) : (
                                                                <img src={el.url} alt={el.name} className="w-full h-full object-cover" />
                                                            )
                                                        ) : (
                                                            <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                                                <Users className="w-6 h-6 text-gray-600" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 flex items-end p-1 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="text-[9px] text-white truncate w-full text-center leading-tight">
                                                                {el.name}
                                                            </span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
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
                                                <div className="flex gap-2 overflow-x-auto pb-2">
                                                    {elements.filter(el => el.projectId === projectId).map((el, index) => (
                                                        <DraggableElementThumbnail
                                                            key={el.id || `el-${index}`}
                                                            element={el}
                                                            isSelected={selectedElementIds.includes(el.id)}
                                                            onToggle={() => toggleElement(el)}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Unified Prompt Bar - Director's Viewfinder */}
                                    <div className="flex gap-2 items-end">
                                        <div className="group relative flex-1 min-w-0 bg-white/5 rounded-xl transition-all">

                                            {/* Focus Brackets - Director's Viewfinder Corners */}
                                            <div className={clsx(
                                                "absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 pointer-events-none transition-all duration-300",
                                                isFocused ? "border-purple-500/70 w-4 h-4" : "border-zinc-600/50"
                                            )} />
                                            <div className={clsx(
                                                "absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 pointer-events-none transition-all duration-300",
                                                isFocused ? "border-purple-500/70 w-4 h-4" : "border-zinc-600/50"
                                            )} />
                                            <div className={clsx(
                                                "absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 pointer-events-none transition-all duration-300",
                                                isFocused ? "border-purple-500/70 w-4 h-4" : "border-zinc-600/50"
                                            )} />
                                            <div className={clsx(
                                                "absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 pointer-events-none transition-all duration-300",
                                                isFocused ? "border-purple-500/70 w-4 h-4" : "border-zinc-600/50"
                                            )} />

                                            {/* Ghost Frame - Aspect Ratio Preview */}
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-xl">
                                                <div className={clsx(
                                                    "border bg-white/[0.015] transition-all duration-500 rounded-sm",
                                                    isFocused ? "opacity-100" : "opacity-40",
                                                    // Dynamic aspect ratio classes
                                                    aspectRatio === "16:9" && "aspect-video w-full max-w-[90%]",
                                                    aspectRatio === "9:16" && "aspect-[9/16] h-[85%]",
                                                    aspectRatio === "1:1" && "aspect-square h-[85%]",
                                                    aspectRatio === "4:3" && "aspect-[4/3] w-full max-w-[85%]",
                                                    aspectRatio === "3:4" && "aspect-[3/4] h-[85%]",
                                                    aspectRatio === "21:9" && "aspect-[21/9] w-full max-w-[95%]",
                                                    aspectRatio === "2.35:1" && "aspect-[2.35/1] w-full max-w-[95%]",
                                                    // Prompt length feedback - changes border color
                                                    prompt.length > 500 ? "border-amber-500/30" :
                                                    prompt.length > 300 ? "border-yellow-500/20" :
                                                    "border-white/10"
                                                )} />
                                            </div>

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
                                            {(selectedElementIds.length > 0 || audioFile) && (
                                                <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
                                                    {/* Audio Pill */}
                                                    {audioFile && (
                                                        <div className="flex items-center gap-1.5 bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-xs border border-purple-500/30 flex-shrink-0 animate-in fade-in zoom-in duration-200">
                                                            <Music className="w-3 h-3" />
                                                            <span className="max-w-[100px] truncate">{audioFile.name}</span>
                                                            <button
                                                                onClick={() => setAudioFile(null)}
                                                                className="hover:text-white transition-colors"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    {elements.filter(e => selectedElementIds.includes(e.id)).map((el, idx) => (
                                                        <div key={el.id || `selected-${idx}`} className="flex items-center gap-1.5 bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs border border-blue-500/30 shrink-0">
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

                                        <div className="flex items-center gap-1.5 shrink-0 h-10 relative">
                                            {/* 1. Smart Prompt (Wand) */}
                                            <button
                                                onClick={() => setIsPromptBuilderOpen(true)}
                                                className="h-10 w-10 flex items-center justify-center bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl text-purple-400 transition-all hover:scale-105"
                                                title="Smart Prompt Builder"
                                            >
                                                <Wand2 className="w-5 h-5" />
                                            </button>

                                            {/* 2. Tag Selector */}
                                            <button
                                                onClick={() => setIsTagSelectorOpen(true)}
                                                className="h-10 w-10 flex items-center justify-center bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-amber-400 transition-all hover:scale-105"
                                                title="Add Tags to Prompt"
                                            >
                                                <TagIcon className="w-5 h-5" />
                                            </button>

                                            {/* 2b. Prompt Variables */}
                                            <button
                                                onClick={() => setIsVariablesPanelOpen(true)}
                                                className={clsx(
                                                    "h-10 px-2.5 flex items-center justify-center gap-1.5 border rounded-xl transition-all hover:scale-105",
                                                    promptVariables.length > 0
                                                        ? "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20 text-cyan-400"
                                                        : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-400"
                                                )}
                                                title="Prompt Variables ($MainLook syntax)"
                                            >
                                                <Code2 className="w-4 h-4" />
                                                <span className="text-xs font-medium">${promptVariables.length}</span>
                                            </button>

                                            {/* 2c. Lens Kit - Focal Length & Anamorphic */}
                                            <LensKitSelector
                                                selectedLens={selectedLens}
                                                selectedEffects={selectedLensEffects}
                                                isAnamorphic={isAnamorphic}
                                                onLensChange={setSelectedLens}
                                                onEffectsChange={setSelectedLensEffects}
                                                onAnamorphicChange={(value) => {
                                                    setIsAnamorphic(value);
                                                    // Auto-lock to 21:9 aspect ratio when anamorphic is enabled
                                                    if (value) {
                                                        setAspectRatio('21:9');
                                                    }
                                                }}
                                                onAspectRatioLock={(ratio) => setAspectRatio(ratio)}
                                            />

                                            {/* 2d. Prop Bin - Object Consistency */}
                                            <button
                                                onClick={() => setIsPropBinOpen(true)}
                                                className={clsx(
                                                    "h-10 px-2.5 flex items-center justify-center gap-1.5 border rounded-xl transition-all hover:scale-105",
                                                    propBinItems.length > 0
                                                        ? "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400"
                                                        : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-400"
                                                )}
                                                title="Prop Bin (#PropName syntax for object consistency)"
                                            >
                                                <Package className="w-4 h-4" />
                                                <span className="text-xs font-medium">#{propBinItems.length}</span>
                                            </button>

                                            {/* 2e. Prompt Tree - Version Control */}
                                            <button
                                                onClick={() => setIsPromptTreeOpen(true)}
                                                className={clsx(
                                                    "h-10 px-2.5 flex items-center justify-center gap-1.5 border rounded-xl transition-all hover:scale-105",
                                                    promptTreeNodes.length > 0
                                                        ? "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20 text-purple-400"
                                                        : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-400"
                                                )}
                                                title="Prompt Tree (Version Control for Prompts)"
                                            >
                                                <GitBranch className="w-4 h-4" />
                                                <span className="text-xs font-medium">{promptTreeNodes.length}</span>
                                            </button>

                                            {/* 3. Style & Aspect Ratio - with Dynamic Icon */}
                                            <button
                                                onClick={() => setIsStyleModalOpen(true)}
                                                className="h-10 flex items-center gap-2 px-3 rounded-xl border bg-black/20 border-white/5 text-gray-400 hover:bg-white/5 hover:text-white transition-all group"
                                            >
                                                <SlidersHorizontal className="w-4 h-4" />
                                                <span className="text-sm font-medium hidden sm:inline">Style</span>
                                                <div className="h-4 w-px bg-white/10 mx-1" />
                                                {/* Dynamic Ratio Icon - morphs to show actual aspect ratio */}
                                                <DynamicRatioIcon
                                                    ratio={aspectRatio}
                                                    size="sm"
                                                    className="text-gray-400 group-hover:text-white transition-colors"
                                                />
                                                <span className="text-[10px] text-gray-500 font-mono">{aspectRatio}</span>
                                            </button>

                                            {/* Virtual Gaffer: 3-Point Lighting Designer */}
                                            <button
                                                onClick={() => setIsLightingStageOpen(true)}
                                                className={clsx(
                                                    "h-10 flex items-center gap-2 px-3 rounded-xl transition-all border",
                                                    lightingEnabled && lights.length > 0
                                                        ? "bg-amber-500/20 border-amber-500/30 text-amber-300"
                                                        : "bg-black/20 border-white/5 text-gray-400 hover:bg-white/5 hover:text-white"
                                                )}
                                                title={lightingEnabled ? getLightingDescription() : "Virtual Gaffer - Lighting Designer"}
                                            >
                                                <Lightbulb className="w-4 h-4" />
                                                <span className="text-sm font-medium hidden sm:inline">Light</span>
                                                {lightingEnabled && lights.length > 0 && (
                                                    <span className="text-[10px] text-amber-400 ml-1">{lights.length}</span>
                                                )}
                                            </button>

                                            {/* 3. Reference Elements (Users) */}
                                            <button
                                                onClick={() => setIsElementPickerOpen(!isElementPickerOpen)}
                                                className={clsx(
                                                    "h-10 w-10 flex items-center justify-center rounded-xl transition-all relative border",
                                                    isElementPickerOpen
                                                        ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                                                        : "bg-black/20 border-white/5 text-gray-400 hover:bg-white/5 hover:text-white"
                                                )}
                                            >
                                                <Users className="w-5 h-5" />
                                                {selectedElementIds.length > 0 && (
                                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] flex items-center justify-center rounded-full">
                                                        {selectedElementIds.length}
                                                    </span>
                                                )}
                                            </button>

                                            {/* 5. Motion Scale (Video Models Only) */}
                                            {mode === 'video' && (
                                                <CompactMotionSlider
                                                    value={motionScale}
                                                    onChange={setMotionScale}
                                                    engineType={
                                                        engineConfig.model.includes('kling') ? 'kling' :
                                                            engineConfig.model.includes('veo') ? 'veo' :
                                                                engineConfig.model.includes('wan') ? 'wan' :
                                                                    engineConfig.model.includes('luma') ? 'luma' :
                                                                        engineConfig.model.includes('ltx') ? 'ltx' :
                                                                            'other'
                                                    }
                                                />
                                            )}

                                            {/* 6. Model Selector Pill */}
                                            <div className="min-w-[160px]">
                                                <EngineSelectorV2
                                                    selectedProvider={engineConfig.provider}
                                                    selectedModel={engineConfig.model}
                                                    onSelect={(provider, model) => setEngineConfig({ provider, model })}
                                                    mode={mode}
                                                    variant="compact"
                                                    quantity={variations}
                                                    onQuantityChange={setVariations}
                                                    duration={duration}
                                                    onDurationChange={setDuration}
                                                    audioFile={audioFile}
                                                    onAudioChange={setAudioFile}
                                                />
                                            </div>

                                            {/* Pipeline Node Workflow (Vidu Q2 Only) */}
                                            {engineConfig.model === 'fal-ai/vidu/q2/reference-to-video' && (
                                                <div className="absolute bottom-full right-0 mb-2 w-72 flex flex-col gap-3 p-3 bg-[#1a1a1a] rounded-xl border border-white/10 z-50 shadow-xl">
                                                    <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
                                                        <div className="flex items-center gap-2">
                                                            <Layers className="w-4 h-4 text-blue-400" />
                                                            <span>Generation Pipeline</span>
                                                        </div>
                                                    </div>

                                                    {/* Base Stage (Implicit Vidu) */}
                                                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-200 flex items-center gap-2">
                                                        <span className="font-bold">1. Base:</span> Vidu Q2 (Reference-to-Video)
                                                    </div>

                                                    {/* Dynamic Stages */}
                                                    {pipelineStages.map((stage, idx) => (
                                                        <div key={stage.id} className="relative p-3 bg-white/5 border border-white/10 rounded-lg animate-in slide-in-from-left-2 fade-in">
                                                            <div className="absolute top-2 right-2">
                                                                <button
                                                                    onClick={() => setPipelineStages(prev => prev.filter(s => s.id !== stage.id))}
                                                                    className="text-gray-500 hover:text-red-400"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                            <div className="text-xs font-bold text-gray-300 mb-2">
                                                                {idx + 2}. {stage.type === 'motion' ? "Motion (One-To-All)" : "Lip Sync (SyncLabs)"}
                                                            </div>

                                                            {stage.type === 'motion' && (
                                                                <div className="flex flex-col gap-2">
                                                                    <label className="text-[10px] text-gray-400 uppercase">Driving Video</label>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => document.getElementById(`stage-video-${stage.id}`)?.click()}
                                                                            className={clsx(
                                                                                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed transition-all",
                                                                                stage.videoFile
                                                                                    ? "bg-green-500/10 border-green-500/50 text-green-400"
                                                                                    : "bg-white/5 border-white/20 text-gray-400 hover:border-white/40"
                                                                            )}
                                                                        >
                                                                            <Video className="w-3 h-3" />
                                                                            <span className="text-xs truncate max-w-[150px]">
                                                                                {stage.videoFile ? stage.videoFile.name : "Upload Video"}
                                                                            </span>
                                                                        </button>
                                                                        <input
                                                                            id={`stage-video-${stage.id}`}
                                                                            type="file"
                                                                            accept="video/mp4,video/quicktime,video/webm"
                                                                            className="hidden"
                                                                            onChange={(e) => {
                                                                                if (e.target.files?.[0]) {
                                                                                    const file = e.target.files[0];
                                                                                    setPipelineStages(prev => prev.map(s => s.id === stage.id ? { ...s, videoFile: file } : s));
                                                                                }
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {stage.type === 'lipsync' && (
                                                                <div className="flex flex-col gap-2">
                                                                    <label className="text-[10px] text-gray-400 uppercase">Driving Audio or Video</label>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => document.getElementById(`stage-audio-${stage.id}`)?.click()}
                                                                            className={clsx(
                                                                                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed transition-all",
                                                                                stage.audioFile
                                                                                    ? "bg-purple-500/10 border-purple-500/50 text-purple-400"
                                                                                    : "bg-white/5 border-white/20 text-gray-400 hover:border-white/40"
                                                                            )}
                                                                        >
                                                                            <Music className="w-3 h-3" />
                                                                            <span className="text-xs truncate max-w-[150px]">
                                                                                {stage.audioFile ? stage.audioFile.name : "Upload Audio/Video"}
                                                                            </span>
                                                                        </button>
                                                                        <input
                                                                            id={`stage-audio-${stage.id}`}
                                                                            type="file"
                                                                            accept="audio/*,video/*"
                                                                            className="hidden"
                                                                            onChange={(e) => {
                                                                                if (e.target.files?.[0]) {
                                                                                    const file = e.target.files[0];
                                                                                    setPipelineStages(prev => prev.map(s => s.id === stage.id ? { ...s, audioFile: file } : s));
                                                                                }
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="absolute -left-1.5 top-1/2 -mt-1 w-3 h-px bg-white/20" />
                                                        </div>
                                                    ))}

                                                    <div className="flex gap-2 mt-2">
                                                        <button
                                                            onClick={() => setPipelineStages(prev => [...prev, { id: Date.now().toString(), type: 'motion' }])}
                                                            className="flex-1 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white border border-white/10 transition-colors flex items-center justify-center gap-1"
                                                            title="Add One-To-All Motion Stage"
                                                        >
                                                            <Video className="w-3 h-3" /> + Motion
                                                        </button>
                                                        <button
                                                            onClick={() => setPipelineStages(prev => [...prev, { id: Date.now().toString(), type: 'lipsync' }])}
                                                            className="flex-1 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white border border-white/10 transition-colors flex items-center justify-center gap-1"
                                                            title="Add SyncLabs Lip Sync Stage"
                                                        >
                                                            <Music className="w-3 h-3" /> + Lip Sync
                                                        </button>
                                                    </div>
                                                </div>
                                            )}


                                            {/* 5. Generate Button */}
                                            <button
                                                onClick={handleGenerate}
                                                disabled={isGenerating || !prompt?.trim()}
                                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:grayscale text-white px-4 rounded-xl font-medium h-10 flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
                                            >
                                                {isGenerating ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span className="hidden sm:inline">Generating...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Generate</span>
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
                                                    elements={elements.map(e => ({
                                                        id: e.id,
                                                        name: e.name,
                                                        type: (e.type === 'image' ? 'style' : e.type) as 'character' | 'prop' | 'location' | 'style',
                                                        description: e.name,
                                                        imageUrl: e.url,
                                                        consistencyWeight: elementStrengths[e.id] || 0.8
                                                    }))}
                                                    selectedElementIds={selectedElementIds}
                                                    initialLoRAs={styleConfig?.loras?.map((l) => ({
                                                        id: l.id,
                                                        name: l.name,
                                                        triggerWords: l.triggerWords || (l.triggerWord ? [l.triggerWord] : []),
                                                        type: 'style' as const,
                                                        baseModel: l.baseModel || 'Unknown',
                                                        recommendedStrength: l.strength || 0.8,
                                                        useCount: 0
                                                    }))}
                                                    initialImages={styleConfig?.referenceImage && typeof styleConfig.referenceImage === 'string'
                                                        ? [styleConfig.referenceImage]
                                                        : []}
                                                    onPromptChange={(newPrompt, _negativePrompt) => {
                                                        setPrompt(newPrompt);
                                                        // Negative prompt handling can be added here
                                                    }}
                                                    onRecommendationsChange={(recs) => {
                                                        if (recs?.steps) setSteps(recs.steps);
                                                        if (recs?.cfgScale) setGuidanceScale(recs.cfgScale);
                                                    }}
                                                    onScriptParsed={(parsed: Record<string, unknown>) => {
                                                        // 1. Set Visual Prompt
                                                        if (typeof parsed.visual === 'string') setPrompt(parsed.visual);

                                                        // 2. Configure Pipeline Stages
                                                        const newStages: PipelineStage[] = [];

                                                        // Motion Stage
                                                        if (parsed.motion && typeof parsed.motion === 'string') {
                                                            newStages.push({
                                                                id: crypto.randomUUID(),
                                                                type: 'motion',
                                                                model: 'fal-ai/one-to-all-animation/14b',
                                                                prompt: parsed.motion,
                                                                videoUrl: undefined
                                                            });
                                                        }

                                                        // Lip Sync Stage (Dialogue)
                                                        if (parsed.audio && typeof parsed.audio === 'string') {
                                                            newStages.push({
                                                                id: crypto.randomUUID(),
                                                                type: 'lipsync',
                                                                model: 'fal-ai/sync-lips',
                                                                prompt: parsed.audio, // Storing dialogue as prompt reference
                                                                audioUrl: undefined // User must provide audio
                                                            });
                                                        }

                                                        setPipelineStages(newStages);
                                                        setIsPromptBuilderOpen(false);

                                                        // Optional: Auto-switch engine if needed, but respecting user choice is safer.
                                                        // Notify user? (Toast not available, relying on UI update)
                                                    }}
                                                    onClose={() => setIsPromptBuilderOpen(false)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div >
                </div >
            </div >

            {/* Modals and Overlays - Moved outside pointer-events-none container */}
            {/* Small thumbnail follows cursor while dragging - maintains aspect ratio, cursor centered */}
            <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
                {activeDragId ? (() => {
                    // Check if dragging an element (starts with "element-")
                    const isElement = typeof activeDragId === 'string' && activeDragId.startsWith('element-');

                    if (isElement) {
                        // Element drag overlay
                        const elementId = activeDragId.replace('element-', '');
                        const element = elements.find(e => e.id === elementId);
                        const rawUrl = element?.url || element?.fileUrl || element?.thumbnail;
                        const mediaUrl = rawUrl
                            ? (rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : `http://localhost:3001${rawUrl}`)
                            : undefined;

                        // Elements are typically square, use 64x64
                        const size = 64;
                        return (
                            <div
                                className="rounded-lg overflow-hidden border-2 border-purple-500 shadow-xl bg-black pointer-events-none"
                                style={{ width: size, height: size }}
                            >
                                {mediaUrl ? (
                                    <img src={mediaUrl} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full bg-white/10" />
                                )}
                            </div>
                        );
                    }

                    // Generation drag overlay
                    const generation = generations.find(g => g.id === activeDragId);
                    const output = generation?.outputs?.[0];
                    const rawUrl = output?.thumbnail_url || output?.url;
                    const mediaUrl = rawUrl
                        ? (rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : `http://localhost:3001${rawUrl}`)
                        : undefined;

                    // Calculate aspect ratio from generation or use 16:9 default
                    // Thumbnail max size: 80px on longest edge
                    const maxSize = 80;
                    const genAspect = generation?.aspectRatio || aspectRatio || '16:9';
                    const [w, h] = genAspect.split(':').map(Number);
                    const isLandscape = w >= h;
                    const thumbWidth = isLandscape ? maxSize : Math.round(maxSize * (w / h));
                    const thumbHeight = isLandscape ? Math.round(maxSize * (h / w)) : maxSize;

                    return (
                        <div
                            className="rounded-lg overflow-hidden border-2 border-blue-500 shadow-xl bg-black pointer-events-none"
                            style={{ width: thumbWidth, height: thumbHeight }}
                        >
                            {mediaUrl ? (
                                <img src={mediaUrl} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full bg-white/10" />
                            )}
                        </div>
                    );
                })() : null}
            </DragOverlay>

            <StyleSelectorModal
                isOpen={isStyleModalOpen}
                onClose={() => setIsStyleModalOpen(false)}
                onApply={handleStyleApply}
                initialAspectRatio={aspectRatio}
                projectId={projectId}
                config={styleConfig || undefined} // Pass current config to sync modal state
                currentModelId={engineConfig.model} // For LoRA base model auto-filtering
                isAnamorphicLocked={isAnamorphic} // Lock to 21:9 when anamorphic glass is enabled
            />

            {/* Virtual Gaffer: 3-Point Lighting Designer Stage */}
            <LightingStage
                isOpen={isLightingStageOpen}
                onClose={() => setIsLightingStageOpen(false)}
            />

            <EditElementModal
                element={selectedGeneration ? {
                    id: selectedGeneration.id,
                    projectId: projectId,
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
                    const genUpdates: Record<string, unknown> = {};
                    if (updates.name) genUpdates.name = updates.name;
                    if (updates.tags) genUpdates.tags = updates.tags;
                    if (updates.sessionId !== undefined) genUpdates.sessionId = updates.sessionId;
                    handleUpdateGeneration(id, genUpdates);
                }}
                sessions={sessions}
            />
            <ElementReferencePicker
                projectId={projectId}
                isOpen={isElementPickerOpen}
                onClose={() => setIsElementPickerOpen(false)}
                selectedElements={selectedElementIds}
                onSelectionChange={setSelectedElementIds}
                creativity={referenceCreativity}
                onCreativityChange={setReferenceCreativity}
                elementStrengths={elementStrengths}
                onStrengthChange={(id, val) => setElementStrengths(prev => ({ ...prev, [id]: val }))}
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

            <AudioInputModal
                isOpen={isAudioModalOpen}
                onClose={() => setIsAudioModalOpen(false)}
                currentFile={audioFile}
                onAudioChange={async (file) => {
                    setAudioFile(file);
                    if (file) {
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('name', file.name);
                        formData.append('type', 'audio');

                        try {
                            const res = await fetch(`http://localhost:3001/api/projects/${projectId}/elements`, {
                                method: 'POST',
                                body: formData
                            });
                            if (!res.ok) throw new Error('Upload failed');
                            const data = await res.json();
                            // elementController returns { url: ... } which is the full URL or relative path
                            // If it returns relative path, we prepend localhost.
                            // But elementController.ts:86 calls parseElementJsonFields which handles full URL.
                            // Let's assume data.url is correct.
                            setAudioUrl(data.url);
                            console.log("Audio uploaded, url:", data.url);
                        } catch (e) {
                            console.error("Audio upload failed", e);
                        }
                    } else {
                        setAudioUrl(null);
                    }
                }}
            />


            <SaveElementModal
                isOpen={isSaveElementModalOpen}
                isBatch={isBatchSaveMode}
                onClose={() => {
                    setIsSaveElementModalOpen(false);
                    setIsBatchSaveMode(false);
                }}
                onSave={async (name, type) => {
                    if (isBatchSaveMode) {
                        await processBatchSave(type);
                    } else {
                        // Single Save
                        if (!saveElementData) return;
                        try {
                            const res = await fetch(`http://localhost:3001/api/projects/${projectId}/elements/from-generation`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    url: saveElementData.url,
                                    type: type, // Use Selected/Custom Type
                                    name
                                })
                            });
                            if (!res.ok) throw new Error('Failed to save element');
                            loadElements();
                        } catch (e) {
                            console.error("Failed to save element", e);
                        }
                    }
                }}
            />

            <TagSelectorModal
                isOpen={isTagSelectorOpen}
                onClose={() => setIsTagSelectorOpen(false)}
                onTagsApply={(tags: Tag[]) => {
                    const tagText = tags
                        .map(t => t.promptKeyword || t.name.toLowerCase())
                        .join(', ');
                    setPrompt(prev => prev.trim() ? `${prev.trim()}, ${tagText}` : tagText);
                    setIsTagSelectorOpen(false);
                }}
            />

            {/* Prompt Variables Panel */}
            <PromptVariablesPanel
                isOpen={isVariablesPanelOpen}
                onClose={() => setIsVariablesPanelOpen(false)}
            />

            {/* Prop Bin Panel */}
            <PropBinPanel
                isOpen={isPropBinOpen}
                onClose={() => setIsPropBinOpen(false)}
            />

            {/* Prompt Tree Panel */}
            <PromptTreePanel
                isOpen={isPromptTreeOpen}
                onClose={() => setIsPromptTreeOpen(false)}
                projectId={projectId}
                onLoadPrompt={(loadedPrompt, negPrompt) => {
                    setPrompt(loadedPrompt);
                    if (negPrompt && styleConfig) {
                        setStyleConfig({ ...styleConfig, negativePrompt: negPrompt });
                    }
                }}
            />

            {/* Weight Hint Tooltip - Shows when Cmd/Ctrl is held */}
            <WeightHintTooltip isVisible={isModifierHeld && isFocused} />

        </DndContext >
    );
}
