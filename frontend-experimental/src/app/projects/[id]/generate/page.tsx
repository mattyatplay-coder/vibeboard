"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { useParams } from "next/navigation";
import { toast, Toaster } from "sonner";
import { Element, Generation, Scene } from "@/lib/store";
import { ShotNavigator } from "@/components/generations/ShotNavigator";
import { StyleSelectorModal } from "@/components/storyboard/StyleSelectorModal";
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
    pointerWithin
} from "@dnd-kit/core";

import { SaveElementModal } from "@/components/generations/SaveElementModal";
import { EditElementModal } from "@/components/elements/EditElementModal";
import { VideoMaskEditor } from "@/components/generations/VideoMaskEditor";
import { ImageMaskEditor } from "@/components/generations/ImageMaskEditor";
import { AudioInputModal } from "@/components/generations/AudioInputModal";
import { ElementReferencePicker } from "@/components/storyboard/ElementReferencePicker"; // Restored
import { EngineLibraryModal } from "@/components/generations/EngineLibraryModal"; // Restored

// Refactored Imports
import { useGeneration } from "@/hooks/useGeneration";
import { GenerationForm } from "@/components/generations/GenerationForm";
import { GenerationResults } from "@/components/generations/GenerationResults";
import { Loader2 } from "lucide-react";
// import { DockableSidebar } from "@/components/ui/DockableSidebar"; // Removed


