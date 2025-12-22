import { Plus, Sparkles, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

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
  setIsEditModalOpen,
}: SceneCardProps) => {
  const isSelected = selectedSceneIds.includes(scene.id);

  return (
    <article
      className="rounded-xl border border-white/10 bg-white/5 p-6"
      aria-label={`Scene: ${scene.name}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleSceneSelection(scene.id)}
            role="checkbox"
            aria-checked={isSelected}
            aria-label={`Select scene: ${scene.name}`}
            className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded border transition-colors focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 focus:ring-offset-black focus:outline-none ${
              isSelected
                ? 'border-blue-500 bg-blue-500'
                : 'border-white/50 bg-black/50 hover:border-white'
            }`}
          >
            {isSelected && <Check className="h-3 w-3 text-white" />}
          </button>
          <h3 className="text-xl font-bold">{scene.name}</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openGenerator(scene.id)}
            className="flex items-center gap-2 rounded-lg bg-purple-600/20 px-3 py-1.5 text-sm font-medium text-purple-400 transition-colors hover:bg-purple-600/30 focus:ring-2 focus:ring-purple-400 focus:outline-none"
            aria-label={`Generate shots for scene: ${scene.name}`}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Generate Scene
          </button>
          <button
            onClick={() => openPicker(scene.id)}
            className="flex items-center gap-2 rounded-lg bg-blue-600/20 px-3 py-1.5 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-600/30 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            aria-label={`Add shot to scene: ${scene.name}`}
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Add Shot
          </button>
        </div>
      </div>

      <div
        className="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent flex gap-4 overflow-x-auto pb-4"
        role="list"
        aria-label={`Shots in ${scene.name}`}
      >
        {scene.shots?.length === 0 && (
          <div className="flex aspect-video w-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-white/5 p-4 text-sm text-gray-500">
            <span>No shots yet</span>
            <span className="text-xs text-gray-600">
              Click &quot;Add Shot&quot; or &quot;Generate Scene&quot; to get started
            </span>
          </div>
        )}
        {scene.shots?.map((shot: any) => (
          <div
            key={shot.id}
            className="group relative aspect-video w-64 flex-shrink-0 overflow-hidden rounded-lg border border-white/5 bg-black/50"
            role="listitem"
          >
            {shot.generation?.status === 'queued' || shot.generation?.status === 'running' ? (
              <Skeleton className="h-full w-full bg-white/5" aria-label="Loading shot..." />
            ) : shot.generation?.outputs?.[0] ? (
              <img
                src={shot.generation.outputs[0].url}
                className="h-full w-full object-cover"
                loading="lazy"
                alt={`Shot ${shot.index} - ${shot.generation?.inputPrompt?.slice(0, 50) || 'Generated image'}`}
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-xs text-red-500"
                role="alert"
              >
                Generation failed
              </div>
            )}
            <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
              Shot {shot.index}
            </div>

            {/* Edit Style Button */}
            <button
              onClick={() => setEditingShot(shot)}
              className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-purple-600 focus:opacity-100 focus:ring-2 focus:ring-purple-400 focus:outline-none"
              aria-label={`Edit style for Shot ${shot.index}`}
            >
              <Sparkles className="h-3 w-3" aria-hidden="true" />
            </button>
            <button
              onClick={() => {
                setSelectedGeneration(shot.generation);
                setIsEditModalOpen(true);
              }}
              className="absolute top-2 right-9 rounded-full bg-black/60 p-1.5 text-white opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-blue-600 focus:opacity-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              aria-label={`Edit details for Shot ${shot.index}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-pencil"
                aria-hidden="true"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </article>
  );
};
