"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Play, Film, Clock, Loader2, ChevronLeft, Settings } from "lucide-react";
import { BACKEND_URL } from "@/lib/api";
import StoryboardShot, { ShotData } from "@/components/storyboard/StoryboardShot";
import { clsx } from "clsx";

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
                setChains(prev => prev.map(c => c.id === chainId ? data : c));
            }
        } catch (error) {
            console.error('Failed to fetch chain details:', error);
        }
    };

    // Get selected chain
    const selectedChain = chains.find(c => c.id === selectedChainId);

    // Calculate total duration
    const totalDuration = selectedChain?.segments?.reduce((acc, seg) => acc + (seg.duration || 5), 0) || 0;

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
                    aspectRatio
                })
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
            const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: '',
                    duration: 10,
                    orderIndex: selectedChain?.segments?.length || 0
                })
            });

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
            const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${shotId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            if (res.ok) {
                // Optimistically update local state
                setChains(prev => prev.map(chain => {
                    if (chain.id !== selectedChainId) return chain;
                    return {
                        ...chain,
                        segments: chain.segments?.map(seg =>
                            seg.id === shotId ? { ...seg, ...updates } : seg
                        )
                    };
                }));
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
            const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${shotId}`, {
                method: 'DELETE'
            });

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
            const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${shotId}/frame`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                // Update local state with the new frame URL
                setChains(prev => prev.map(chain => {
                    if (chain.id !== selectedChainId) return chain;
                    return {
                        ...chain,
                        segments: chain.segments?.map(seg => {
                            if (seg.id !== shotId) return seg;
                            return {
                                ...seg,
                                [frameType === 'first' ? 'firstFrameUrl' : 'lastFrameUrl']: data.fileUrl
                            };
                        })
                    };
                }));
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
        setChains(prev => prev.map(chain => {
            if (chain.id !== selectedChainId) return chain;
            return {
                ...chain,
                segments: chain.segments?.map(seg =>
                    seg.id === shotId ? { ...seg, status: 'generating' as const } : seg
                )
            };
        }));

        try {
            const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${shotId}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aspectRatio })
            });

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
                const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${shotId}`);
                if (res.ok) {
                    const data = await res.json();

                    // Update local state
                    setChains(prev => prev.map(chain => {
                        if (chain.id !== selectedChainId) return chain;
                        return {
                            ...chain,
                            segments: chain.segments?.map(seg =>
                                seg.id === shotId ? { ...seg, ...data } : seg
                            )
                        };
                    }));

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
            <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-lg border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push(`/projects/${projectId}`)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold flex items-center gap-2">
                                    <Film className="w-5 h-5 text-purple-400" />
                                    Storyboard
                                </h1>
                                {selectedChain && (
                                    <p className="text-sm text-gray-400">{selectedChain.name}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Timeline summary */}
                            {selectedChain && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-white">
                                        {selectedChain.segments?.length || 0} shots
                                    </span>
                                    <span className="text-gray-500">•</span>
                                    <span className="text-sm text-purple-400 font-medium">
                                        {formatDuration(totalDuration)}
                                    </span>
                                </div>
                            )}

                            {/* Aspect ratio selector */}
                            <select
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
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
                                        "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                                        generatingShots.size > 0
                                            ? "bg-amber-500/20 text-amber-400 cursor-wait"
                                            : "bg-purple-600 text-white hover:bg-purple-500"
                                    )}
                                >
                                    {generatingShots.size > 0 ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Generating ({generatingShots.size})
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4" />
                                            Generate All
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex gap-8">
                    {/* Chain selector sidebar */}
                    <div className="w-64 flex-shrink-0">
                        <div className="sticky top-28">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Scenes</h2>
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    title="New Scene"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                {chains.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed border-white/10 rounded-lg">
                                        <Film className="w-8 h-8 mx-auto mb-2 opacity-50" />
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
                                                "w-full text-left p-3 rounded-lg border transition-all",
                                                selectedChainId === chain.id
                                                    ? "bg-purple-500/10 border-purple-500/30 text-white"
                                                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                                            )}
                                        >
                                            <div className="font-medium truncate">{chain.name}</div>
                                            {chain.description && (
                                                <div className="text-xs text-gray-500 truncate mt-1">{chain.description}</div>
                                            )}
                                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
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
                                        <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-xl">
                                            <Film className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                                            <p className="text-gray-500 mb-4">No shots in this scene yet</p>
                                            <button
                                                onClick={handleAddShot}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
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
                                                className="w-full py-4 border-2 border-dashed border-white/10 rounded-xl text-gray-500 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Plus className="w-5 h-5" />
                                                Add Shot
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Timeline visualization */}
                                {selectedChain.segments && selectedChain.segments.length > 0 && (
                                    <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
                                        <h3 className="text-sm font-medium text-gray-400 mb-3">Timeline</h3>
                                        <div className="flex gap-1 h-12">
                                            {selectedChain.segments.map((shot, index) => {
                                                const widthPercent = totalDuration > 0 ? ((shot.duration || 5) / totalDuration) * 100 : 100 / selectedChain.segments.length;
                                                return (
                                                    <div
                                                        key={shot.id}
                                                        className={clsx(
                                                            "h-full rounded flex items-center justify-center text-xs font-medium transition-all",
                                                            shot.status === 'complete'
                                                                ? "bg-green-500/30 text-green-300 border border-green-500/30"
                                                                : shot.status === 'generating'
                                                                    ? "bg-amber-500/30 text-amber-300 border border-amber-500/30 animate-pulse"
                                                                    : shot.status === 'failed'
                                                                        ? "bg-red-500/30 text-red-300 border border-red-500/30"
                                                                        : "bg-white/10 text-gray-400 border border-white/10"
                                                        )}
                                                        style={{ width: `${widthPercent}%`, minWidth: '40px' }}
                                                        title={`Shot ${index + 1}: ${shot.duration || 5}s`}
                                                    >
                                                        {index + 1}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="flex justify-between mt-2 text-xs text-gray-500">
                                            <span>0:00</span>
                                            <span>{formatDuration(totalDuration)}</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-20">
                                <Film className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                                <p className="text-gray-500 mb-4">Select a scene or create a new one to get started</p>
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
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
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setIsCreating(false)}>
                    <div className="bg-[#1a1a1a] rounded-xl border border-white/10 w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4">New Scene</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Scene Name</label>
                                <input
                                    type="text"
                                    value={newChainName}
                                    onChange={(e) => setNewChainName(e.target.value)}
                                    placeholder="e.g., Opening Sequence"
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Description (Optional)</label>
                                <textarea
                                    value={newChainDescription}
                                    onChange={(e) => setNewChainDescription(e.target.value)}
                                    placeholder="Brief description of the scene..."
                                    rows={3}
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateChain}
                                disabled={!newChainName.trim()}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
