import { useState, useMemo } from 'react';
import { Generation, Element } from '@/lib/store';
import { GenerationCard } from '@/components/generations/GenerationCard';
import { GenerationSearch, GenerationSortFilterState } from '@/components/generations/GenerationSearch';
import { Copy, FilePlus, Trash2, CheckSquare, X, Download, Search } from 'lucide-react';
import { toast } from 'sonner';

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
  onReshoot?: (imageUrl: string, instruction: string) => Promise<void>;

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
  onReshoot,
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

  // Sort & Filter state
  const [sortFilter, setSortFilter] = useState<GenerationSortFilterState>({
    sortBy: 'date',
    sortOrder: 'desc',
    filterMediaType: [],
    filterStatus: [],
    filterAspectRatio: [],
  });

  // Helper to determine media type from generation
  const getMediaType = (gen: Generation): 'image' | 'video' => {
    // Check output type first
    const outputType = gen.outputs?.[0]?.type;
    if (outputType) return outputType;

    // Fall back to URL extension check
    const url = gen.outputs?.[0]?.url || '';
    if (url.match(/\.(mp4|webm|mov|avi)$/i)) {
      return 'video';
    }
    return 'image';
  };

  // Helper to extract aspect ratio from generation
  const getAspectRatio = (gen: Generation): string => {
    return gen.aspectRatio || '16:9';
  };

  // Display either search results or all generations, with filtering and sorting applied
  const displayedGenerations = useMemo(() => {
    let result = searchResults !== null ? (searchResults as Generation[]) : generations;

    // Apply filters
    if (sortFilter.filterMediaType.length > 0) {
      result = result.filter(gen => sortFilter.filterMediaType.includes(getMediaType(gen)));
    }

    if (sortFilter.filterStatus.length > 0) {
      result = result.filter(gen => {
        const status = gen.status || 'succeeded';
        // Map various status values to our filter categories
        if (sortFilter.filterStatus.includes('succeeded') && status === 'succeeded') {
          return true;
        }
        if (sortFilter.filterStatus.includes('processing') && (status === 'running' || status === 'queued')) {
          return true;
        }
        if (sortFilter.filterStatus.includes('failed') && status === 'failed') {
          return true;
        }
        return false;
      });
    }

    if (sortFilter.filterAspectRatio.length > 0) {
      result = result.filter(gen => {
        const ar = getAspectRatio(gen);
        return sortFilter.filterAspectRatio.includes(ar);
      });
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      let comparison = 0;

      switch (sortFilter.sortBy) {
        case 'date':
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          comparison = dateA - dateB;
          break;
        case 'name':
          const nameA = (a.inputPrompt || '').toLowerCase();
          const nameB = (b.inputPrompt || '').toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        case 'score':
          // For search results, use searchScore if available
          const scoreA = (a as any).searchScore || 0;
          const scoreB = (b as any).searchScore || 0;
          comparison = scoreA - scoreB;
          break;
      }

      return sortFilter.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [searchResults, generations, sortFilter]);

  const handleSearchResults = (results: any[], query: string) => {
    setSearchResults(results);
    setSearchQuery(query);
  };

  const handleClearSearch = () => {
    setSearchResults(null);
    setSearchQuery('');
  };

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  const handleFindSimilarComposition = async (generationId: string) => {
    toast.loading('Finding similar compositions...', { id: 'find-similar' });
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/projects/${projectId}/search/similar/${generationId}?type=framing`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setSearchResults(data.results);
          setSearchQuery(`Similar composition to #${generationId.slice(0, 8)}`);
          toast.success(`Found ${data.results.length} similar compositions`, { id: 'find-similar' });
        } else {
          toast.info('No similar compositions found. Try indexing more images.', { id: 'find-similar' });
        }
      }
    } catch (err) {
      console.error('Find similar composition failed:', err);
      toast.error('Failed to find similar compositions', { id: 'find-similar' });
    }
  };

  const handleFindSimilarLighting = async (generationId: string) => {
    toast.loading('Finding similar lighting...', { id: 'find-similar' });
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/projects/${projectId}/search/similar/${generationId}?type=lighting`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setSearchResults(data.results);
          setSearchQuery(`Similar lighting to #${generationId.slice(0, 8)}`);
          toast.success(`Found ${data.results.length} with similar lighting`, { id: 'find-similar' });
        } else {
          toast.info('No similar lighting found. Try indexing more images.', { id: 'find-similar' });
        }
      }
    } catch (err) {
      console.error('Find similar lighting failed:', err);
      toast.error('Failed to find similar lighting', { id: 'find-similar' });
    }
  };

  const handleFindSimilarVisual = async (generationId: string) => {
    toast.loading('Finding visually similar images (AI)...', { id: 'find-similar' });
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/projects/${projectId}/search/vector/similar/${generationId}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          // Convert to expected format
          const formattedResults = data.results.map((r: any) => ({
            ...r,
            id: r.generationId,
            score: Math.round(r.similarity * 100),
          }));
          setSearchResults(formattedResults);
          setSearchQuery(`Visually similar to #${generationId.slice(0, 8)}`);
          toast.success(`Found ${data.results.length} visually similar`, { id: 'find-similar' });
        } else {
          toast.info('No visually similar images found. Try embedding more images.', { id: 'find-similar' });
        }
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Vector search failed', { id: 'find-similar' });
      }
    } catch (err) {
      console.error('Find similar visual failed:', err);
      toast.error('Failed to find similar images', { id: 'find-similar' });
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
    // Select only the currently displayed (filtered) generations
    onSelectionChange(displayedGenerations.map(g => g.id));
  };

  const deselectAllGenerations = () => {
    onSelectionChange([]);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-32">
      <header className="mb-8">
        {/* Full-width title bar with integrated search - matches mockup exactly */}
        <GenerationSearch
          projectId={projectId}
          onSearchResults={handleSearchResults}
          onClearSearch={handleClearSearch}
          onSelectAll={selectAllGenerations}
          onSortFilterChange={setSortFilter}
        />
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
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
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
                onReshoot={onReshoot}
                isSelected={selectedGenerationIds.includes(gen.id)}
                onToggleSelection={e => onToggleSelection(gen.id, e)}
                onSaveAsElement={(url, type) => onSaveElement(url, type)}
                onFindSimilarComposition={handleFindSimilarComposition}
                onFindSimilarLighting={handleFindSimilarLighting}
                onFindSimilarVisual={handleFindSimilarVisual}
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
