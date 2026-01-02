'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Plus, Play, Film, Clock, Loader2, Settings, X } from 'lucide-react';
import { ContextualBackButton } from '@/components/layout/ContextualBackButton';
import { BACKEND_URL } from '@/lib/api';
import StoryboardShot, { ShotData, calculateImageCost, calculateVideoCost, calculateTotalShotCost } from '@/components/storyboard/StoryboardShot';
import { formatCost } from '@/lib/ModelPricing';
import { clsx } from 'clsx';
import { Tooltip } from '@/components/ui/Tooltip';
import { SelectMenu } from '@/components/ui/SelectMenu';
import { usePageAutoSave, StoryboardSession, hasRecoverableContent } from '@/lib/pageSessionStore';
import { RecoveryToast } from '@/components/ui/RecoveryToast';

// Dynamic import for PromptBuilder (heavy modal component)
const PromptBuilder = dynamic(
  () => import('@/components/prompts/PromptBuilder').then(m => ({ default: m.PromptBuilder })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    ),
    ssr: false,
  }
);

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
  const [frameModel, setFrameModel] = useState('fal-ai/flux/dev');

  // Popular image generation models for frame generation
  const frameModels = [
    { id: 'fal-ai/flux/dev', name: 'FLUX.1 Dev', provider: 'Fal' },
    { id: 'fal-ai/flux/schnell', name: 'FLUX.1 Schnell', provider: 'Fal' },
    { id: 'fal-ai/flux-pro', name: 'FLUX.1 Pro', provider: 'Fal' },
    { id: 'fal-ai/flux-pro/v1.1-ultra', name: 'FLUX 1.1 Pro Ultra', provider: 'Fal' },
    { id: 'fal-ai/recraft-v3', name: 'Recraft V3', provider: 'Fal' },
    { id: 'fal-ai/ideogram/v3', name: 'Ideogram V3', provider: 'Fal' },
    { id: 'fal-ai/stable-diffusion-v35-large', name: 'SD 3.5 Large', provider: 'Fal' },
    { id: 'fal-ai/imagen4/preview', name: 'Imagen 4', provider: 'Fal' },
  ];

  // Video resolution state
  const [videoResolution, setVideoResolution] = useState('720p');

  // Video resolution options by model family
  // Maps model ID patterns to available resolutions
  const VIDEO_RESOLUTION_MAP: Record<string, { id: string; label: string; pixels: string }[]> = {
    'kling': [
      { id: '480p', label: '480p', pixels: '854×480' },
      { id: '720p', label: '720p', pixels: '1280×720' },
      { id: '1080p', label: '1080p', pixels: '1920×1080' },
    ],
    'wan': [
      { id: '480p', label: '480p', pixels: '854×480' },
      { id: '720p', label: '720p', pixels: '1280×720' },
      { id: '1080p', label: '1080p', pixels: '1920×1080' },
    ],
    'luma': [
      { id: '540p', label: '540p', pixels: '960×540' },
      { id: '720p', label: '720p', pixels: '1280×720' },
    ],
    'minimax': [
      { id: '720p', label: '720p', pixels: '1280×720' },
      { id: '1080p', label: '1080p', pixels: '1920×1080' },
    ],
    'vidu': [
      { id: '720p', label: '720p', pixels: '1280×720' },
      { id: '1080p', label: '1080p', pixels: '1920×1080' },
    ],
    'ltx': [
      { id: '480p', label: '480p', pixels: '768×512' },
      { id: '720p', label: '720p', pixels: '1280×720' },
    ],
    'hunyuan': [
      { id: '720p', label: '720p', pixels: '1280×720' },
      { id: '1080p', label: '1080p', pixels: '1920×1080' },
    ],
    'pixverse': [
      { id: '720p', label: '720p', pixels: '1280×720' },
      { id: '1080p', label: '1080p', pixels: '1920×1080' },
    ],
    'default': [
      { id: '480p', label: '480p', pixels: '854×480' },
      { id: '720p', label: '720p', pixels: '1280×720' },
      { id: '1080p', label: '1080p', pixels: '1920×1080' },
    ],
  };

  // Generation state
  const [generatingShots, setGeneratingShots] = useState<Set<string>>(new Set());
  const [generatingFirstFrames, setGeneratingFirstFrames] = useState<Set<string>>(new Set());
  const [generatingLastFrames, setGeneratingLastFrames] = useState<Set<string>>(new Set());

  // Elements for @reference autocomplete
  const [elements, setElements] = useState<Array<{
    id: string;
    name: string;
    type?: string;
    url?: string;
    fileUrl?: string;
    thumbnail?: string;
    projectId?: string;
  }>>([]);

  // Smart Prompt Builder state
  const [isPromptBuilderOpen, setIsPromptBuilderOpen] = useState(false);
  const [promptBuilderTarget, setPromptBuilderTarget] = useState<{
    shotId: string;
    frameType: 'first' | 'last' | 'video'; // 'video' for video prompt enhancement
    imageModelId?: string; // The image model used to generate this frame
    videoModelId?: string; // The video model (for video prompt enhancement)
  } | null>(null);

  // Session recovery
  const [hasMounted, setHasMounted] = useState(false);
  const [showRecoveryToast, setShowRecoveryToast] = useState(false);
  const [recoverableSession, setRecoverableSession] = useState<StoryboardSession | null>(null);
  const {
    saveSession,
    getSession,
    clearSession,
    dismissRecovery,
    isRecoveryDismissed,
  } = usePageAutoSave<StoryboardSession>('storyboard');

  // Mount detection
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Check for recoverable session
  useEffect(() => {
    if (!hasMounted || !projectId) return;
    const session = getSession(projectId);
    if (session && hasRecoverableContent(session) && !isRecoveryDismissed(projectId)) {
      setRecoverableSession(session);
      setShowRecoveryToast(true);
    }
  }, [hasMounted, projectId, getSession, isRecoveryDismissed]);

  // Auto-save session (save current selection state)
  useEffect(() => {
    if (!projectId || !hasMounted) return;
    // Only save if there's meaningful selection
    if (!selectedChainId) return;

    const saveInterval = setInterval(() => {
      saveSession({
        projectId,
        selectedSceneChainId: selectedChainId,
        isDirty: true,
      });
    }, 500);
    return () => clearInterval(saveInterval);
  }, [projectId, hasMounted, selectedChainId, aspectRatio, saveSession]);

  const handleRestoreSession = () => {
    if (!recoverableSession) return;
    // Restore selection state
    if (recoverableSession.selectedSceneChainId) {
      setSelectedChainId(recoverableSession.selectedSceneChainId);
      // Fetch the chain details after restoring
      fetchChainDetails(recoverableSession.selectedSceneChainId);
    }
    setShowRecoveryToast(false);
    setRecoverableSession(null);
  };

  const handleDismissRecovery = () => {
    if (projectId) {
      dismissRecovery(projectId);
      clearSession(projectId);
    }
    setShowRecoveryToast(false);
    setRecoverableSession(null);
  };

  // Load chains and elements
  useEffect(() => {
    if (projectId) {
      fetchChains();
      fetchElements();
    }
  }, [projectId]);

  const fetchElements = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/elements`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((e: Record<string, unknown>) => ({
          id: e.id as string,
          name: e.name as string,
          type: e.type as string,
          url: (() => {
            const u = e.fileUrl as string;
            if (!u) return '';
            if (u.startsWith('http') || u.startsWith('data:')) return u;
            return `${BACKEND_URL}${u.startsWith('/') ? '' : '/'}${u}`;
          })(),
          fileUrl: e.fileUrl as string,
          thumbnail: e.thumbnail as string,
          projectId: e.projectId as string,
        }));
        setElements(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch elements:', error);
    }
  };

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

  // Get available resolutions based on the selected chain's video model
  const getAvailableResolutions = () => {
    const defaultVideoModel = selectedChain?.segments?.[0]?.videoModel || 'fal-ai/kling-video/v2.1/master/image-to-video';
    const modelLower = defaultVideoModel.toLowerCase();

    for (const [key, resolutions] of Object.entries(VIDEO_RESOLUTION_MAP)) {
      if (key !== 'default' && modelLower.includes(key)) {
        return resolutions;
      }
    }
    return VIDEO_RESOLUTION_MAP.default;
  };

  const availableResolutions = getAvailableResolutions();

  // Calculate total duration
  const totalDuration =
    selectedChain?.segments?.reduce((acc, seg) => acc + (seg.duration || 5), 0) || 0;

  // Calculate SPENT cost totals for the scene (actual iterations run)
  const spentCosts = selectedChain?.segments?.reduce(
    (acc, seg) => {
      const shotCost = calculateTotalShotCost(seg);
      return {
        imageCost: acc.imageCost + shotCost.imageCost,
        videoCost: acc.videoCost + shotCost.videoCost,
        imageIterations: acc.imageIterations + shotCost.imageIterations,
        videoIterations: acc.videoIterations + shotCost.videoIterations,
      };
    },
    { imageCost: 0, videoCost: 0, imageIterations: 0, videoIterations: 0 }
  ) || { imageCost: 0, videoCost: 0, imageIterations: 0, videoIterations: 0 };

  // Calculate ESTIMATED cost for next run (1 iteration of each)
  const estimatedImageCost = selectedChain?.segments?.reduce((acc, seg) => {
    const costPerFrame = calculateImageCost(seg.imageModel, seg.imageResolution);
    return acc + (costPerFrame * 2); // First frame + Last frame
  }, 0) || 0;

  const estimatedVideoCost = selectedChain?.segments?.reduce((acc, seg) => {
    return acc + calculateVideoCost(seg.videoModel, seg.videoResolution, seg.duration || 5);
  }, 0) || 0;

  // Use spent costs if any iterations exist, otherwise show estimates
  const hasIterations = spentCosts.imageIterations > 0 || spentCosts.videoIterations > 0;
  const totalImageCost = hasIterations ? spentCosts.imageCost : estimatedImageCost;
  const totalVideoCost = hasIterations ? spentCosts.videoCost : estimatedVideoCost;
  const totalCost = totalImageCost + totalVideoCost;

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
          body: JSON.stringify({ aspectRatio, resolution: videoResolution }),
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

            // Increment video iteration count on successful completion
            if (data.status === 'complete') {
              const shot = selectedChain?.segments?.find(s => s.id === shotId);
              const newVideoIters = (shot?.videoIterations || 0) + 1;
              // Update local state
              setChains(prev =>
                prev.map(chain => {
                  if (chain.id !== selectedChainId) return chain;
                  return {
                    ...chain,
                    segments: chain.segments?.map(seg =>
                      seg.id === shotId ? { ...seg, videoIterations: newVideoIters } : seg
                    ),
                  };
                })
              );
              // Persist to backend
              handleUpdateShot(shotId, { videoIterations: newVideoIters });
            }
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

  // Generate single frame from prompt
  const handleGenerateFrame = async (shotId: string, frameType: 'first' | 'last') => {
    if (!selectedChainId) return;

    // Set generating state
    if (frameType === 'first') {
      setGeneratingFirstFrames(prev => new Set(prev).add(shotId));
    } else {
      setGeneratingLastFrames(prev => new Set(prev).add(shotId));
    }

    try {
      // Get the shot to extract element references from the prompt
      const shot = selectedChain?.segments?.find(s => s.id === shotId);
      const prompt = frameType === 'first' ? shot?.firstFramePrompt : shot?.lastFramePrompt;

      // Extract @ElementName references from prompt and resolve to image URLs
      const elementReferences: string[] = [];
      if (prompt) {
        const mentionPattern = /@(\w+)/g;
        let match;
        while ((match = mentionPattern.exec(prompt)) !== null) {
          const elementName = match[1];
          const element = elements.find(e =>
            e.name.toLowerCase() === elementName.toLowerCase() ||
            e.name.replace(/\s+/g, '').toLowerCase() === elementName.toLowerCase()
          );
          if (element) {
            const imageUrl = element.url || element.fileUrl || element.thumbnail;
            if (imageUrl) {
              elementReferences.push(imageUrl);
            }
          }
        }
      }

      const res = await fetch(
        `${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${shotId}/generate-frame`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frameType,
            model: frameModel,
            elementReferences: elementReferences.length > 0 ? elementReferences : undefined,
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        // Update local state with the new frame URL and increment iteration count
        // Backend returns { url: "..." } not { frameUrl: "..." }
        const urlField = frameType === 'first' ? 'firstFrameUrl' : 'lastFrameUrl';
        const iterField = frameType === 'first' ? 'firstFrameIterations' : 'lastFrameIterations';
        setChains(prev =>
          prev.map(chain => {
            if (chain.id !== selectedChainId) return chain;
            return {
              ...chain,
              segments: chain.segments?.map(seg => {
                if (seg.id !== shotId) return seg;
                const currentIters = seg[iterField] || 0;
                return { ...seg, [urlField]: data.url, [iterField]: currentIters + 1 };
              }),
            };
          })
        );
        // Persist iteration count to backend
        const shot = selectedChain?.segments?.find(s => s.id === shotId);
        const newIterCount = (shot?.[iterField] || 0) + 1;
        handleUpdateShot(shotId, { [iterField]: newIterCount });
      } else {
        const errorData = await res.json();
        console.error('Failed to generate frame:', errorData.error);
        alert(`Failed to generate frame: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to generate frame:', error);
      alert('Network error generating frame');
    } finally {
      // Clear generating state
      if (frameType === 'first') {
        setGeneratingFirstFrames(prev => {
          const next = new Set(prev);
          next.delete(shotId);
          return next;
        });
      } else {
        setGeneratingLastFrames(prev => {
          const next = new Set(prev);
          next.delete(shotId);
          return next;
        });
      }
    }
  };

  // Open Smart Prompt Builder for frame prompt enhancement
  const handleEnhanceFramePrompt = (shotId: string, frameType: 'first' | 'last') => {
    // Get the shot's image model selection for frame generation
    const shot = selectedChain?.segments?.find(s => s.id === shotId);
    setPromptBuilderTarget({
      shotId,
      frameType,
      imageModelId: shot?.imageModel || frameModel,
    });
    setIsPromptBuilderOpen(true);
  };

  // Open Smart Prompt Builder for video prompt enhancement
  const handleEnhanceVideoPrompt = (shotId: string) => {
    // Get the shot's video model selection for video generation
    const shot = selectedChain?.segments?.find(s => s.id === shotId);
    setPromptBuilderTarget({
      shotId,
      frameType: 'video',
      videoModelId: shot?.videoModel || 'fal-ai/kling-video/v2.1/master/image-to-video',
    });
    setIsPromptBuilderOpen(true);
  };

  // Get current prompt for Prompt Builder
  const getPromptBuilderInitialPrompt = () => {
    if (!promptBuilderTarget) return '';
    const shot = selectedChain?.segments?.find(s => s.id === promptBuilderTarget.shotId);
    if (!shot) return '';
    if (promptBuilderTarget.frameType === 'video') {
      return shot.prompt || '';
    }
    const field = promptBuilderTarget.frameType === 'first' ? 'firstFramePrompt' : 'lastFramePrompt';
    return shot[field] || '';
  };

  // Handle Prompt Builder result
  const handlePromptBuilderChange = (newPrompt: string) => {
    if (!promptBuilderTarget) return;
    if (promptBuilderTarget.frameType === 'video') {
      handleUpdateShot(promptBuilderTarget.shotId, { prompt: newPrompt });
    } else {
      const field = promptBuilderTarget.frameType === 'first' ? 'firstFramePrompt' : 'lastFramePrompt';
      handleUpdateShot(promptBuilderTarget.shotId, { [field]: newPrompt });
    }
    setIsPromptBuilderOpen(false);
    setPromptBuilderTarget(null);
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
      {/* Session Recovery Toast */}
      {recoverableSession && (
        <RecoveryToast
          isVisible={showRecoveryToast}
          savedAt={recoverableSession.savedAt}
          pageType="storyboard"
          onRestore={handleRestoreSession}
          onDismiss={handleDismissRecovery}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/90 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ContextualBackButton />
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

              {/* Cost summary */}
              {selectedChain && selectedChain.segments && selectedChain.segments.length > 0 && (
                <Tooltip
                  content={hasIterations
                    ? `Spent: ${spentCosts.imageIterations} frames (${formatCost(spentCosts.imageCost)}) + ${spentCosts.videoIterations} videos (${formatCost(spentCosts.videoCost)})`
                    : `Estimate: ${selectedChain.segments.length * 2} frames + ${selectedChain.segments.length} videos`
                  }
                  side="bottom"
                >
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
                    <span className={clsx(
                      'text-[10px] uppercase',
                      hasIterations ? 'text-cyan-400' : 'text-gray-500'
                    )}>
                      {hasIterations ? 'Spent' : 'Est.'}
                    </span>
                    <span className="text-xs text-amber-400">{formatCost(totalImageCost)}</span>
                    <span className="text-gray-600">+</span>
                    <span className="text-xs text-emerald-400">{formatCost(totalVideoCost)}</span>
                    <span className="text-gray-600">=</span>
                    <span className="text-sm font-medium text-white">{formatCost(totalCost)}</span>
                  </div>
                </Tooltip>
              )}

              {/* Model selector for frame generation */}
              <Tooltip content="Image model for First/Last Frame generation" side="bottom">
                <div>
                  <SelectMenu
                    options={frameModels.map(model => ({
                      value: model.id,
                      label: model.name,
                    }))}
                    value={frameModel}
                    onChange={setFrameModel}
                    variant="minimal"
                  />
                </div>
              </Tooltip>

              {/* Video resolution selector */}
              <Tooltip content="Video output resolution" side="bottom">
                <div>
                  <SelectMenu
                    options={availableResolutions.map(res => ({
                      value: res.id,
                      label: res.label,
                    }))}
                    value={videoResolution}
                    onChange={setVideoResolution}
                    variant="minimal"
                  />
                </div>
              </Tooltip>

              {/* Aspect ratio selector */}
              <SelectMenu
                options={[
                  { value: '16:9', label: '16:9' },
                  { value: '9:16', label: '9:16' },
                  { value: '1:1', label: '1:1' },
                  { value: '4:3', label: '4:3' },
                ]}
                value={aspectRatio}
                onChange={setAspectRatio}
                variant="minimal"
              />

              {/* Generate All button - Neon Glow CTA */}
              {selectedChain?.segments && selectedChain.segments.length > 0 && (
                <button
                  onClick={handleGenerateAll}
                  disabled={generatingShots.size > 0}
                  className={clsx(
                    'flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all',
                    generatingShots.size > 0
                      ? 'cursor-wait bg-amber-500/20 text-amber-400'
                      : 'bg-violet-600 text-white hover:bg-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]'
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
                <Tooltip content="New Scene" side="left">
                  <button
                    onClick={() => setIsCreating(true)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </Tooltip>
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
                          elements={elements}
                          projectId={projectId}
                          onUpdate={handleUpdateShot}
                          onDelete={handleDeleteShot}
                          onGenerate={handleGenerateShot}
                          onUploadFrame={handleUploadFrame}
                          onGenerateFrame={handleGenerateFrame}
                          onEnhanceFramePrompt={handleEnhanceFramePrompt}
                          onEnhanceVideoPrompt={handleEnhanceVideoPrompt}
                          isGenerating={generatingShots.has(shot.id)}
                          isGeneratingFirstFrame={generatingFirstFrames.has(shot.id)}
                          isGeneratingLastFrame={generatingLastFrames.has(shot.id)}
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

      {/* Smart Prompt Builder Modal */}
      {isPromptBuilderOpen && promptBuilderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1a1a1a] px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                Smart Prompt Builder - {promptBuilderTarget.frameType === 'video' ? 'Video' : promptBuilderTarget.frameType === 'first' ? 'First Frame' : 'Last Frame'}
              </h2>
              <button
                onClick={() => {
                  setIsPromptBuilderOpen(false);
                  setPromptBuilderTarget(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <PromptBuilder
              initialPrompt={getPromptBuilderInitialPrompt()}
              modelId={promptBuilderTarget.frameType === 'video'
                ? (promptBuilderTarget.videoModelId || 'fal-ai/kling-video/v2.1/master/image-to-video')
                : (promptBuilderTarget.imageModelId || frameModel)
              }
              generationType={promptBuilderTarget.frameType === 'video' ? 'video' : 'image'}
              elements={elements.map(e => ({
                id: e.id,
                name: e.name,
                type: (e.type as 'character' | 'prop' | 'location' | 'style') || 'character',
                description: '',
                imageUrl: e.url || e.fileUrl || e.thumbnail,
                consistencyWeight: 0.5,
              }))}
              initialLoRAs={[]}
              onPromptChange={(newPrompt, negativePrompt) => {
                handlePromptBuilderChange(newPrompt);
              }}
              onClose={() => {
                setIsPromptBuilderOpen(false);
                setPromptBuilderTarget(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
