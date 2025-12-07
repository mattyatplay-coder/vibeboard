"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { Plus, Sparkles, Copy, Trash2, X, CheckSquare, FastForward, Palette, Play, Video } from "lucide-react";
import { GenerationPickerModal } from "@/components/storyboard/GenerationPickerModal";
import { SceneGeneratorModal } from "@/components/storyboard/SceneGeneratorModal";
import { StoryboardHeader } from "@/components/storyboard/StoryboardHeader";
import { StyleSelectorModal } from "@/components/storyboard/StyleSelectorModal";
import { CastModal } from "@/components/storyboard/CastModal";
import { ShotStyleEditorModal } from "@/components/storyboard/ShotStyleEditorModal";
import { EditElementModal } from "@/components/elements/EditElementModal";
import { FoundationImagePanel } from "@/components/storyboard/FoundationImagePanel";
import { ShotActionsPanel } from "@/components/storyboard/ShotActionsPanel";
import { Generation } from "@/lib/store";
import { useSession } from "@/context/SessionContext";
import { clsx } from "clsx";

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export default function StoryboardPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    const { selectedSessionId, sessions } = useSession();
    const [scenes, setScenes] = useState<any[]>([]);

    // Edit Modal State
    const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Picker state
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

    useEffect(() => {
        if (projectId) {
            loadScenes();
        }
    }, [projectId, selectedSessionId]);

    const loadScenes = async () => {
        try {
            const endpoint = selectedSessionId
                ? `/projects/${projectId}/scenes?sessionId=${selectedSessionId}`
                : `/projects/${projectId}/scenes`;
            const data = await fetchAPI(endpoint);
            setScenes(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateScene = async () => {
        const name = window.prompt("Enter scene name:");
        if (!name) return;

        try {
            await fetchAPI(`/projects/${projectId}/scenes`, {
                method: "POST",
                body: JSON.stringify({
                    name,
                    sessionId: selectedSessionId || undefined
                })
            });
            loadScenes();
        } catch (err) {
            console.error(err);
            alert("Failed to create scene");
        }
    };

    const openPicker = (sceneId: string) => {
        setActiveSceneId(sceneId);
        setIsPickerOpen(true);
    };

    const handleAddShot = async (generation: any) => {
        if (!activeSceneId) return;

        try {
            // Calculate next index (simple append)
            const scene = scenes.find(s => s.id === activeSceneId);
            const nextIndex = (scene?.shots?.length || 0) + 1;

            await fetchAPI(`/projects/${projectId}/scenes/${activeSceneId}/shots`, {
                method: "POST",
                body: JSON.stringify({
                    generationId: generation.id,
                    index: nextIndex
                })
            });

            setIsPickerOpen(false);
            setActiveSceneId(null);
            loadScenes();
        } catch (err) {
            console.error(err);
            alert("Failed to add shot");
        }
    };

    // Scene Generator state
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [generatorSceneId, setGeneratorSceneId] = useState<string | null>(null);

    const openGenerator = (sceneId: string) => {
        setGeneratorSceneId(sceneId);
        setIsGeneratorOpen(true);
    };

    const handleGenerateScene = async (config: any) => {
        if (!generatorSceneId) return;

        console.log("Generating scene with config:", config);

        // Construct the full prompt
        let fullPrompt = config.prompt;

        // Append technical details
        const technicalDetails = [];
        if (config.shotTypes.length) technicalDetails.push(`Shot types: ${config.shotTypes.join(', ')}`);
        if (config.cameraAngles.length) technicalDetails.push(`Angles: ${config.cameraAngles.join(', ')}`);
        if (config.location) technicalDetails.push(`Location: ${config.location}`);
        if (config.lighting) technicalDetails.push(`Lighting: ${config.lighting}`);

        if (technicalDetails.length > 0) {
            fullPrompt += ` -- ${technicalDetails.join(' | ')}`;
        }

        // Append Style Suffix (Hidden Prompt)
        if (selectedStyle && selectedStyle.promptSuffix) {
            fullPrompt += selectedStyle.promptSuffix;
        }

        try {
            // Create a generation for the scene
            // For now, we'll create one generation per "variation" requested
            // In a real app, we might want a batch endpoint

            const promises = [];
            for (let i = 0; i < config.variations; i++) {
                // Process files if present
                let startFrameBase64 = undefined;
                let endFrameBase64 = undefined;
                let inputVideoBase64 = undefined;

                if (config.startFrame) startFrameBase64 = await fileToBase64(config.startFrame);
                if (config.endFrame) endFrameBase64 = await fileToBase64(config.endFrame);
                if (config.inputVideo) inputVideoBase64 = await fileToBase64(config.inputVideo);

                promises.push(fetchAPI(`/projects/${projectId}/generations`, {
                    method: "POST",
                    body: JSON.stringify({
                        mode: config.mode || "text_to_image",
                        inputPrompt: fullPrompt,
                        aspectRatio: config.aspectRatio,
                        variations: 1,
                        startFrame: startFrameBase64,
                        endFrame: endFrameBase64,
                        inputVideo: inputVideoBase64
                    })
                }).then(async (gen) => {
                    // Automatically add the generated shot to the scene
                    // We need to fetch the scene to get the current shot count, but for parallel requests this is tricky.
                    // For simplicity, we'll just add them. The backend might need to handle ordering or we accept they might be out of order.
                    // A better approach would be a specific "generate scene" endpoint.

                    // For this MVP, we will just create the generation. 
                    // The user can then drag it in, OR we can try to append it.

                    // Let's try to append it to the scene immediately
                    const scene = scenes.find(s => s.id === generatorSceneId);
                    const nextIndex = (scene?.shots?.length || 0) + i + 1;

                    await fetchAPI(`/projects/${projectId}/scenes/${generatorSceneId}/shots`, {
                        method: "POST",
                        body: JSON.stringify({
                            generationId: gen.id,
                            index: nextIndex
                        })
                    });
                }));
            }

            await Promise.all(promises);
            loadScenes();
            alert(`Generated ${config.variations} shots for the scene!`);

        } catch (err) {
            console.error("Failed to generate scene", err);
            alert("Failed to generate scene");
        }

        setIsGeneratorOpen(false);
        setGeneratorSceneId(null);
    };

    // Header state
    const [aspectRatio, setAspectRatio] = useState("16:9");
    const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
    const [isCastModalOpen, setIsCastModalOpen] = useState(false);

    const [selectedStyle, setSelectedStyle] = useState<any>(null);

    const handleStyleApply = (config: any) => {
        console.log("Style applied:", config);
        setSelectedStyle(config);
    };

    const handlePreview = () => {
        console.log("Preview clicked");
        alert("Preview functionality coming soon!");
    };

    // Shot Editing
    const [editingShot, setEditingShot] = useState<any>(null);

    const handleUpdateShot = async (shotId: string, newPrompt: string) => {
        if (!editingShot || !editingShot.generationId) return;

        try {
            await fetchAPI(`/projects/${projectId}/generations/${editingShot.generationId}`, {
                method: 'PATCH',
                body: JSON.stringify({ inputPrompt: newPrompt })
            });

            // Reload scenes to reflect changes
            loadScenes();
        } catch (err) {
            console.error("Failed to update shot", err);
            alert("Failed to update shot style");
        }
    };

    // Batch Selection State
    const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);

    // Foundation Image State
    const [foundationImage, setFoundationImage] = useState<string | File | null>(null);
    const [styleConfig, setStyleConfig] = useState({
        aesthetic: "",
        lighting: "",
        colorPalette: "",
        cameraDirection: ""
    });

    // Active Shot for V2V Actions
    const [activeShotForActions, setActiveShotForActions] = useState<any>(null);

    // Generate Foundation Image
    const handleGenerateFoundation = async (prompt: string) => {
        try {
            const response = await fetchAPI(`/projects/${projectId}/generations`, {
                method: "POST",
                body: JSON.stringify({
                    mode: "text_to_image",
                    inputPrompt: prompt,
                    aspectRatio: aspectRatio,
                    variations: 1
                })
            });
            // The foundation image will be set when the generation completes
            // For now, we'll poll or use the first output
            if (response.outputs?.[0]?.url) {
                setFoundationImage(response.outputs[0].url);
            }
        } catch (err) {
            console.error("Failed to generate foundation image", err);
            alert("Failed to generate foundation image");
        }
    };

    // Grab Last Frame from a shot's video
    const handleGrabLastFrame = async (shotId: string) => {
        const shot = scenes.flatMap(s => s.shots || []).find((s: any) => s.id === shotId);
        if (!shot?.generation?.outputs?.[0]) return;

        const videoUrl = shot.generation.outputs[0].url;
        // In a real implementation, this would extract the last frame server-side
        // For now, we'll create a new generation using the video's last frame
        alert(`Grab Last Frame from ${videoUrl} - This would extract the last frame and use it as a starting image for the next generation.`);
    };

    // Grab First Frame from a shot's video
    const handleGrabFirstFrame = async (shotId: string) => {
        const shot = scenes.flatMap(s => s.shots || []).find((s: any) => s.id === shotId);
        if (!shot?.generation?.outputs?.[0]) return;

        const videoUrl = shot.generation.outputs[0].url;
        alert(`Grab First Frame from ${videoUrl} - This would extract the first frame for use as an end frame.`);
    };

    // V2V Edit (Kling O1 style)
    const handleV2VEdit = async (shotId: string, editType: string, prompt: string) => {
        const shot = scenes.flatMap(s => s.shots || []).find((s: any) => s.id === shotId);
        if (!shot?.generation?.outputs?.[0]) return;

        try {
            // Create a new generation using Kling O1 V2V
            const response = await fetchAPI(`/projects/${projectId}/generations`, {
                method: "POST",
                body: JSON.stringify({
                    mode: "video_to_video",
                    inputPrompt: prompt,
                    sourceVideoUrl: shot.generation.outputs[0].url,
                    aspectRatio: aspectRatio,
                    model: "fal-ai/kling-video/o1/video-to-video/edit"
                })
            });
            loadScenes();
            alert(`V2V Edit (${editType}) initiated!`);
        } catch (err) {
            console.error("Failed to apply V2V edit", err);
            alert("Failed to apply V2V edit");
        }
    };

    // Predict Next Shot
    const handlePredictNextShot = async (shotId: string, prompt: string) => {
        const shot = scenes.flatMap(s => s.shots || []).find((s: any) => s.id === shotId);
        if (!shot?.generation?.outputs?.[0]) return;

        try {
            const fullPrompt = prompt
                ? `Based on @Video1, generate the next shot: ${prompt}`
                : "Based on @Video1, generate the next shot";

            const response = await fetchAPI(`/projects/${projectId}/generations`, {
                method: "POST",
                body: JSON.stringify({
                    mode: "video_to_video",
                    inputPrompt: fullPrompt,
                    sourceVideoUrl: shot.generation.outputs[0].url,
                    aspectRatio: aspectRatio,
                    model: "fal-ai/kling-video/o1/image-to-video"
                })
            });
            loadScenes();
            alert("Next shot prediction initiated!");
        } catch (err) {
            console.error("Failed to predict next shot", err);
            alert("Failed to predict next shot");
        }
    };

    // Predict Previous Shot
    const handlePredictPreviousShot = async (shotId: string, prompt: string) => {
        const shot = scenes.flatMap(s => s.shots || []).find((s: any) => s.id === shotId);
        if (!shot?.generation?.outputs?.[0]) return;

        try {
            const fullPrompt = prompt
                ? `Based on @Video1, generate the previous shot: ${prompt}`
                : "Based on @Video1, generate the previous shot";

            const response = await fetchAPI(`/projects/${projectId}/generations`, {
                method: "POST",
                body: JSON.stringify({
                    mode: "video_to_video",
                    inputPrompt: fullPrompt,
                    sourceVideoUrl: shot.generation.outputs[0].url,
                    aspectRatio: aspectRatio,
                    model: "fal-ai/kling-video/o1/image-to-video"
                })
            });
            loadScenes();
            alert("Previous shot prediction initiated!");
        } catch (err) {
            console.error("Failed to predict previous shot", err);
            alert("Failed to predict previous shot");
        }
    };

    const toggleSceneSelection = (id: string) => {
        setSelectedSceneIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const selectAllScenes = () => {
        setSelectedSceneIds(scenes.map(s => s.id));
    };

    const deselectAllScenes = () => {
        setSelectedSceneIds([]);
    };

    const handleBatchDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedSceneIds.length} scenes?`)) return;

        try {
            await Promise.all(selectedSceneIds.map(id =>
                fetchAPI(`/projects/${projectId}/scenes/${id}`, { method: 'DELETE' })
            ));
            setSelectedSceneIds([]);
            loadScenes();
        } catch (err) {
            console.error("Batch delete failed", err);
        }
    };

    const handleBatchMove = async (targetSessionId: string) => {
        try {
            await Promise.all(selectedSceneIds.map(id =>
                fetchAPI(`/projects/${projectId}/scenes/${id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ sessionId: targetSessionId })
                })
            ));
            setSelectedSceneIds([]);
            loadScenes();
        } catch (err) {
            console.error("Batch move failed", err);
        }
    };

    const handleBatchCopyLinks = () => {
        const links = scenes
            .filter(s => selectedSceneIds.includes(s.id))
            .flatMap(s => s.shots || [])
            .map((shot: any) => shot.generation?.outputs?.[0]?.url)
            .filter(Boolean)
            .join('\n');

        if (links) {
            navigator.clipboard.writeText(links);
            alert(`Copied links from ${selectedSceneIds.length} scenes to clipboard!`);
        } else {
            alert("No links found in selected scenes.");
        }
    };

    return (
        <div className="min-h-screen bg-black text-white">
            <StoryboardHeader
                aspectRatio={aspectRatio}
                onAspectRatioChange={setAspectRatio}
                onStyleClick={() => setIsStyleModalOpen(true)}
                onCastClick={() => router.push(`/projects/${projectId}/elements?type=character`)}
                onPreview={handlePreview}
            />

            <div className="p-8">
                <header className="mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Storyboard</h1>
                        <p className="text-gray-400 mt-2">Organize your shots into scenes.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCreateScene}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                        >
                            + New Scene
                        </button>
                        {scenes.length > 0 && (
                            <button
                                onClick={selectedSceneIds.length === scenes.length ? deselectAllScenes : selectAllScenes}
                                className="text-sm text-blue-400 hover:text-blue-300"
                            >
                                {selectedSceneIds.length === scenes.length ? "Deselect All" : "Select All"}
                            </button>
                        )}
                    </div>
                </header>

                {/* Foundation Image Panel */}
                <div className="mb-8">
                    <FoundationImagePanel
                        projectId={projectId}
                        foundationImage={foundationImage}
                        onFoundationImageChange={setFoundationImage}
                        onGenerateFromPrompt={handleGenerateFoundation}
                        styleConfig={styleConfig}
                        onStyleConfigChange={setStyleConfig}
                    />
                </div>

                <div className="space-y-8">
                    {scenes.length === 0 ? (
                        <div className="text-center py-20 text-gray-500 border-2 border-dashed border-white/10 rounded-xl">
                            <p>No scenes yet. Create one to start building your story.</p>
                        </div>
                    ) : (
                        scenes.map((scene) => (
                            <div key={scene.id} className="bg-white/5 border border-white/10 rounded-xl p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            onClick={() => toggleSceneSelection(scene.id)}
                                            className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${selectedSceneIds.includes(scene.id)
                                                ? "bg-blue-500 border-blue-500"
                                                : "bg-black/50 border-white/50 hover:border-white"
                                                }`}
                                        >
                                            {selectedSceneIds.includes(scene.id) && <CheckSquare className="w-3 h-3 text-white" />}
                                        </div>
                                        <h3 className="text-xl font-bold">{scene.name}</h3>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openGenerator(scene.id)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            <Sparkles className="w-4 h-4" /> Generate Scene
                                        </button>
                                        <button
                                            onClick={() => openPicker(scene.id)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            <Plus className="w-4 h-4" /> Add Shot
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                    {scene.shots?.length === 0 && (
                                        <div className="w-64 aspect-video bg-white/5 rounded-lg border border-dashed border-white/10 flex items-center justify-center text-gray-500 text-sm">
                                            No shots yet
                                        </div>
                                    )}
                                    {scene.shots?.map((shot: any) => {
                                        const isVideo = shot.generation?.outputs?.[0]?.type === 'video';
                                        const mediaUrl = shot.generation?.outputs?.[0]?.url;

                                        return (
                                            <div
                                                key={shot.id}
                                                className={clsx(
                                                    "flex-shrink-0 w-64 bg-black/50 rounded-lg overflow-hidden relative group border transition-all",
                                                    activeShotForActions?.id === shot.id
                                                        ? "border-blue-500 ring-2 ring-blue-500/20"
                                                        : "border-white/5 hover:border-white/20"
                                                )}
                                            >
                                                {/* Media Preview */}
                                                <div className="aspect-video relative">
                                                    {mediaUrl ? (
                                                        isVideo ? (
                                                            <video
                                                                src={mediaUrl}
                                                                className="w-full h-full object-cover"
                                                                muted
                                                                loop
                                                                playsInline
                                                                onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                                                                onMouseLeave={(e) => {
                                                                    (e.target as HTMLVideoElement).pause();
                                                                    (e.target as HTMLVideoElement).currentTime = 0;
                                                                }}
                                                            />
                                                        ) : (
                                                            <img src={mediaUrl} className="w-full h-full object-cover" />
                                                        )
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                                                            No media
                                                        </div>
                                                    )}

                                                    {/* Video Indicator */}
                                                    {isVideo && (
                                                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-blue-500/80 rounded text-[10px] text-white font-medium flex items-center gap-1">
                                                            <Video className="w-3 h-3" />
                                                            Video
                                                        </div>
                                                    )}

                                                    {/* Shot Index Badge */}
                                                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white backdrop-blur-sm">
                                                        Shot {shot.index}
                                                    </div>

                                                    {/* Action Buttons Overlay */}
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        {/* V2V Actions Button */}
                                                        {isVideo && (
                                                            <button
                                                                onClick={() => setActiveShotForActions(
                                                                    activeShotForActions?.id === shot.id ? null : shot
                                                                )}
                                                                className={clsx(
                                                                    "p-2 rounded-lg backdrop-blur-sm transition-all",
                                                                    activeShotForActions?.id === shot.id
                                                                        ? "bg-blue-500 text-white"
                                                                        : "bg-black/60 hover:bg-blue-500 text-white"
                                                                )}
                                                                title="V2V Actions"
                                                            >
                                                                <Palette className="w-4 h-4" />
                                                            </button>
                                                        )}

                                                        {/* Extend Button */}
                                                        {isVideo && (
                                                            <button
                                                                onClick={() => handleGrabLastFrame(shot.id)}
                                                                className="p-2 bg-black/60 hover:bg-green-500 text-white rounded-lg backdrop-blur-sm transition-all"
                                                                title="Grab Last Frame (Extend)"
                                                            >
                                                                <FastForward className="w-4 h-4" />
                                                            </button>
                                                        )}

                                                        {/* Edit Style Button */}
                                                        <button
                                                            onClick={() => setEditingShot(shot)}
                                                            className="p-2 bg-black/60 hover:bg-purple-600 text-white rounded-lg backdrop-blur-sm transition-all"
                                                            title="Edit Shot Style"
                                                        >
                                                            <Sparkles className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Prompt Preview */}
                                                <div className="p-2 border-t border-white/5">
                                                    <p className="text-[10px] text-gray-500 truncate">
                                                        {shot.generation?.inputPrompt || "No prompt"}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Batch Action Toolbar */}
            {selectedSceneIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl px-6 py-3 flex items-center gap-6 animate-in slide-in-from-bottom-4 fade-in duration-200">
                    <span className="text-sm font-medium text-white">
                        {selectedSceneIds.length} selected
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
                            onClick={selectedSceneIds.length === scenes.length ? deselectAllScenes : selectAllScenes}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium transition-colors border border-white/10"
                        >
                            <CheckSquare className="w-4 h-4" />
                            {selectedSceneIds.length === scenes.length ? "Deselect All" : "Select All"}
                        </button>
                        <button
                            onClick={deselectAllScenes}
                            className="p-1.5 text-gray-400 hover:text-white transition-colors ml-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* V2V Actions Slide Panel */}
            {activeShotForActions && (
                <div className="fixed right-0 top-16 bottom-0 w-80 bg-[#0a0a0a] border-l border-white/10 z-40 overflow-y-auto shadow-2xl">
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-white">Shot Actions</h3>
                            <button
                                onClick={() => setActiveShotForActions(null)}
                                className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Shot Preview */}
                        <div className="mb-4 aspect-video rounded-lg overflow-hidden border border-white/10">
                            {activeShotForActions.generation?.outputs?.[0]?.type === 'video' ? (
                                <video
                                    src={activeShotForActions.generation.outputs[0].url}
                                    className="w-full h-full object-cover"
                                    controls
                                    muted
                                />
                            ) : (
                                <img
                                    src={activeShotForActions.generation?.outputs?.[0]?.url}
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>

                        <ShotActionsPanel
                            shot={activeShotForActions}
                            onGrabLastFrame={handleGrabLastFrame}
                            onGrabFirstFrame={handleGrabFirstFrame}
                            onV2VEdit={handleV2VEdit}
                            onPredictNextShot={handlePredictNextShot}
                            onPredictPreviousShot={handlePredictPreviousShot}
                        />
                    </div>
                </div>
            )}

            <GenerationPickerModal
                projectId={projectId}
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                onSelect={handleAddShot}
            />

            <SceneGeneratorModal
                isOpen={isGeneratorOpen}
                onClose={() => setIsGeneratorOpen(false)}
                onGenerate={handleGenerateScene}
                sceneName={scenes.find(s => s.id === generatorSceneId)?.name || "Scene"}
            />

            <StyleSelectorModal
                isOpen={isStyleModalOpen}
                onClose={() => setIsStyleModalOpen(false)}
                onApply={handleStyleApply}
                projectId={projectId}
            />

            <CastModal
                isOpen={isCastModalOpen}
                onClose={() => setIsCastModalOpen(false)}
                projectId={projectId}
            />

            <ShotStyleEditorModal
                isOpen={!!editingShot}
                onClose={() => setEditingShot(null)}
                shot={editingShot}
                onSave={handleUpdateShot}
            />

            <EditElementModal
                element={selectedGeneration ? {
                    id: selectedGeneration.id,
                    name: selectedGeneration.name || selectedGeneration.inputPrompt,
                    type: selectedGeneration.outputs?.[0]?.type || 'image',
                    url: selectedGeneration.outputs?.[0]?.url || '',
                    tags: selectedGeneration.tags || [],
                    session: selectedGeneration.session,
                    metadata: {},
                    projectId: projectId
                } : null}
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedGeneration(null);
                }}
                onSave={async (id, updates) => {
                    // Map updates back to generation fields
                    const genUpdates: any = {};
                    if (updates.name) genUpdates.name = updates.name;
                    if (updates.tags) genUpdates.tags = updates.tags;
                    if (updates.sessionId !== undefined) genUpdates.sessionId = updates.sessionId;

                    try {
                        await fetchAPI(`/projects/${projectId}/generations/${id}`, {
                            method: 'PATCH',
                            body: JSON.stringify(genUpdates)
                        });
                        loadScenes();
                    } catch (err) {
                        console.error("Failed to update generation", err);
                    }
                }}
                sessions={sessions}
            />
        </div>
    );
}
