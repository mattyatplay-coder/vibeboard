import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Play,
  X,
  Plus,
  Link2,
  Unlink,
  Video,
  Settings2,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useDroppable } from '@dnd-kit/core';
import { BACKEND_URL } from '@/lib/api';
import { ContinuityHeatmap } from '@/components/continuity/ContinuityHeatmap';
import { RenderQueuePanel } from './RenderQueuePanel';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';

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
  onFrameDropExternal?: (
    shotId: string,
    frameType: 'beginning' | 'ending',
    imageUrl: string
  ) => void;
}

// Ref type for external access to navigator methods
export interface ShotNavigatorRef {
  handleFrameDrop: (
    shotId: string,
    frameType: 'beginning' | 'ending',
    imageUrl: string
  ) => Promise<void>;
  refreshShots: () => void;
}

export const ShotNavigator = forwardRef<ShotNavigatorRef, ShotNavigatorProps>(
  (
    {
      projectId,
      scenes = [],
      activeDragId,
      isOverNavigator,
      onDropIndexChange,
      onRemove,
      onFrameDropExternal,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
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
      data: { isContainer: true },
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
        const res = await fetch(
          `${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}`
        );
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
          body: JSON.stringify({ name: newChainName }),
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
        const res = await fetch(
          `${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: '',
              duration: 5,
              orderIndex: shots.length,
            }),
          }
        );
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
        await fetch(
          `${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${shotId}`,
          {
            method: 'DELETE',
          }
        );
        fetchChainShots();
      } catch (error) {
        console.error('Failed to remove shot:', error);
      }
    };

    const handleFrameDropInternal = async (
      shotId: string,
      frameType: 'beginning' | 'ending',
      imageUrl: string
    ) => {
      if (!selectedChainId) return;

      const updateField = frameType === 'beginning' ? 'firstFrameUrl' : 'lastFrameUrl';

      try {
        await fetch(
          `${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${shotId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [updateField]: imageUrl }),
          }
        );
        fetchChainShots();
      } catch (error) {
        console.error('Failed to update frame:', error);
      }
    };

    // Expose methods via ref for parent component access
    useImperativeHandle(ref, () => ({
      handleFrameDrop: handleFrameDropInternal,
      refreshShots: fetchChainShots,
    }));

    const handleGenerateShot = async (shotId: string) => {
      if (!selectedChainId) return;
      try {
        await fetch(
          `${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${shotId}/generate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aspectRatio: '16:9' }),
          }
        );
        // Start polling
        pollShotStatus(shotId);
      } catch (error) {
        console.error('Failed to generate shot:', error);
      }
    };

    const pollShotStatus = async (shotId: string) => {
      const poll = setInterval(async () => {
        try {
          const res = await fetch(
            `${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${shotId}`
          );
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
      <TooltipProvider>
      <div className="border-b border-white/10 bg-[#0a0a0a]">
        {/* Header */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between px-8 py-3 transition-colors hover:bg-white/5"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <span>Shot Navigator</span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {/* Scene Chain Selector */}
              <div className="flex items-center gap-3 border-b border-white/5 px-8 py-2">
                <select
                  value={selectedChainId || ''}
                  onChange={e => setSelectedChainId(e.target.value || null)}
                  className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 focus:border-blue-500/50 focus:outline-none"
                >
                  <option value="">Select Scene...</option>
                  {sceneChains.map(chain => (
                    <option key={chain.id} value={chain.id}>
                      {chain.name}
                    </option>
                  ))}
                </select>

                {isCreatingChain ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newChainName}
                      onChange={e => setNewChainName(e.target.value)}
                      placeholder="Scene name..."
                      className="w-40 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 focus:border-blue-500/50 focus:outline-none"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCreateChain();
                        if (e.key === 'Escape') setIsCreatingChain(false);
                      }}
                    />
                    <button
                      onClick={handleCreateChain}
                      className="rounded bg-blue-500/20 px-3 py-1.5 text-sm text-blue-400 hover:bg-blue-500/30"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setIsCreatingChain(false)}
                      className="p-1.5 text-gray-500 hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsCreatingChain(true)}
                    className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-400 hover:bg-white/10 hover:text-gray-300"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Scene
                  </button>
                )}

                {/* Continuity Check Toggle */}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => setContinuityEnabled(!continuityEnabled)}
                    className={clsx(
                      'flex items-center gap-2 rounded border px-3 py-1.5 text-sm transition-all',
                      continuityEnabled
                        ? 'border-amber-500/30 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                        : 'border-white/10 bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                    )}
                  >
                    {continuityEnabled ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
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
                  'overflow-x-auto px-8 py-6 transition-colors',
                  activeDragId && 'bg-white/[0.02]',
                  isOverNavigator && 'bg-blue-500/5'
                )}
              >
                {selectedChainId ? (
                  <div className="flex min-w-max items-start gap-2">
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
                        onContinuityCheck={targetShot => {
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
                        'flex h-[160px] w-[280px] flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all',
                        shots.length === 0
                          ? 'border-blue-500/30 bg-blue-500/5 text-blue-400'
                          : 'border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-400'
                      )}
                    >
                      <Plus className="mb-2 h-8 w-8" />
                      <span className="text-sm font-medium">Add Shot</span>
                      {shots.length === 0 && (
                        <span className="mt-1 text-xs text-gray-500">
                          or drag a generation here
                        </span>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                    Select or create a scene to start building your storyboard
                  </div>
                )}
              </div>

              {/* Render Queue Panel */}
              {selectedChainId && shots.length > 0 && (
                <div className="border-t border-white/10 px-8 py-3">
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
                {showContinuityPanel &&
                  continuityReferenceUrl &&
                  continuityTargetShot?.firstFrameUrl && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-white/10"
                    >
                      <div className="px-8 py-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                            <span className="text-sm font-medium text-gray-300">
                              Continuity Check: Shot 1 → Shot{' '}
                              {shots.findIndex(s => s.id === continuityTargetShot.id) + 1}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setShowContinuityPanel(false);
                              setContinuityTargetShot(null);
                            }}
                            className="p-1 text-gray-500 transition-colors hover:text-white"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <ContinuityHeatmap
                          referenceImageUrl={
                            continuityReferenceUrl.startsWith('http')
                              ? continuityReferenceUrl
                              : `${BACKEND_URL}${continuityReferenceUrl}`
                          }
                          generatedImageUrl={
                            continuityTargetShot.firstFrameUrl.startsWith('http')
                              ? continuityTargetShot.firstFrameUrl
                              : `${BACKEND_URL}${continuityTargetShot.firstFrameUrl}`
                          }
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
      </TooltipProvider>
    );
  }
);

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

function ShotCard({
  shot,
  index,
  showInsertIndicator,
  onRemove,
  onFrameDrop,
  onGenerate,
  activeDragId,
  continuityEnabled,
  referenceImageUrl,
  onContinuityCheck,
}: ShotCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const beginningInputRef = useRef<HTMLInputElement>(null);
  const endingInputRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState<'beginning' | 'ending' | null>(null);

  // Droppable zones for beginning and ending frames
  const { setNodeRef: setBeginningRef, isOver: isOverBeginning } = useDroppable({
    id: `shot-${shot.id}-beginning`,
    data: { shotId: shot.id, frameType: 'beginning' },
  });

  const { setNodeRef: setEndingRef, isOver: isOverEnding } = useDroppable({
    id: `shot-${shot.id}-ending`,
    data: { shotId: shot.id, frameType: 'ending' },
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
        body: formData,
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
      <div
        className={clsx(
          'flex w-[280px] flex-col rounded-lg border bg-white/5 transition-all',
          shot.status === 'generating'
            ? 'border-amber-500/50'
            : shot.status === 'complete'
              ? 'border-green-500/30'
              : shot.status === 'failed'
                ? 'border-red-500/30'
                : 'border-white/10'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
              Shot {index + 1}
            </span>
            <span className="text-xs text-gray-500">{shot.duration}s</span>
          </div>
          <div className="flex items-center gap-1">
            {shot.status === 'generating' && (
              <span className="animate-pulse text-xs text-amber-400">Generating...</span>
            )}
            {/* Continuity Check Button - only show when enabled and shot has a beginning frame */}
            {continuityEnabled && shot.firstFrameUrl && referenceImageUrl && index > 0 && (
              <Tooltip content="Check visual continuity against reference" side="left">
                <button
                  onClick={() => onContinuityCheck?.(shot)}
                  className="rounded p-1 text-amber-400 transition-colors hover:bg-amber-500/10 hover:text-amber-300"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            )}
            <button
              onClick={() => onRemove(shot.id)}
              className="p-1 text-gray-500 transition-colors hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Hidden file inputs for click-to-upload */}
        <input
          ref={beginningInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
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
          onChange={e => {
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
              'relative aspect-video flex-1 overflow-hidden rounded-lg border-2 border-dashed transition-all',
              !hasBeginning && !isUploading && 'cursor-pointer',
              isOverBeginning && activeDragId
                ? 'scale-105 border-blue-500 bg-blue-500/10'
                : hasBeginning
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-white/20 hover:border-white/30 hover:bg-white/5'
            )}
          >
            {isUploading === 'beginning' ? (
              <div className="flex h-full w-full flex-col items-center justify-center text-blue-400">
                <div className="mb-1 h-5 w-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                <span className="text-[10px]">Uploading...</span>
              </div>
            ) : hasBeginning ? (
              <>
                <img
                  src={getImageUrl(shot.firstFrameUrl)}
                  alt="Beginning frame"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent pb-1 opacity-0 transition-opacity hover:opacity-100">
                  <span className="text-[10px] font-medium text-white">Beginning</span>
                </div>
              </>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-gray-500 transition-colors hover:text-gray-300">
                <Plus className="mb-1 h-4 w-4" />
                <span className="text-[10px]">Beginning</span>
                <span className="mt-0.5 text-[8px] text-gray-600">Click or drag</span>
              </div>
            )}
          </div>

          {/* Connection Line */}
          <div className="flex flex-col items-center gap-1">
            {hasBeginning && hasEnding ? (
              <Link2 className="h-4 w-4 text-green-400" />
            ) : (
              <Unlink className="h-4 w-4 text-gray-600" />
            )}
            <div
              className={clsx(
                'h-0.5 w-8 rounded-full',
                hasBeginning && hasEnding ? 'bg-green-500/50' : 'bg-white/10'
              )}
            />
          </div>

          {/* Ending Frame */}
          <div
            ref={setEndingRef}
            onClick={() => !hasEnding && !isUploading && handleFrameClick('ending')}
            className={clsx(
              'relative aspect-video flex-1 overflow-hidden rounded-lg border-2 border-dashed transition-all',
              !hasEnding && !isUploading && 'cursor-pointer',
              isOverEnding && activeDragId
                ? 'scale-105 border-purple-500 bg-purple-500/10'
                : hasEnding
                  ? 'border-purple-500/30 bg-purple-500/5'
                  : 'border-white/20 hover:border-white/30 hover:bg-white/5'
            )}
          >
            {isUploading === 'ending' ? (
              <div className="flex h-full w-full flex-col items-center justify-center text-purple-400">
                <div className="mb-1 h-5 w-5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                <span className="text-[10px]">Uploading...</span>
              </div>
            ) : hasEnding ? (
              <>
                <img
                  src={getImageUrl(shot.lastFrameUrl)}
                  alt="Ending frame"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent pb-1 opacity-0 transition-opacity hover:opacity-100">
                  <span className="text-[10px] font-medium text-white">Ending</span>
                </div>
              </>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-gray-500 transition-colors hover:text-gray-300">
                <Plus className="mb-1 h-4 w-4" />
                <span className="text-[10px]">Ending</span>
                <span className="mt-0.5 text-[8px] text-gray-600">Click or drag</span>
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
            <div className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-black/50">
              <video
                ref={videoRef}
                src={getImageUrl(shot.outputUrl) || undefined}
                className="h-full w-full object-cover"
                muted
                playsInline
                loop
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
                <Play className="h-8 w-8 fill-white/20 text-white" />
              </div>
              <div className="absolute bottom-2 left-2 rounded bg-green-500/80 px-2 py-0.5 text-[10px] font-medium text-white">
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
                'flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all',
                canGenerate && shot.status !== 'generating'
                  ? 'border border-blue-500/30 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                  : 'cursor-not-allowed border border-white/5 bg-white/5 text-gray-500'
              )}
            >
              {shot.status === 'generating' ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4" />
                  {canGenerate ? 'Generate Video' : 'Add frames to generate'}
                </>
              )}
            </button>
          </div>
        )}

        {/* Error State */}
        {shot.status === 'failed' && shot.failureReason && (
          <div className="px-3 pb-3">
            <div className="rounded border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs text-red-400">
              {shot.failureReason}
            </div>
          </div>
        )}
      </div>

      {/* Connection to next shot */}
      {index < 999 && ( // Always show connection placeholder
        <div className="flex w-4 items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-white/10" />
        </div>
      )}
    </div>
  );
}
