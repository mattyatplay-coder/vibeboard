import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Wand2, Play, MoreVertical } from 'lucide-react';
import { fetchAPI } from '@/lib/api';

interface TimelineViewProps {
    scenes: any[];
    projectId: string;
    onUpdate: () => void;
}

export function TimelineView({ scenes, projectId, onUpdate }: TimelineViewProps) {
    // Flatten shots for the timeline, but keep track of their scene
    const allShots = scenes.flatMap(scene =>
        (scene.shots || []).map((shot: any) => ({
            ...shot,
            sceneId: scene.id,
            sceneName: scene.name
        }))
    );

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        // In a real implementation, we would calculate the new order and update the backend.
        // For this MVP, we'll just log it as reordering across scenes is complex.
        console.log("Reordered:", active.id, "over", over.id);

        // TODO: Implement backend reordering logic
    };

    const handleBridge = async (index: number) => {
        const prevShot = allShots[index];
        const nextShot = allShots[index + 1];

        if (!prevShot || !nextShot) return;

        const prompt = window.prompt("Describe the transition between these two shots:");
        if (!prompt) return;

        try {
            // Use Kling o1 for bridging
            await fetchAPI(`/projects/${projectId}/generations`, {
                method: "POST",
                body: JSON.stringify({
                    mode: "video_generation",
                    model: "kling-o1-ref", // Use Kling o1
                    inputPrompt: prompt,
                    sourceImages: [prevShot.generation.outputs[0].url], // Use prev shot as reference
                    // We could also pass nextShot as a second reference if the API supports it
                    aspectRatio: "16:9"
                })
            });

            alert("Generating bridge shot! It will appear shortly.");
            onUpdate();
        } catch (err) {
            console.error("Failed to bridge shots", err);
            alert("Failed to generate bridge shot");
        }
    };

    return (
        <div className="w-full overflow-x-auto pb-8">
            <div className="min-w-max px-8">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={allShots.map(s => s.id)} strategy={horizontalListSortingStrategy}>
                        <div className="flex items-center gap-4">
                            {allShots.map((shot, index) => (
                                <React.Fragment key={shot.id}>
                                    <SortableShot shot={shot} />

                                    {/* Bridge Button (between shots) */}
                                    {index < allShots.length - 1 && (
                                        <button
                                            onClick={() => handleBridge(index)}
                                            className="group relative w-8 h-8 rounded-full bg-white/5 hover:bg-purple-500/20 flex items-center justify-center transition-all"
                                            title="Generate Bridge (Transition)"
                                        >
                                            <div className="absolute inset-0 bg-purple-500/20 rounded-full scale-0 group-hover:scale-100 transition-transform" />
                                            <Wand2 className="w-4 h-4 text-gray-500 group-hover:text-purple-400 relative z-10" />
                                        </button>
                                    )}
                                </React.Fragment>
                            ))}

                            {/* Add New Shot Button at the end */}
                            <button className="w-64 h-36 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-gray-500 hover:border-purple-500/50 hover:text-purple-400 hover:bg-purple-500/5 transition-all">
                                <Plus className="w-8 h-8 mb-2" />
                                <span>Add Shot</span>
                            </button>
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
}

function SortableShot({ shot }: { shot: any }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: shot.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative group w-64 flex-shrink-0"
        >
            {/* Scene Label */}
            <div className="absolute -top-8 left-0 text-xs text-gray-500 font-mono truncate max-w-full">
                {shot.sceneName}
            </div>

            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-white/10 group-hover:border-purple-500/50 transition-colors">
                {shot.generation?.outputs?.[0]?.url ? (
                    shot.generation.outputs[0].type === 'video' || shot.generation.outputs[0].url.endsWith('.mp4') ? (
                        <video
                            src={shot.generation.outputs[0].url}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            onMouseOver={e => e.currentTarget.play()}
                            onMouseOut={e => e.currentTarget.pause()}
                        />
                    ) : (
                        <img
                            src={shot.generation.outputs[0].url}
                            alt={shot.generation.inputPrompt}
                            className="w-full h-full object-cover"
                        />
                    )
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <span className="text-xs text-gray-500">Processing...</span>
                    </div>
                )}

                {/* Drag Handle */}
                <div {...attributes} {...listeners} className="absolute top-2 left-2 p-1.5 bg-black/50 rounded-lg cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-4 h-4 text-white" />
                </div>

                {/* Controls */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
                    <span className="text-xs text-white/80 line-clamp-1 flex-1 mr-2">
                        {shot.generation?.inputPrompt}
                    </span>
                    <button className="p-1 hover:bg-white/20 rounded">
                        <MoreVertical className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
}
