'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Play, Film, Clock, Loader2, ChevronLeft, Settings } from 'lucide-react';
import { BACKEND_URL } from '@/lib/api';
import StoryboardShot, { ShotData } from '@/components/storyboard/StoryboardShot';
import { clsx } from 'clsx';

interface SceneChain {
  id: string;
  name: string;
  description?: string;
  status: string;
  targetDuration?: number;
  aspectRatio: string;
  segments: ShotData[];
}

export default function StoryboardPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  // Scene Chain state
  const [chains, setChains] = useState<SceneChain[]>([]);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Create chain modal
  const [isCreating, setIsCreating] = useState(false);
  const [newChainName, setNewChainName] = useState('');
  const [newChainDescription, setNewChainDescription] = useState('');

  // Settings
  const [aspectRatio, setAspectRatio] = useState('16:9');

  // Generation state
  const [generatingShots, setGeneratingShots] = useState<Set<string>>(new Set());

  // Load chains
  useEffect(() => {
    if (projectId) {
      fetchChains();
    }
  }, [projectId]);

  const fetchChains = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains`);
      if (res.ok) {
        const data = await res.json();
        setChains(data);

        // Auto-select first chain if none selected
        if (!selectedChainId && data.length > 0) {
          setSelectedChainId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch scene chains:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChainDetails = async (chainId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${chainId}`);
      if (res.ok) {
        const data = await res.json();
        setChains(prev => prev.map(c => (c.id === chainId ? data : c)));
      }
    } catch (error) {
      console.error('Failed to fetch chain details:', error);
    }
  };

  // Get selected chain
  const selectedChain = chains.find(c => c.id === selectedChainId);

  // Calculate total duration
  const totalDuration =
    selectedChain?.segments?.reduce((acc, seg) => acc + (seg.duration || 5), 0) || 0;

  // Create new chain
  const handleCreateChain = async () => {
    if (!newChainName.trim()) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChainName,
          description: newChainDescription,
          aspectRatio,
        }),
      });

      if (res.ok) {
        const newChain = await res.json();
        setChains(prev => [...prev, newChain]);
        setSelectedChainId(newChain.id);
        setIsCreating(false);
        setNewChainName('');
        setNewChainDescription('');
      }
    } catch (error) {
      console.error('Failed to create chain:', error);
    }
  };

  // Add new shot/segment
  const handleAddShot = async () => {
    if (!selectedChainId) return;

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: '',
            duration: 10,
            orderIndex: selectedChain?.segments?.length || 0,
          }),
        }
      );

      if (res.ok) {
        fetchChainDetails(selectedChainId);
      }
    } catch (error) {
      console.error('Failed to add segment:', error);
    }
  };

  // Update shot
  const handleUpdateShot = async (shotId: string, updates: Partial<ShotData>) => {
    if (!selectedChainId) return;

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${shotId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );

      if (res.ok) {
        // Optimistically update local state
        setChains(prev =>
          prev.map(chain => {
            if (chain.id !== selectedChainId) return chain;
            return {
              ...chain,
              segments: chain.segments?.map(seg =>
                seg.id === shotId ? { ...seg, ...updates } : seg
              ),
            };
          })
        );
      }
    } catch (error) {
      console.error('Failed to update segment:', error);
    }
  };

  // Delete shot
  const handleDeleteShot = async (shotId: string) => {
    if (!selectedChainId) return;
    if (!confirm('Delete this shot?')) return;

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${shotId}`,
        {
          method: 'DELETE',
        }
      );

      if (res.ok) {
        fetchChainDetails(selectedChainId);
      }
    } catch (error) {
      console.error('Failed to delete segment:', error);
    }
  };

  // Upload frame
  const handleUploadFrame = async (shotId: string, frameType: 'first' | 'last', file: File) => {
    if (!selectedChainId) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('frameType', frameType);

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${shotId}/frame`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (res.ok) {
        const data = await res.json();
        // Update local state with the new frame URL
        setChains(prev =>
          prev.map(chain => {
            if (chain.id !== selectedChainId) return chain;
            return {
              ...chain,
              segments: chain.segments?.map(seg => {
                if (seg.id !== shotId) return seg;
                return {
                  ...seg,
                  [frameType === 'first' ? 'firstFrameUrl' : 'lastFrameUrl']: data.fileUrl,
                };
              }),
            };
          })
        );
      }
    } catch (error) {
      console.error('Failed to upload frame:', error);
    }
  };

  // Generate single shot
  const handleGenerateShot = async (shotId: string) => {
    if (!selectedChainId) return;

    setGeneratingShots(prev => new Set(prev).add(shotId));

    // Update local status to generating
    setChains(prev =>
      prev.map(chain => {
        if (chain.id !== selectedChainId) return chain;
        return {
          ...chain,
          segments: chain.segments?.map(seg =>
            seg.id === shotId ? { ...seg, status: 'generating' as const } : seg
          ),
        };
      })
    );

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${shotId}/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aspectRatio }),
        }
      );

      if (res.ok) {
        // Poll for completion
        pollShotStatus(shotId);
      } else {
        setGeneratingShots(prev => {
          const next = new Set(prev);
          next.delete(shotId);
          return next;
        });
        handleUpdateShot(shotId, { status: 'failed', failureReason: 'Failed to start generation' });
      }
    } catch (error) {
      console.error('Failed to generate shot:', error);
      setGeneratingShots(prev => {
        const next = new Set(prev);
        next.delete(shotId);
        return next;
      });
      handleUpdateShot(shotId, { status: 'failed', failureReason: 'Network error' });
    }
  };

  // Poll shot status
  const pollShotStatus = async (shotId: string) => {
    if (!selectedChainId) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${shotId}`
        );
        if (res.ok) {
          const data = await res.json();

          // Update local state
          setChains(prev =>
            prev.map(chain => {
              if (chain.id !== selectedChainId) return chain;
              return {
                ...chain,
                segments: chain.segments?.map(seg =>
                  seg.id === shotId ? { ...seg, ...data } : seg
                ),
              };
            })
          );

          // Check for terminal status
          if (data.status === 'complete' || data.status === 'failed') {
            clearInterval(pollInterval);
            setGeneratingShots(prev => {
              const next = new Set(prev);
              next.delete(shotId);
              return next;
            });
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        clearInterval(pollInterval);
        setGeneratingShots(prev => {
          const next = new Set(prev);
          next.delete(shotId);
          return next;
        });
      }
    }, 3000);
  };

  // Generate all shots
  const handleGenerateAll = async () => {
    if (!selectedChain?.segments?.length) return;

    for (const segment of selectedChain.segments) {
      if (segment.status !== 'complete' && segment.prompt?.trim()) {
        await handleGenerateShot(segment.id);
        // Small delay between shots
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  // Format duration for display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/90 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/projects/${projectId}`)}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="flex items-center gap-2 text-xl font-bold">
                  <Film className="h-5 w-5 text-purple-400" />
                  Storyboard
                </h1>
                {selectedChain && <p className="text-sm text-gray-400">{selectedChain.name}</p>}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Timeline summary */}
              {selectedChain && (
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-white">
                    {selectedChain.segments?.length || 0} shots
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-sm font-medium text-purple-400">
                    {formatDuration(totalDuration)}
                  </span>
                </div>
              )}

              {/* Aspect ratio selector */}
              <select
                value={aspectRatio}
                onChange={e => setAspectRatio(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
              >
                <option value="16:9">16:9</option>
                <option value="9:16">9:16 (Vertical)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="4:3">4:3</option>
              </select>

              {/* Generate All button */}
              {selectedChain?.segments && selectedChain.segments.length > 0 && (
                <button
                  onClick={handleGenerateAll}
                  disabled={generatingShots.size > 0}
                  className={clsx(
                    'flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all',
                    generatingShots.size > 0
                      ? 'cursor-wait bg-amber-500/20 text-amber-400'
                      : 'bg-purple-600 text-white hover:bg-purple-500'
                  )}
                >
                  {generatingShots.size > 0 ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating ({generatingShots.size})
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Generate All
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex gap-8">
          {/* Chain selector sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="sticky top-28">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-wider text-gray-400 uppercase">
                  Scenes
                </h2>
                <button
                  onClick={() => setIsCreating(true)}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                  title="New Scene"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                {chains.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-white/10 py-8 text-center text-sm text-gray-500">
                    <Film className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    <p>No scenes yet</p>
                    <button
                      onClick={() => setIsCreating(true)}
                      className="mt-2 text-purple-400 hover:text-purple-300"
                    >
                      Create first scene
                    </button>
                  </div>
                ) : (
                  chains.map(chain => (
                    <button
                      key={chain.id}
                      onClick={() => {
                        setSelectedChainId(chain.id);
                        fetchChainDetails(chain.id);
                      }}
                      className={clsx(
                        'w-full rounded-lg border p-3 text-left transition-all',
                        selectedChainId === chain.id
                          ? 'border-purple-500/30 bg-purple-500/10 text-white'
                          : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <div className="truncate font-medium">{chain.name}</div>
                      {chain.description && (
                        <div className="mt-1 truncate text-xs text-gray-500">
                          {chain.description}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <span>{chain.segments?.length || 0} shots</span>
                        <span>•</span>
                        <span>{chain.aspectRatio}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main content - shots list */}
          <div className="flex-1">
            {selectedChain ? (
              <>
                {/* Shots list */}
                <div className="space-y-6">
                  {selectedChain.segments?.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-white/10 py-16 text-center">
                      <Film className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                      <p className="mb-4 text-gray-500">No shots in this scene yet</p>
                      <button
                        onClick={handleAddShot}
                        className="rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-500"
                      >
                        Add First Shot
                      </button>
                    </div>
                  ) : (
                    <>
                      {selectedChain.segments.map((shot, index) => (
                        <StoryboardShot
                          key={shot.id}
                          shot={{ ...shot, orderIndex: index, status: shot.status || 'pending' }}
                          sceneTitle={selectedChain.name}
                          sceneDescription={selectedChain.description}
                          onUpdate={handleUpdateShot}
                          onDelete={handleDeleteShot}
                          onGenerate={handleGenerateShot}
                          onUploadFrame={handleUploadFrame}
                          isGenerating={generatingShots.has(shot.id)}
                        />
                      ))}

                      {/* Add shot button */}
                      <button
                        onClick={handleAddShot}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/10 py-4 text-gray-500 transition-all hover:border-white/30 hover:bg-white/5 hover:text-white"
                      >
                        <Plus className="h-5 w-5" />
                        Add Shot
                      </button>
                    </>
                  )}
                </div>

                {/* Timeline visualization */}
                {selectedChain.segments && selectedChain.segments.length > 0 && (
                  <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-3 text-sm font-medium text-gray-400">Timeline</h3>
                    <div className="flex h-12 gap-1">
                      {selectedChain.segments.map((shot, index) => {
                        const widthPercent =
                          totalDuration > 0
                            ? ((shot.duration || 5) / totalDuration) * 100
                            : 100 / selectedChain.segments.length;
                        return (
                          <div
                            key={shot.id}
                            className={clsx(
                              'flex h-full items-center justify-center rounded text-xs font-medium transition-all',
                              shot.status === 'complete'
                                ? 'border border-green-500/30 bg-green-500/30 text-green-300'
                                : shot.status === 'generating'
                                  ? 'animate-pulse border border-amber-500/30 bg-amber-500/30 text-amber-300'
                                  : shot.status === 'failed'
                                    ? 'border border-red-500/30 bg-red-500/30 text-red-300'
                                    : 'border border-white/10 bg-white/10 text-gray-400'
                            )}
                            style={{ width: `${widthPercent}%`, minWidth: '40px' }}
                            title={`Shot ${index + 1}: ${shot.duration || 5}s`}
                          >
                            {index + 1}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                      <span>0:00</span>
                      <span>{formatDuration(totalDuration)}</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-20 text-center">
                <Film className="mx-auto mb-4 h-16 w-16 text-gray-600" />
                <p className="mb-4 text-gray-500">
                  Select a scene or create a new one to get started
                </p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="rounded-lg bg-purple-600 px-6 py-3 text-white transition-colors hover:bg-purple-500"
                >
                  Create Scene
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create chain modal */}
      {isCreating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsCreating(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-white/10 bg-[#1a1a1a] p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="mb-4 text-xl font-bold">New Scene</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Scene Name</label>
                <input
                  type="text"
                  value={newChainName}
                  onChange={e => setNewChainName(e.target.value)}
                  placeholder="e.g., Opening Sequence"
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white placeholder-gray-600 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">Description (Optional)</label>
                <textarea
                  value={newChainDescription}
                  onChange={e => setNewChainDescription(e.target.value)}
                  placeholder="Brief description of the scene..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white placeholder-gray-600 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-gray-400 transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChain}
                disabled={!newChainName.trim()}
                className="rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create Scene
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