export default function GeneratePage() {
    const params = useParams();
    const projectId = params.id as string;
    const { selectedSessionId, sessions } = useSession();

    // Data State
    const [generations, setGenerations] = useState<Generation[]>([]);
    const [elements, setElements] = useState<Element[]>([]);
    const [scenes, setScenes] = useState<Scene[]>([]);

    // UI State
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [isOverShotNavigator, setIsOverShotNavigator] = useState(false);

    // Modal/Editor State (Page specifics)
    const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isElementPickerOpen, setIsElementPickerOpen] = useState(false); // Quick Drawer
    const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false); // Advanced Modal ({})
    const [isSaveElementModalOpen, setIsSaveElementModalOpen] = useState(false);
    const [isBatchSaveMode, setIsBatchSaveMode] = useState(false);
    const [saveElementData, setSaveElementData] = useState<{ url: string, type: string } | null>(null);
    const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
    const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
    const [isEngineLibraryOpen, setIsEngineLibraryOpen] = useState(false); // Restored

    // Batch Selection State
    const [selectedGenerationIds, setSelectedGenerationIds] = useState<string[]>([]);
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

    // Load Data
    const loadElements = async () => {
        try {
            const data = await fetchAPI(`/elements`);
            const mapped: Element[] = data.map((e: Record<string, unknown>) => ({
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
        } catch (err) { console.error(err); }
    };

    const loadScenes = async () => {
        try {
            const endpoint = selectedSessionId
                ? `/projects/${projectId}/scenes?sessionId=${selectedSessionId}`
                : `/projects/${projectId}/scenes`;
            const data = await fetchAPI(endpoint);
            setScenes(data);
        } catch (err) { console.error("Failed to load scenes", err); }
    };

    const loadGenerations = async () => {
        try {
            const endpoint = selectedSessionId
                ? `/projects/${params.id}/generations?sessionId=${selectedSessionId}`
                : `/projects/${params.id}/generations`;
            const data = await fetchAPI(endpoint);
            setGenerations(data);
        } catch (error) { console.error("Failed to load generations:", error); }
    };

    useEffect(() => {
        if (projectId) {
            loadGenerations();
            loadElements();
            loadScenes();
            const interval = setInterval(loadGenerations, 5000);
            return () => clearInterval(interval);
        }
    }, [projectId, selectedSessionId]);

    // Initialize Hook
    const gen = useGeneration({
        projectId,
        selectedSessionId,
        loadGenerations,
        loadElements,
        loadScenes
    });

    // Batch Logic
    const toggleGenerationSelection = (id: string, e?: React.MouseEvent) => {
        setSelectedGenerationIds(prev => {
            let newSelection = [...prev];
            if (e?.shiftKey && lastSelectedId && lastSelectedId !== id) {
                const lastIndex = generations.findIndex(g => g.id === lastSelectedId);
                const currentIndex = generations.findIndex(g => g.id === id);
                if (lastIndex !== -1 && currentIndex !== -1) {
                    const start = Math.min(lastIndex, currentIndex);
                    const end = Math.max(lastIndex, currentIndex);
                    const range = generations.slice(start, end + 1).map(g => g.id);
                    const combined = new Set([...prev, ...range]);
                    return Array.from(combined);
                }
            }
            if (prev.includes(id)) {
                newSelection = prev.filter(gid => gid !== id);
                setLastSelectedId(null);
            } else {
                newSelection = [...prev, id];
                setLastSelectedId(id);
            }
            return newSelection;
        });
    };

    const handleBatchDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedGenerationIds.length} generations?`)) return;
        try {
            await Promise.all(selectedGenerationIds.map(id =>
                fetchAPI(`/projects/${projectId}/generations/${id}`, { method: 'DELETE' })
            ));
            setSelectedGenerationIds([]);
            loadGenerations();
        } catch (err) { console.error("Batch delete failed", err); }
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
        } catch (err) { console.error("Batch move failed", err); }
    };

    const handleBatchDownload = async () => {
        if (!selectedGenerationIds.length) return;
        toast.info(`Starting download of ${selectedGenerationIds.length} items...`);
        for (const id of selectedGenerationIds) {
            const gen = generations.find(g => g.id === id);
            if (!gen || !gen.outputs?.[0]) continue;
            // Use same download logic as hook or simple fetch
            const output = gen.outputs[0];
            const isVideo = output.type === 'video';
            const url = output.url.startsWith('http') || output.url.startsWith('data:')
                ? output.url : `http://localhost:3001${output.url}`;

            try {
                const res = await fetch(url);
                const blob = await res.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `generation-${id}.${isVideo ? 'mp4' : 'png'}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                await new Promise(r => setTimeout(r, 500));
            } catch (e) { console.error(e); }
        }
    };

    // Process Batch Save
    const processBatchSave = async (commonType: string) => {
        const promises = selectedGenerationIds.map(async (id) => {
            const gen = generations.find(g => g.id === id);
            if (!gen || !gen.outputs?.[0]) return;
            const output = gen.outputs[0];
            const isVideo = output.type === 'video';
            const url = output.url.startsWith('http') || output.url.startsWith('data:') ? output.url : `http://localhost:3001${output.url}`;

            try {
                const res = await fetch(url);
                const blob = await res.blob();
                const file = new File([blob], `batch-save-${id}.${isVideo ? 'mp4' : 'png'}`, { type: blob.type });
                const formData = new FormData();
                formData.append('file', file);
                formData.append('name', gen.inputPrompt?.slice(0, 50) || 'Saved Generation');
                formData.append('type', commonType);
                await fetch(`http://localhost:3001/api/projects/${projectId}/elements`, { method: 'POST', body: formData });
            } catch (err) { console.error(`Failed to save generation ${id}`, err); }
        });
        await Promise.all(promises);
        loadElements();
        setIsBatchSaveMode(false);
    };

    // Drag and Drop Logic
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
    const handleDragStart = (event: DragStartEvent) => { setActiveDragId(event.active.id as string); };
    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        if (over) {
            const overId = String(over.id);
            const isInShotNavigator = overId.startsWith('shot-') || overId === 'drop-end' || overId === 'drop-empty' || overId === 'shot-navigator-container';
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
        if (over && active.data.current?.type === 'generation') {
            const generationId = active.id as string;
            const { sceneId, index } = over.data.current || {};
            if (sceneId && typeof index === 'number') {
                // Logic to add shot (could be extracted but okay here as page logic)
                try {
                    await fetchAPI(`/projects/${projectId}/scenes/${sceneId}/shots`, {
                        method: 'POST', body: JSON.stringify({ generationId, index })
                    });
                    loadScenes();
                } catch (err) { console.error("Failed to add shot", err); }
            }
        }
    };

    const handleRemoveShot = async (shotId: string) => {
        const scene = scenes.find(s => (s.shots as Array<{ id: string }>)?.some(shot => shot.id === shotId));
        if (!scene) return;
        try {
            await fetchAPI(`/projects/${projectId}/scenes/${scene.id}/shots/${shotId}`, { method: 'DELETE' });
            loadScenes();
        } catch (err) { console.error("Failed to remove shot", err); }
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
                    {/* Main Results Area */}

                    <div className="flex-1 flex flex-col overflow-hidden relative">
                        {/* Shot Navigator */}
                        <div className="flex-shrink-0 z-20 relative bg-black/50 backdrop-blur-sm border-b border-white/10">
                            <ShotNavigator
                                scenes={scenes}
                                activeDragId={activeDragId}
                                isOverNavigator={isOverShotNavigator}
                                onDropIndexChange={setDragOverIndex}
                                onRemove={handleRemoveShot}
                            />
                        </div>

                        {/* Main Results Area */}
                        <GenerationResults
                            generations={generations}
                            elements={elements}
                            selectedGenerationIds={selectedGenerationIds}
                            onToggleSelection={toggleGenerationSelection}
                            onSelectionChange={setSelectedGenerationIds}

                            // Actions from Hook
                            onUpdate={gen.handleUpdateGeneration}
                            onDelete={gen.handleDeleteGeneration}
                            onIterate={gen.handleIterateGeneration}
                            onUseSettings={gen.handleUseSettings}
                            onAnimate={gen.handleAnimate}
                            onUpscale={gen.handleUpscale}
                            onRetake={gen.handleRetake}
                            onInpaint={gen.handleInpaint}
                            onEnhanceVideo={gen.handleEnhanceVideo}

                            // Batch Actions
                            onBatchMove={handleBatchMove}
                            onBatchDelete={handleBatchDelete}
                            onBatchDownload={handleBatchDownload}

                            sessions={sessions}
                            onEdit={(g) => { setSelectedGeneration(g); setIsEditModalOpen(true); }}
                            onSaveElement={(url, type) => {
                                setSaveElementData({ url, type });
                                setIsBatchSaveMode(false);
                                setIsSaveElementModalOpen(true);
                            }}
                        />

                        {/* Bottom Form */}
                        <GenerationForm
                            prompt={gen.prompt}
                            setPrompt={gen.setPrompt}
                            isGenerating={gen.isGenerating}
                            onGenerate={gen.handleGenerate}
                            engineConfig={gen.engineConfig}
                            setEngineConfig={gen.setEngineConfig}
                            mode={gen.mode}
                            setMode={gen.setMode}
                            aspectRatio={gen.aspectRatio}
                            duration={gen.duration}
                            setDuration={gen.setDuration}
                            variations={gen.variations}
                            setVariations={gen.setVariations}
                            elements={elements}
                            selectedElementIds={gen.selectedElementIds}
                            toggleElement={(el) => {
                                const ids = gen.selectedElementIds;
                                gen.setSelectedElementIds(ids.includes(el.id) ? ids.filter(i => i !== el.id) : [...ids, el.id]);
                            }}
                            onOpenStyleModal={() => setIsStyleModalOpen(true)}
                            isElementPickerOpen={isElementPickerOpen}
                            setIsElementPickerOpen={setIsElementPickerOpen}
                            onOpenAdvancedSettings={() => setIsAdvancedSettingsOpen(true)}
                            audioFile={gen.audioFile}
                            onOpenAudioModal={() => setIsAudioModalOpen(true)}
                            pipelineStages={gen.pipelineStages}
                            setPipelineStages={gen.setPipelineStages}
                            styleConfig={gen.styleConfig}
                            projectId={projectId}
                            onOpenEngineLibrary={() => setIsEngineLibraryOpen(true)}
                        />
                    </div>
                </div>
            </div>

            {/* Modals & Drags */}
            <DragOverlay dropAnimation={null}>
                {activeDragId ? (
                    <div className="w-32 aspect-video rounded-lg border-2 border-blue-500 bg-black" />
                ) : null}
            </DragOverlay>

            <StyleSelectorModal
                isOpen={isStyleModalOpen}
                onClose={() => setIsStyleModalOpen(false)}
                onApply={gen.handleStyleApply}
                initialAspectRatio={gen.aspectRatio}
                projectId={projectId}
                config={gen.styleConfig || undefined}
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
                onClose={() => { setIsEditModalOpen(false); setSelectedGeneration(null); }}
                onSave={(id, updates) => {
                    // Adapter to match handleUpdateGeneration
                    const genUpdates: Record<string, unknown> = { ...updates };
                    gen.handleUpdateGeneration(id, genUpdates);
                }}
                sessions={sessions}
            />

            <VideoMaskEditor
                isOpen={gen.isRetakeModalOpen}
                onClose={() => gen.setIsRetakeModalOpen(false)}
                videoUrl={gen.retakeVideoUrl || ""}
                onSave={gen.handleSaveRetake}
            />

            <ImageMaskEditor
                isOpen={gen.isImageInpaintModalOpen}
                onClose={() => gen.setIsImageInpaintModalOpen(false)}
                imageUrl={gen.inpaintImageUrl || ""}
                onSave={gen.handleSaveInpaint}
                initialPrompt={gen.prompt}
            />

            <AudioInputModal
                isOpen={isAudioModalOpen}
                onClose={() => setIsAudioModalOpen(false)}
                currentFile={gen.audioFile}
                onAudioChange={(file) => gen.setAudioFile(file)}
            />

            <SaveElementModal
                isOpen={isSaveElementModalOpen}
                isBatch={isBatchSaveMode}
                onClose={() => { setIsSaveElementModalOpen(false); setIsBatchSaveMode(false); }}
                onSave={async (name, type) => {
                    if (isBatchSaveMode) {
                        await processBatchSave(type);
                    } else if (saveElementData) {
                        try {
                            await fetch(`http://localhost:3001/api/projects/${projectId}/elements/from-generation`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    url: saveElementData.url,
                                    type: type,
                                    name
                                })
                            });
                            loadElements();
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }}
            />

            <ElementReferencePicker
                projectId={projectId}
                isOpen={isAdvancedSettingsOpen}
                onClose={() => setIsAdvancedSettingsOpen(false)}
                selectedElements={gen.selectedElementIds}
                onSelectionChange={gen.setSelectedElementIds}
                elementStrengths={{}}
                onStrengthChange={() => { }}
                creativity={0.6}
            />

            <EngineLibraryModal
                isOpen={isEngineLibraryOpen}
                onClose={() => setIsEngineLibraryOpen(false)}
                currentModelId={gen.engineConfig.model}
                onSelect={(model) => {
                    gen.setEngineConfig({ provider: model.provider, model: model.id });
                    if (model.type === 'video') gen.setMode('video');
                    else gen.setMode('image');
                }}
                initialCategory={gen.mode === 'video' ? 'text-to-video' : 'text-to-image'}
            />

            <Toaster position="bottom-right" theme="dark" />
        </DndContext>
    );
}
