import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { ChevronDown, ChevronUp, Play, X, Plus, Link2, Unlink, Video, Settings2, Eye, EyeOff, AlertTriangle, CheckCircle, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { BACKEND_URL } from "@/lib/api";
import { ContinuityHeatmap } from "@/components/continuity/ContinuityHeatmap";
import { RenderQueuePanel } from "./RenderQueuePanel";

interface FrameSlot {
    id: string;
    type: 'beginning' | 'ending';
    shotIndex: number;
    imageUrl?: string | null;
    generationId?: string | null;
    prompt?: string;
}

interface Shot {
    id: string;
    orderIndex: number;
    prompt: string;
    duration: number;
    status: 'pending' | 'generating' | 'complete' | 'failed';
    firstFrameUrl?: string | null;
    lastFrameUrl?: string | null;
    outputUrl?: string | null;
    failureReason?: string | null;
}

interface SceneGroup {
    id: string;
    name: string;
    shots: Shot[];
}

interface ShotNavigatorProps {
    projectId: string;
    scenes?: any[]; // Legacy support
    activeDragId?: string | null;
    isOverNavigator?: boolean;
    onDropIndexChange?: (index: number | null) => void;
    onRemove?: (shotId: string) => void;
    onFrameDropExternal?: (shotId: string, frameType: 'beginning' | 'ending', imageUrl: string) => void;
}

// Ref type for external access to navigator methods
export interface ShotNavigatorRef {
    handleFrameDrop: (shotId: string, frameType: 'beginning' | 'ending', imageUrl: string) => Promise<void>;
    refreshShots: () => void;
}

export const ShotNavigator = forwardRef<ShotNavigatorRef, ShotNavigatorProps>(({
    projectId,
    scenes = [],
    activeDragId,
    isOverNavigator,
    onDropIndexChange,
    onRemove,
    onFrameDropExternal
}, ref) => {
    const [isOpen, setIsOpen] = useState(true);
    const [sceneChains, setSceneChains] = useState<any[]>([]);
    const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
    const [shots, setShots] = useState<Shot[]>([]);
    const [isCreatingChain, setIsCreatingChain] = useState(false);
    const [newChainName, setNewChainName] = useState('');

    // Continuity Check state
    const [continuityEnabled, setContinuityEnabled] = useState(false);
    const [continuityReferenceUrl, setContinuityReferenceUrl] = useState<string | null>(null);
    const [continuityTargetShot, setContinuityTargetShot] = useState<Shot | null>(null);
    const [showContinuityPanel, setShowContinuityPanel] = useState(false);

    // Container-level droppable
    const { setNodeRef: setContainerRef } = useDroppable({
        id: 'shot-navigator-container',
        data: { isContainer: true }
    });

    // Fetch scene chains
    useEffect(() => {
        if (projectId) {
            fetchSceneChains();
        }
    }, [projectId]);

    // Fetch shots when chain is selected
    useEffect(() => {
        if (selectedChainId) {
            fetchChainShots();
        }
    }, [selectedChainId]);

    const fetchSceneChains = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains`);
            if (res.ok) {
                const data = await res.json();
                setSceneChains(data);
                // Auto-select first chain if none selected
                if (data.length > 0 && !selectedChainId) {
                    setSelectedChainId(data[0].id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch scene chains:', error);
        }
    };

    const fetchChainShots = async () => {
        if (!selectedChainId) return;
        try {
            const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}`);
            if (res.ok) {
                const data = await res.json();
                setShots(data.segments || []);
            }
        } catch (error) {
            console.error('Failed to fetch chain:', error);
        }
    };

    const handleCreateChain = async () => {
        if (!newChainName.trim()) return;
        try {
            const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newChainName })
            });
            if (res.ok) {
                const newChain = await res.json();
                setSceneChains(prev => [...prev, newChain]);
                setSelectedChainId(newChain.id);
                setNewChainName('');
                setIsCreatingChain(false);
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error('Failed to create chain:', res.status, errorData);
                alert(`Failed to create scene: ${errorData.error || res.statusText}`);
            }
        } catch (error) {
            console.error('Failed to create chain:', error);
            alert('Failed to create scene - check console for details');
        }
    };

    const handleAddShot = async () => {
        if (!selectedChainId) return;
        try {
            const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: '',
                    duration: 5,
                    orderIndex: shots.length
                })
            });
            if (res.ok) {
                fetchChainShots();
            }
        } catch (error) {
            console.error('Failed to add shot:', error);
        }
    };

    const handleRemoveShot = async (shotId: string) => {
        if (!selectedChainId) return;
        try {
            await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${shotId}`, {
                method: 'DELETE'
            });
            fetchChainShots();
        } catch (error) {
            console.error('Failed to remove shot:', error);
        }
    };

    const handleFrameDropInternal = async (shotId: string, frameType: 'beginning' | 'ending', imageUrl: string) => {
        if (!selectedChainId) return;

        const updateField = frameType === 'beginning' ? 'firstFrameUrl' : 'lastFrameUrl';

        try {
            await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${shotId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [updateField]: imageUrl })
            });
            fetchChainShots();
        } catch (error) {
            console.error('Failed to update frame:', error);
        }
    };

    // Expose methods via ref for parent component access
    useImperativeHandle(ref, () => ({
        handleFrameDrop: handleFrameDropInternal,
        refreshShots: fetchChainShots
    }));

    const handleGenerateShot = async (shotId: string) => {
        if (!selectedChainId) return;
        try {
            await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${shotId}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aspectRatio: '16:9' })
            });
            // Start polling
            pollShotStatus(shotId);
        } catch (error) {
            console.error('Failed to generate shot:', error);
        }
    };

    const pollShotStatus = async (shotId: string) => {
        const poll = setInterval(async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${shotId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'complete' || data.status === 'failed') {
                        clearInterval(poll);
                        fetchChainShots();
                    }
                }
            } catch (error) {
                clearInterval(poll);
            }
        }, 3000);
    };

    const showInsertIndicators = !!(activeDragId && isOverNavigator);
    const selectedChain = sceneChains.find(c => c.id === selectedChainId);
    const totalDuration = shots.reduce((sum, s) => sum + (s.duration || 5), 0);

    return (
        <div className="border-b border-white/10 bg-[#0a0a0a]">
            {/* Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-8 py-3 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <span>Shot Navigator</span>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{shots.length} Shots</span>
                    <span>{totalDuration}s Total</span>
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        {/* Scene Chain Selector */}
                        <div className="px-8 py-2 border-b border-white/5 flex items-center gap-3">
                            <select
                                value={selectedChainId || ''}
                                onChange={(e) => setSelectedChainId(e.target.value || null)}
                                className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50"
                            >
                                <option value="">Select Scene...</option>
                                {sceneChains.map(chain => (
                                    <option key={chain.id} value={chain.id}>{chain.name}</option>
                                ))}
                            </select>

                            {isCreatingChain ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newChainName}
                                        onChange={(e) => setNewChainName(e.target.value)}
                                        placeholder="Scene name..."
                                        className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50 w-40"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleCreateChain();
                                            if (e.key === 'Escape') setIsCreatingChain(false);
                                        }}
                                    />
                                    <button
                                        onClick={handleCreateChain}
                                        className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded text-sm hover:bg-blue-500/30"
                                    >
                                        Create
                                    </button>
                                    <button
                                        onClick={() => setIsCreatingChain(false)}
                                        className="p-1.5 text-gray-500 hover:text-gray-300"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsCreatingChain(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-sm text-gray-400 hover:text-gray-300"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    New Scene
                                </button>
                            )}

                            {/* Continuity Check Toggle */}
                            <div className="ml-auto flex items-center gap-2">
                                <button
                                    onClick={() => setContinuityEnabled(!continuityEnabled)}
                                    className={clsx(
                                        "flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all border",
                                        continuityEnabled
                                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30"
                                            : "bg-white/5 text-gray-500 border-white/10 hover:bg-white/10 hover:text-gray-300"
                                    )}
                                >
                                    {continuityEnabled ? (
                                        <Eye className="w-3.5 h-3.5" />
                                    ) : (
                                        <EyeOff className="w-3.5 h-3.5" />
                                    )}
                                    Continuity Check
                                </button>
                            </div>
                        </div>

                        {/* Shots Grid */}
                        <div
                            ref={setContainerRef}
                            id="shot-navigator-container"
                            className={clsx(
                                "px-8 py-6 overflow-x-auto transition-colors",
                                activeDragId && "bg-white/[0.02]",
                                isOverNavigator && "bg-blue-500/5"
                            )}
                        >
                            {selectedChainId ? (
                                <div className="flex gap-2 min-w-max items-start">
                                    {shots.map((shot, index) => (
                                        <ShotCard
                                            key={shot.id}
                                            shot={shot}
                                            index={index}
                                            showInsertIndicator={showInsertIndicators}
                                            onRemove={handleRemoveShot}
                                            onFrameDrop={handleFrameDropInternal}
                                            onGenerate={handleGenerateShot}
                                            activeDragId={activeDragId}
                                            continuityEnabled={continuityEnabled}
                                            referenceImageUrl={shots[0]?.firstFrameUrl}
                                            onContinuityCheck={(targetShot) => {
                                                setContinuityTargetShot(targetShot);
                                                setContinuityReferenceUrl(shots[0]?.firstFrameUrl || null);
                                                setShowContinuityPanel(true);
                                            }}
                                        />
                                    ))}

                                    {/* Add Shot Button */}
                                    <button
                                        onClick={handleAddShot}
                                        className={clsx(
                                            "flex flex-col items-center justify-center w-[280px] h-[160px] border-2 border-dashed rounded-lg transition-all",
                                            shots.length === 0
                                                ? "border-blue-500/30 bg-blue-500/5 text-blue-400"
                                                : "border-white/10 hover:border-white/20 text-gray-500 hover:text-gray-400"
                                        )}
                                    >
                                        <Plus className="w-8 h-8 mb-2" />
                                        <span className="text-sm font-medium">Add Shot</span>
                                        {shots.length === 0 && (
                                            <span className="text-xs mt-1 text-gray-500">or drag a generation here</span>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
                                    Select or create a scene to start building your storyboard
                                </div>
                            )}
                        </div>

                        {/* Render Queue Panel */}
                        {selectedChainId && shots.length > 0 && (
                            <div className="px-8 py-3 border-t border-white/10">
                                <RenderQueuePanel
                                    projectId={projectId}
                                    sceneChainId={selectedChainId}
                                    shotCount={shots.length}
                                    onRenderComplete={(quality, outputs) => {
                                        console.log(`Render complete (${quality}):`, outputs);
                                        fetchChainShots();
                                    }}
                                />
                            </div>
                        )}

                        {/* Continuity Heatmap Panel */}
                        <AnimatePresence>
                            {showContinuityPanel && continuityReferenceUrl && continuityTargetShot?.firstFrameUrl && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden border-t border-white/10"
                                >
                                    <div className="px-8 py-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                                <span className="text-sm font-medium text-gray-300">
                                                    Continuity Check: Shot 1 → Shot {shots.findIndex(s => s.id === continuityTargetShot.id) + 1}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setShowContinuityPanel(false);
                                                    setContinuityTargetShot(null);
                                                }}
                                                className="p-1 text-gray-500 hover:text-white transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <ContinuityHeatmap
                                            referenceImageUrl={continuityReferenceUrl.startsWith('http') ? continuityReferenceUrl : `${BACKEND_URL}${continuityReferenceUrl}`}
                                            generatedImageUrl={continuityTargetShot.firstFrameUrl.startsWith('http') ? continuityTargetShot.firstFrameUrl : `${BACKEND_URL}${continuityTargetShot.firstFrameUrl}`}
                                            onClose={() => {
                                                setShowContinuityPanel(false);
                                                setContinuityTargetShot(null);
                                            }}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

ShotNavigator.displayName = 'ShotNavigator';

interface ShotCardProps {
    shot: Shot;
    index: number;
    showInsertIndicator?: boolean;
    onRemove: (id: string) => void;
    onFrameDrop: (shotId: string, frameType: 'beginning' | 'ending', imageUrl: string) => void;
    onGenerate: (shotId: string) => void;
    activeDragId?: string | null;
    continuityEnabled?: boolean;
    referenceImageUrl?: string | null;
    onContinuityCheck?: (shot: Shot) => void;
}

function ShotCard({ shot, index, showInsertIndicator, onRemove, onFrameDrop, onGenerate, activeDragId, continuityEnabled, referenceImageUrl, onContinuityCheck }: ShotCardProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const beginningInputRef = useRef<HTMLInputElement>(null);
    const endingInputRef = useRef<HTMLInputElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isUploading, setIsUploading] = useState<'beginning' | 'ending' | null>(null);

    // Droppable zones for beginning and ending frames
    const { setNodeRef: setBeginningRef, isOver: isOverBeginning } = useDroppable({
        id: `shot-${shot.id}-beginning`,
        data: { shotId: shot.id, frameType: 'beginning' }
    });

    const { setNodeRef: setEndingRef, isOver: isOverEnding } = useDroppable({
        id: `shot-${shot.id}-ending`,
        data: { shotId: shot.id, frameType: 'ending' }
    });

    // Handle file upload for frame slots
    const handleFileUpload = async (file: File, frameType: 'beginning' | 'ending') => {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        setIsUploading(frameType);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${BACKEND_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            const imageUrl = data.fileUrl || data.url;

            // Ensure URL is absolute
            const absoluteUrl = imageUrl.startsWith('http') ? imageUrl : `${BACKEND_URL}${imageUrl}`;

            // Call the frame drop handler with the uploaded image URL
            onFrameDrop(shot.id, frameType, absoluteUrl);
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload image. Please try again.');
        } finally {
            setIsUploading(null);
        }
    };

    const handleFrameClick = (frameType: 'beginning' | 'ending') => {
        const inputRef = frameType === 'beginning' ? beginningInputRef : endingInputRef;
        inputRef.current?.click();
    };

    const handleMouseEnter = () => {
        if (shot.outputUrl && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
        }
    };

    const handleMouseLeave = () => {
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    };

    const getImageUrl = (url?: string | null): string | undefined => {
        if (!url) return undefined;
        // Handle absolute URLs, data URLs, and relative URLs
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        return `${BACKEND_URL}${url}`;
    };

    const hasBeginning = !!shot.firstFrameUrl;
    const hasEnding = !!shot.lastFrameUrl;
    const canGenerate = hasBeginning && shot.status !== 'generating';

    return (
        <div className="flex items-center gap-1">
            {/* Shot Card */}
            <div className={clsx(
                "flex flex-col bg-white/5 rounded-lg border transition-all w-[280px]",
                shot.status === 'generating' ? "border-amber-500/50" :
                shot.status === 'complete' ? "border-green-500/30" :
                shot.status === 'failed' ? "border-red-500/30" : "border-white/10"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                            Shot {index + 1}
                        </span>
                        <span className="text-xs text-gray-500">{shot.duration}s</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {shot.status === 'generating' && (
                            <span className="text-xs text-amber-400 animate-pulse">Generating...</span>
                        )}
                        {/* Continuity Check Button - only show when enabled and shot has a beginning frame */}
                        {continuityEnabled && shot.firstFrameUrl && referenceImageUrl && index > 0 && (
                            <button
                                onClick={() => onContinuityCheck?.(shot)}
                                className="p-1 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded transition-colors"
                                title="Check visual continuity against reference"
                            >
                                <Eye className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button
                            onClick={() => onRemove(shot.id)}
                            className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Hidden file inputs for click-to-upload */}
                <input
                    ref={beginningInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'beginning');
                        e.target.value = ''; // Reset for re-upload
                    }}
                />
                <input
                    ref={endingInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'ending');
                        e.target.value = ''; // Reset for re-upload
                    }}
                />

                {/* Frames Row */}
                <div className="flex items-center gap-2 p-3">
                    {/* Beginning Frame */}
                    <div
                        ref={setBeginningRef}
                        onClick={() => !hasBeginning && !isUploading && handleFrameClick('beginning')}
                        className={clsx(
                            "flex-1 aspect-video rounded-lg border-2 border-dashed overflow-hidden transition-all relative",
                            !hasBeginning && !isUploading && "cursor-pointer",
                            isOverBeginning && activeDragId ? "border-blue-500 bg-blue-500/10 scale-105" :
                            hasBeginning ? "border-green-500/30 bg-green-500/5" : "border-white/20 hover:border-white/30 hover:bg-white/5"
                        )}
                    >
                        {isUploading === 'beginning' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-blue-400">
                                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-1" />
                                <span className="text-[10px]">Uploading...</span>
                            </div>
                        ) : hasBeginning ? (
                            <>
                                <img
                                    src={getImageUrl(shot.firstFrameUrl)}
                                    alt="Beginning frame"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center pb-1">
                                    <span className="text-[10px] text-white font-medium">Beginning</span>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 hover:text-gray-300 transition-colors">
                                <Plus className="w-4 h-4 mb-1" />
                                <span className="text-[10px]">Beginning</span>
                                <span className="text-[8px] text-gray-600 mt-0.5">Click or drag</span>
                            </div>
                        )}
                    </div>

                    {/* Connection Line */}
                    <div className="flex flex-col items-center gap-1">
                        {hasBeginning && hasEnding ? (
                            <Link2 className="w-4 h-4 text-green-400" />
                        ) : (
                            <Unlink className="w-4 h-4 text-gray-600" />
                        )}
                        <div className={clsx(
                            "w-8 h-0.5 rounded-full",
                            hasBeginning && hasEnding ? "bg-green-500/50" : "bg-white/10"
                        )} />
                    </div>

                    {/* Ending Frame */}
                    <div
                        ref={setEndingRef}
                        onClick={() => !hasEnding && !isUploading && handleFrameClick('ending')}
                        className={clsx(
                            "flex-1 aspect-video rounded-lg border-2 border-dashed overflow-hidden transition-all relative",
                            !hasEnding && !isUploading && "cursor-pointer",
                            isOverEnding && activeDragId ? "border-purple-500 bg-purple-500/10 scale-105" :
                            hasEnding ? "border-purple-500/30 bg-purple-500/5" : "border-white/20 hover:border-white/30 hover:bg-white/5"
                        )}
                    >
                        {isUploading === 'ending' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-purple-400">
                                <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mb-1" />
                                <span className="text-[10px]">Uploading...</span>
                            </div>
                        ) : hasEnding ? (
                            <>
                                <img
                                    src={getImageUrl(shot.lastFrameUrl)}
                                    alt="Ending frame"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center pb-1">
                                    <span className="text-[10px] text-white font-medium">Ending</span>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 hover:text-gray-300 transition-colors">
                                <Plus className="w-4 h-4 mb-1" />
                                <span className="text-[10px]">Ending</span>
                                <span className="text-[8px] text-gray-600 mt-0.5">Click or drag</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Output Preview / Generate Button */}
                {shot.outputUrl ? (
                    <div
                        className="px-3 pb-3"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-black/50 border border-white/10">
                            <video
                                ref={videoRef}
                                src={getImageUrl(shot.outputUrl) || undefined}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                loop
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
                                <Play className="w-8 h-8 text-white fill-white/20" />
                            </div>
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-green-500/80 rounded text-[10px] text-white font-medium">
                                Complete
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="px-3 pb-3">
                        <button
                            onClick={() => canGenerate && onGenerate(shot.id)}
                            disabled={!canGenerate || shot.status === 'generating'}
                            className={clsx(
                                "w-full py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                                canGenerate && shot.status !== 'generating'
                                    ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30"
                                    : "bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed"
                            )}
                        >
                            {shot.status === 'generating' ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Video className="w-4 h-4" />
                                    {canGenerate ? 'Generate Video' : 'Add frames to generate'}
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Error State */}
                {shot.status === 'failed' && shot.failureReason && (
                    <div className="px-3 pb-3">
                        <div className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1 border border-red-500/20">
                            {shot.failureReason}
                        </div>
                    </div>
                )}
            </div>

            {/* Connection to next shot */}
            {index < 999 && ( // Always show connection placeholder
                <div className="w-4 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white/10" />
                </div>
            )}
        </div>
    );
}
