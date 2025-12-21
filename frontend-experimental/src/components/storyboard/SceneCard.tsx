import { Plus, Sparkles, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface SceneCardProps {
    scene: any;
    selectedSceneIds: string[];
    toggleSceneSelection: (id: string) => void;
    openGenerator: (id: string) => void;
    openPicker: (id: string) => void;
    setEditingShot: (shot: any) => void;
    setSelectedGeneration: (gen: any) => void;
    setIsEditModalOpen: (isOpen: boolean) => void;
}

export const SceneCard = ({
    scene,
    selectedSceneIds,
    toggleSceneSelection,
    openGenerator,
    openPicker,
    setEditingShot,
    setSelectedGeneration,
    setIsEditModalOpen
}: SceneCardProps) => {
    const isSelected = selectedSceneIds.includes(scene.id);

    return (
        <article className="bg-white/5 border border-white/10 rounded-xl p-6" aria-label={`Scene: ${scene.name}`}>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => toggleSceneSelection(scene.id)}
                        role="checkbox"
                        aria-checked={isSelected}
                        aria-label={`Select scene: ${scene.name}`}
                        className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 focus:ring-offset-black ${isSelected
                            ? "bg-blue-500 border-blue-500"
                            : "bg-black/50 border-white/50 hover:border-white"
                            }`}
                    >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <h3 className="text-xl font-bold">{scene.name}</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => openGenerator(scene.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
                        aria-label={`Generate shots for scene: ${scene.name}`}
                    >
                        <Sparkles className="w-4 h-4" aria-hidden="true" /> Generate Scene
                    </button>
                    <button
                        onClick={() => openPicker(scene.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                        aria-label={`Add shot to scene: ${scene.name}`}
                    >
                        <Plus className="w-4 h-4" aria-hidden="true" /> Add Shot
                    </button>
                </div>
            </div>

            <div
                className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                role="list"
                aria-label={`Shots in ${scene.name}`}
            >
                {scene.shots?.length === 0 && (
                    <div className="w-64 aspect-video bg-white/5 rounded-lg border border-dashed border-white/10 flex flex-col items-center justify-center text-gray-500 text-sm gap-2 p-4">
                        <span>No shots yet</span>
                        <span className="text-xs text-gray-600">Click &quot;Add Shot&quot; or &quot;Generate Scene&quot; to get started</span>
                    </div>
                )}
                {scene.shots?.map((shot: any) => (
                    <div
                        key={shot.id}
                        className="flex-shrink-0 w-64 aspect-video bg-black/50 rounded-lg overflow-hidden relative group border border-white/5"
                        role="listitem"
                    >
                        {shot.generation?.status === 'queued' || shot.generation?.status === 'running' ? (
                            <Skeleton className="w-full h-full bg-white/5" aria-label="Loading shot..." />
                        ) : shot.generation?.outputs?.[0] ? (
                            <img
                                src={shot.generation.outputs[0].url}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                alt={`Shot ${shot.index} - ${shot.generation?.inputPrompt?.slice(0, 50) || 'Generated image'}`}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-red-500 text-xs" role="alert">
                                Generation failed
                            </div>
                        )}
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white backdrop-blur-sm">
                            Shot {shot.index}
                        </div>

                        {/* Edit Style Button */}
                        <button
                            onClick={() => setEditingShot(shot)}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-purple-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
                            aria-label={`Edit style for Shot ${shot.index}`}
                        >
                            <Sparkles className="w-3 h-3" aria-hidden="true" />
                        </button>
                        <button
                            onClick={() => {
                                setSelectedGeneration(shot.generation);
                                setIsEditModalOpen(true);
                            }}
                            className="absolute top-2 right-9 p-1.5 bg-black/60 hover:bg-blue-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            aria-label={`Edit details for Shot ${shot.index}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                        </button>
                    </div>
                ))}
            </div>
        </article>
    );
};
