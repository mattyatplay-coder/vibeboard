import { useState, useMemo } from 'react';
import { Generation, Element } from '@/lib/store';
import { GenerationCard } from '@/components/generations/GenerationCard';
import { GenerationSearch } from '@/components/generations/GenerationSearch';
import { Copy, FilePlus, Trash2, CheckSquare, X, Download, Search, Eye, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

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
  sessions: { id: string; name: string }[];
  onEdit: (gen: Generation) => void;
  onSaveElement: (url: string, type: 'image' | 'video') => void;
  projectId: string;
}

export function GenerationResults({
  generations,
  elements,
  selectedGenerationIds,
  onToggleSelection,
  onSelectionChange,
  onUpdate,
  onDelete,
  onIterate,
  onUseSettings,
  onAnimate,
  onUpscale,
  onRetake,
  onInpaint,
  onEnhanceVideo,
  onBatchMove,
  onBatchDelete,
  onBatchDownload,
  sessions,
  onEdit,
  onSaveElement,
  projectId,
}: GenerationResultsProps) {
  // Search state
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Display either search results or all generations
  const displayedGenerations = useMemo(() => {
    if (searchResults !== null) {
      // Map search results back to Generation type
      // Search results include extra fields like searchScore
      return searchResults as Generation[];
    }
    return generations;
  }, [searchResults, generations]);

  const handleSearchResults = (results: any[], query: string) => {
    setSearchResults(results);
    setSearchQuery(query);
  };

  const handleClearSearch = () => {
    setSearchResults(null);
    setSearchQuery('');
  };

  // Find Similar handlers
  const handleFindSimilarComposition = async (generationId: string) => {
    try {
      toast.loading('Finding similar compositions...');
      const res = await fetch(
        `${BACKEND_URL}/api/projects/${projectId}/search/similar/composition/${generationId}?limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        toast.dismiss();
        if (data.results.length > 0) {
          setSearchResults(data.results);
          setSearchQuery(`Similar Composition to #${generationId.slice(0, 6)}`);
          toast.success(`Found ${data.results.length} similar compositions`);
        } else {
          toast.info('No similar compositions found. Try indexing more generations.');
        }
      }
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to find similar compositions');
    }
  };

  const handleFindSimilarLighting = async (generationId: string) => {
    try {
      toast.loading('Finding similar lighting...');
      const res = await fetch(
        `${BACKEND_URL}/api/projects/${projectId}/search/similar/lighting/${generationId}?limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        toast.dismiss();
        if (data.results.length > 0) {
          setSearchResults(data.results);
          setSearchQuery(`Similar Lighting to #${generationId.slice(0, 6)}`);
          toast.success(`Found ${data.results.length} similar lighting setups`);
        } else {
          toast.info('No similar lighting found. Try indexing more generations.');
        }
      }
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to find similar lighting');
    }
  };

  const handleBatchCopyLinks = () => {
    const selectedGens = generations.filter(g => selectedGenerationIds.includes(g.id));
    const links = selectedGens
      .map(g => {
        const url = g.outputs?.[0]?.url;
        if (!url) return null;
        return url.startsWith('http') ? url : `http://localhost:3001${url}`;
      })
      .filter(Boolean)
      .join('\n');

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
      <header className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight">Generate</h1>
            <p className="mt-2 text-gray-400">Create new shots using AI.</p>
          </div>
          {generations.length > 0 && (
            <button
              onClick={
                selectedGenerationIds.length === generations.length
                  ? deselectAllGenerations
                  : selectAllGenerations
              }
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {selectedGenerationIds.length === generations.length ? 'Deselect All' : 'Select All'}
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-3">
          {/* Dynamic heading based on search state */}
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            {searchQuery ? (
              <>
                <Search className="h-5 w-5 text-purple-400" />
                Results for "{searchQuery}"
                <span className="text-sm font-normal text-white/50">
                  ({displayedGenerations.length} found)
                </span>
              </>
            ) : (
              'Recent Generations'
            )}
          </h2>
          {/* Quilted Grid: fixed row height, dense packing, portraits fill gaps */}
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gridAutoRows: '200px',
              gridAutoFlow: 'dense'
            }}
          >
            {displayedGenerations.map((gen, index) => (
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
                onToggleSelection={e => onToggleSelection(gen.id, e)}
                onSaveAsElement={(url, type) => onSaveElement(url, type)}
                onFindSimilarComposition={() => handleFindSimilarComposition(gen.id)}
                onFindSimilarLighting={() => handleFindSimilarLighting(gen.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Batch Action Toolbar */}
      {selectedGenerationIds.length > 0 && (
        <div className="animate-in slide-in-from-bottom-4 fade-in absolute bottom-32 left-1/2 z-50 flex -translate-x-1/2 items-center gap-6 rounded-xl border border-white/10 bg-[#1a1a1a] px-6 py-3 shadow-2xl duration-200">
          <span className="text-sm font-medium text-white">
            {selectedGenerationIds.length} selected
          </span>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <select
              onChange={e => {
                if (e.target.value) onBatchMove(e.target.value);
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
              defaultValue=""
            >
              <option value="" disabled>
                Move to Session...
              </option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleBatchCopyLinks}
              className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-400"
            >
              <Copy className="h-4 w-4" /> Copy Links
            </button>
            <button
              onClick={onBatchDownload}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white"
            >
              <Download className="h-4 w-4" /> Download
            </button>
            <button
              onClick={onBatchDelete}
              className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-500"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
            <div className="mx-1 h-4 w-px bg-white/10" />
            <button
              onClick={deselectAllGenerations}
              className="p-1.5 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
