import { Generation, Element } from "@/lib/store";
import { GenerationCard } from "@/components/generations/GenerationCard";
import { Copy, FilePlus, Trash2, CheckSquare, X, Download } from "lucide-react";
import { toast } from "sonner";

interface GenerationResultsProps {
    generations: Generation[];
    elements: Element[];
    selectedGenerationIds: string[];
    onToggleSelection: (id: string, e: React.MouseEvent) => void;
    onSelectionChange: (ids: string[]) => void;

    // Actions
    onUpdate: (id: string, updates: Partial<Generation>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onIterate: (prompt: string) => Promise<void>;
    onUseSettings: (gen: Generation) => void;
    onAnimate: (url: string) => Promise<void>;
    onUpscale: (url: string, model: string) => Promise<void>;
    onRetake: (url: string) => void;
    onInpaint: (url: string, ar?: string) => void;
    onEnhanceVideo: (id: string, mode?: 'full' | 'audio-only' | 'smooth-only') => Promise<void>;

    // Batch
    onBatchMove: (sessionId: string) => Promise<void>;
    onBatchDelete: () => Promise<void>;
    onBatchDownload: () => Promise<void>;

    // Other UI
    sessions: { id: string, name: string }[];
    onEdit: (gen: Generation) => void;
    onSaveElement: (url: string, type: 'image' | 'video') => void;
}

export function GenerationResults({
    generations, elements, selectedGenerationIds,
    onToggleSelection, onSelectionChange,
    onUpdate, onDelete, onIterate, onUseSettings,
    onAnimate, onUpscale, onRetake, onInpaint, onEnhanceVideo,
    onBatchMove, onBatchDelete, onBatchDownload,
    sessions, onEdit, onSaveElement
}: GenerationResultsProps) {

    const handleBatchCopyLinks = () => {
        const selectedGens = generations.filter(g => selectedGenerationIds.includes(g.id));
        const links = selectedGens.map(g => {
            const url = g.outputs?.[0]?.url;
            if (!url) return null;
            return url.startsWith('http') ? url : `http://localhost:3001${url}`;
        }).filter(Boolean).join('\n');

        if (links) {
            navigator.clipboard.writeText(links);
            toast.success(`Copied ${selectedGenerationIds.length} links to clipboard!`);
        }
    };

    const selectAllGenerations = () => {
        onSelectionChange(generations.map(g => g.id));
    };

    const deselectAllGenerations = () => {
        onSelectionChange([]);
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 pb-32">
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
                <div className="lg:col-span-3">
                    <h2 className="text-xl font-bold mb-4">Recent Generations</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {generations.map((gen, index) => (
                            <GenerationCard
                                key={gen.id || `gen-${index}`}
                                generation={gen}
                                elements={elements}
                                onUpdate={onUpdate}
                                onDelete={onDelete}
                                onIterate={onIterate}
                                onUseSettings={onUseSettings}
                                onAnimate={onAnimate}
                                onUpscale={onUpscale}
                                onEdit={() => onEdit(gen)}
                                onRetake={onRetake}
                                onInpaint={onInpaint}
                                onEnhanceVideo={onEnhanceVideo}
                                isSelected={selectedGenerationIds.includes(gen.id)}
                                onToggleSelection={(e) => onToggleSelection(gen.id, e)}
                                onSaveAsElement={(url, type) => onSaveElement(url, type)}
                            />
                        ))}
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
                                if (e.target.value) onBatchMove(e.target.value);
                            }}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            defaultValue=""
                        >
                            <option value="" disabled>Move to Session...</option>
                            {sessions.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <button onClick={handleBatchCopyLinks} className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-sm font-medium border border-blue-500/20">
                            <Copy className="w-4 h-4" /> Copy Links
                        </button>
                        <button onClick={onBatchDownload} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 text-white rounded-lg text-sm font-medium border border-white/10">
                            <Download className="w-4 h-4" /> Download
                        </button>
                        <button onClick={onBatchDelete} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-sm font-medium border border-red-500/20">
                            <Trash2 className="w-4 h-4" /> Delete
                        </button>
                        <div className="h-4 w-px bg-white/10 mx-1" />
                        <button onClick={deselectAllGenerations} className="p-1.5 text-gray-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
