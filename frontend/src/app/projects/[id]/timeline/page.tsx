'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
    ArrowLeft,
    Film,
    Download,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Plus,
    Upload,
    Video,
    Image as ImageIcon,
    X,
    GripVertical,
    Trash2,
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Maximize2,
    Minimize2,
    Layers,
} from 'lucide-react';
import { NLETimeline, TimelineClip } from '@/components/timeline';
import { OverlayTrackPanel } from '@/components/overlay/OverlayTrackPanel';
import { usePageAutoSave, TimelineSession, hasRecoverableContent } from '@/lib/pageSessionStore';
import { RecoveryToast } from '@/components/ui/RecoveryToast';
import { DeliveryModal } from '@/components/delivery/DeliveryModal';
import { Youtube } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface SceneChain {
    id: string;
    name: string;
    segments: Array<{
        id: string;
        orderIndex: number;
        prompt: string;
        duration: number;
        status: string;
        outputUrl?: string;
        firstFrameUrl?: string;
        lastFrameUrl?: string;
        trimStart: number;
        trimEnd: number;
        audioUrl?: string;
        audioTrimStart: number;
        audioTrimEnd: number;
        audioGain: number;
        transitionType?: string;
    }>;
}

interface Generation {
    id: string;
    inputPrompt: string;
    status: string;
    mode: string;
    outputs: Array<{ url: string; type: string }>;
    createdAt: string;
    thumbnailUrl?: string;
}

type EditMode = 'scene-chain' | 'quick-edit';

export default function TimelinePage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Mode
    const [editMode, setEditMode] = useState<EditMode>('scene-chain');

    // Scene Chain mode state
    const [sceneChains, setSceneChains] = useState<SceneChain[]>([]);
    const [selectedChainId, setSelectedChainId] = useState<string | null>(null);

    // Quick Edit mode state
    const [quickEditClips, setQuickEditClips] = useState<TimelineClip[]>([]);
    const [showGenerationPicker, setShowGenerationPicker] = useState(false);
    const [generations, setGenerations] = useState<Generation[]>([]);
    const [loadingGenerations, setLoadingGenerations] = useState(false);

    // Shared state
    const [clips, setClips] = useState<TimelineClip[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isBaking, setIsBaking] = useState(false);
    const [bakeResult, setBakeResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Preview Monitor state
    const videoPreviewRef = useRef<HTMLVideoElement>(null);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [previewExpanded, setPreviewExpanded] = useState(false);

    // Overlay Track state
    const [isOverlayPanelOpen, setIsOverlayPanelOpen] = useState(false);

    // YouTube Delivery state
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
    const [bakedVideoPath, setBakedVideoPath] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string>('Untitled Project');

    // Session recovery
    const [hasMounted, setHasMounted] = useState(false);
    const [showRecoveryToast, setShowRecoveryToast] = useState(false);
    const [recoverableSession, setRecoverableSession] = useState<TimelineSession | null>(null);
    const {
        saveSession,
        getSession,
        clearSession,
        dismissRecovery,
        isRecoveryDismissed,
    } = usePageAutoSave<TimelineSession>('timeline');

    // Mount detection for hydration
    useEffect(() => {
        setHasMounted(true);
    }, []);

    // Check for recoverable session on mount
    useEffect(() => {
        if (!hasMounted || !projectId) return;

        const session = getSession(projectId);
        if (session && hasRecoverableContent(session) && !isRecoveryDismissed(projectId)) {
            setRecoverableSession(session);
            setShowRecoveryToast(true);
        }
    }, [hasMounted, projectId, getSession, isRecoveryDismissed]);

    // Auto-save session every 500ms (only for quick edit mode clips)
    useEffect(() => {
        if (!projectId || !hasMounted || editMode !== 'quick-edit') return;

        const saveInterval = setInterval(() => {
            if (quickEditClips.length === 0) return;

            saveSession({
                projectId,
                clips: quickEditClips.map(clip => ({
                    id: clip.id,
                    videoUrl: clip.videoUrl,
                    name: clip.name,
                    duration: clip.duration,
                    trimStart: clip.trimStart,
                    trimEnd: clip.trimEnd,
                })),
                playheadPosition: currentTime,
                zoomLevel: 50,
                selectedClipId,
                isDirty: true,
            });
        }, 500);

        return () => clearInterval(saveInterval);
    }, [projectId, hasMounted, editMode, quickEditClips, currentTime, selectedClipId, saveSession]);

    // Handle session restore
    const handleRestoreSession = () => {
        if (!recoverableSession) return;

        // Restore quick edit clips
        if (recoverableSession.clips && recoverableSession.clips.length > 0) {
            const restoredClips: TimelineClip[] = recoverableSession.clips.map(clip => ({
                id: clip.id,
                name: clip.name,
                videoUrl: clip.videoUrl,
                duration: clip.duration,
                trimStart: clip.trimStart,
                trimEnd: clip.trimEnd,
                audioTrimStart: clip.trimStart,
                audioTrimEnd: clip.trimEnd,
                audioGain: 1,
                avLinked: true,
            }));
            setQuickEditClips(restoredClips);
            setEditMode('quick-edit');
        }

        if (recoverableSession.selectedClipId) {
            setSelectedClipId(recoverableSession.selectedClipId);
        }

        setShowRecoveryToast(false);
        setRecoverableSession(null);
    };

    // Handle dismiss recovery
    const handleDismissRecovery = () => {
        if (projectId) {
            dismissRecovery(projectId);
            clearSession(projectId);
        }
        setShowRecoveryToast(false);
        setRecoverableSession(null);
    };

    // Load scene chains
    useEffect(() => {
        async function loadChains() {
            try {
                const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains`);
                if (res.ok) {
                    const data = await res.json();
                    setSceneChains(data);
                    // Auto-select first chain with segments
                    const chainWithSegments = data.find((c: SceneChain) => c.segments?.length > 0);
                    if (chainWithSegments) {
                        setSelectedChainId(chainWithSegments.id);
                    }
                }
            } catch (error) {
                console.error('Failed to load scene chains:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadChains();
    }, [projectId]);

    // Update clips based on mode
    useEffect(() => {
        if (editMode === 'quick-edit') {
            setClips(quickEditClips);
        } else if (selectedChainId) {
            const chain = sceneChains.find(c => c.id === selectedChainId);
            if (chain?.segments) {
                const timelineClips: TimelineClip[] = chain.segments
                    .filter(seg => seg.status === 'complete' && seg.outputUrl)
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map(seg => ({
                        id: seg.id,
                        name: seg.prompt?.substring(0, 30) || `Shot ${seg.orderIndex + 1}`,
                        videoUrl: seg.outputUrl!,
                        audioUrl: seg.audioUrl,
                        duration: seg.duration,
                        trimStart: seg.trimStart || 0,
                        trimEnd: seg.trimEnd || seg.duration,
                        audioTrimStart: seg.audioTrimStart ?? 0,
                        audioTrimEnd: seg.audioTrimEnd ?? seg.duration,
                        audioGain: seg.audioGain ?? 1,
                        avLinked: true,
                        thumbnailUrl: seg.firstFrameUrl,
                    }));
                setClips(timelineClips);
            } else {
                setClips([]);
            }
        } else {
            setClips([]);
        }
    }, [editMode, selectedChainId, sceneChains, quickEditClips]);

    // Load generations for picker
    const loadGenerations = useCallback(async () => {
        setLoadingGenerations(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/generations?status=succeeded&mode=video`);
            if (res.ok) {
                const data = await res.json();
                // Filter to only video generations with outputs
                const videoGens = (data.generations || data).filter((g: Generation) =>
                    g.outputs?.some(o => o.type === 'video' || o.url?.includes('.mp4'))
                );
                setGenerations(videoGens);
            }
        } catch (error) {
            console.error('Failed to load generations:', error);
        } finally {
            setLoadingGenerations(false);
        }
    }, [projectId]);

    // Open generation picker
    const handleOpenPicker = useCallback(() => {
        setShowGenerationPicker(true);
        loadGenerations();
    }, [loadGenerations]);

    // Add generation to quick edit clips
    const handleAddGeneration = useCallback((generation: Generation) => {
        const videoOutput = generation.outputs?.find(o => o.type === 'video' || o.url?.includes('.mp4'));
        if (!videoOutput) return;

        const newClip: TimelineClip = {
            id: `quick-${generation.id}-${Date.now()}`,
            name: generation.inputPrompt?.substring(0, 30) || 'Imported video',
            videoUrl: videoOutput.url,
            duration: 5, // Default duration, will be updated when video loads
            trimStart: 0,
            trimEnd: 5,
            audioTrimStart: 0,
            audioTrimEnd: 5,
            audioGain: 1,
            avLinked: true,
            thumbnailUrl: generation.thumbnailUrl,
        };

        setQuickEditClips(prev => [...prev, newClip]);
        setShowGenerationPicker(false);
    }, [quickEditClips.length]);

    // Handle video upload
    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            // Use the dedicated timeline upload endpoint on backend
            const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/timeline/upload`, {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                const videoUrl = data.fileUrl;

                const newClip: TimelineClip = {
                    id: `upload-${Date.now()}`,
                    name: file.name.replace(/\.[^/.]+$/, ''),
                    videoUrl: videoUrl,
                    duration: 5, // Default, could probe video duration
                    trimStart: 0,
                    trimEnd: 5,
                    audioTrimStart: 0,
                    audioTrimEnd: 5,
                    audioGain: 1,
                    avLinked: true,
                };

                setQuickEditClips(prev => [...prev, newClip]);
            } else {
                const error = await res.json();
                console.error('Upload failed:', error);
            }
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [projectId, quickEditClips.length]);

    // Remove clip from quick edit
    const handleRemoveQuickClip = useCallback((clipId: string) => {
        setQuickEditClips(prev => {
            const filtered = prev.filter(c => c.id !== clipId);
            return filtered;
        });
    }, []);

    // Get selected clip for preview
    const selectedClip = clips.find(c => c.id === selectedClipId) || clips[0];
    const previewVideoUrl = selectedClip?.videoUrl
        ? (selectedClip.videoUrl.startsWith('http') ? selectedClip.videoUrl : `${BACKEND_URL}${selectedClip.videoUrl}`)
        : null;

    // Auto-select first clip when clips change
    // NOTE: We use a ref to track the previous clips length to prevent re-running on every selectedClipId change
    const prevClipsLengthRef = useRef(0);
    useEffect(() => {
        // Only auto-select if clips array actually changed (new clips loaded) and we don't have a selection
        const clipsChanged = clips.length !== prevClipsLengthRef.current;
        prevClipsLengthRef.current = clips.length;

        if (clips.length > 0 && (!selectedClipId || clipsChanged && !clips.find(c => c.id === selectedClipId))) {
            // Only auto-select if no selection OR if current selection is no longer valid
            setSelectedClipId(clips[0].id);
        } else if (clips.length === 0) {
            setSelectedClipId(null);
        }
    }, [clips, selectedClipId]);

    // Video preview controls
    const handlePlayPause = useCallback(() => {
        if (videoPreviewRef.current) {
            if (isPlaying) {
                videoPreviewRef.current.pause();
            } else {
                videoPreviewRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    }, [isPlaying]);

    const handleSkipPrevious = useCallback(() => {
        const currentIndex = clips.findIndex(c => c.id === selectedClipId);
        if (currentIndex > 0) {
            setSelectedClipId(clips[currentIndex - 1].id);
            setIsPlaying(false);
        }
    }, [clips, selectedClipId]);

    const handleSkipNext = useCallback(() => {
        const currentIndex = clips.findIndex(c => c.id === selectedClipId);
        if (currentIndex < clips.length - 1) {
            setSelectedClipId(clips[currentIndex + 1].id);
            setIsPlaying(false);
        }
    }, [clips, selectedClipId]);

    const handleTimeUpdate = useCallback(() => {
        if (videoPreviewRef.current) {
            setCurrentTime(videoPreviewRef.current.currentTime);
        }
    }, []);

    const handleVideoEnded = useCallback(() => {
        setIsPlaying(false);
        // Auto-advance to next clip
        const currentIndex = clips.findIndex(c => c.id === selectedClipId);
        if (currentIndex < clips.length - 1) {
            setSelectedClipId(clips[currentIndex + 1].id);
        }
    }, [clips, selectedClipId]);

    // Memoized callbacks for NLETimeline to prevent unnecessary re-renders
    const handleNLEClipSelect = useCallback((clipId: string) => {
        setSelectedClipId(clipId);
    }, []);

    const handleNLEPlaybackChange = useCallback((playing: boolean, time: number) => {
        // Sync NLE Timeline playhead with Preview Monitor
        // The 'time' is the global timeline time (cumulative across all clips)
        // We need to find which clip corresponds to this time and seek within it
        let accumulatedTime = 0;
        for (const clip of clips) {
            const effectiveDuration = clip.duration - clip.trimStart - clip.trimEnd;
            if (time < accumulatedTime + effectiveDuration) {
                // Found the clip - select it and seek within it
                if (clip.id !== selectedClipId) {
                    setSelectedClipId(clip.id);
                }
                const clipLocalTime = time - accumulatedTime + clip.trimStart;
                if (videoPreviewRef.current) {
                    videoPreviewRef.current.currentTime = clipLocalTime;
                    setCurrentTime(clipLocalTime);
                }
                break;
            }
            accumulatedTime += effectiveDuration;
        }
        setIsPlaying(playing);
    }, [clips, selectedClipId]);

    // Frame-by-frame navigation (1 frame = 1/24 second at 24fps)
    const handleFrameBack = useCallback(() => {
        if (videoPreviewRef.current) {
            const fps = 24;
            const newTime = Math.max(0, videoPreviewRef.current.currentTime - 1 / fps);
            videoPreviewRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    }, []);

    const handleFrameForward = useCallback(() => {
        if (videoPreviewRef.current) {
            const fps = 24;
            const duration = selectedClip?.duration || videoPreviewRef.current.duration || 0;
            const newTime = Math.min(duration, videoPreviewRef.current.currentTime + 1 / fps);
            videoPreviewRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    }, [selectedClip?.duration]);

    // Format timecode as SMPTE (HH:MM:SS:FF)
    const formatTimecode = (seconds: number, fps: number = 24): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const f = Math.floor((seconds % 1) * fps);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
    };

    // Format timecode with milliseconds (HH:MM:SS.mmm)
    const formatTimecodeWithMs = (seconds: number): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    };

    // State for timecode display mode
    const [showMilliseconds, setShowMilliseconds] = useState(true);

    // Keyboard shortcuts for preview
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't capture if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    handlePlayPause();
                    break;
                case 'j':
                    e.preventDefault();
                    handleSkipPrevious();
                    break;
                case 'l':
                    e.preventDefault();
                    handleSkipNext();
                    break;
                case 'm':
                    e.preventDefault();
                    setIsMuted(prev => !prev);
                    break;
                case 'f':
                    e.preventDefault();
                    setPreviewExpanded(prev => !prev);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    handleFrameBack();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    handleFrameForward();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlePlayPause, handleSkipPrevious, handleSkipNext, handleFrameBack, handleFrameForward]);

    // NLE Timeline handlers
    const handleClipsChange = useCallback((newClips: TimelineClip[]) => {
        setClips(newClips);
        if (editMode === 'quick-edit') {
            setQuickEditClips(newClips);
        }
    }, [editMode]);

    const handleTimeChange = useCallback((time: number) => {
        setCurrentTime(time);
    }, []);

    const handlePlayPauseToggle = useCallback(() => {
        setIsPlaying(prev => !prev);
    }, []);

    const handleDeleteClip = useCallback((clipId: string) => {
        if (editMode === 'quick-edit') {
            setQuickEditClips(prev => prev.filter(c => c.id !== clipId));
        }
        setClips(prev => prev.filter(c => c.id !== clipId));
    }, [editMode]);

    // Handle clip update (trim changes)
    const handleClipUpdate = useCallback(async (clipId: string, updates: Partial<TimelineClip>) => {
        if (editMode === 'quick-edit') {
            setQuickEditClips(prev => prev.map(clip =>
                clip.id === clipId ? { ...clip, ...updates } : clip
            ));
        } else if (selectedChainId) {
            // Update local state immediately
            setClips(prev => prev.map(clip =>
                clip.id === clipId ? { ...clip, ...updates } : clip
            ));

            // Persist to backend
            try {
                await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/segments/${clipId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        trimStart: updates.trimStart,
                        trimEnd: updates.trimEnd,
                    }),
                });
            } catch (error) {
                console.error('Failed to update segment trim:', error);
            }
        }
    }, [editMode, projectId, selectedChainId]);

    // Bake timeline (for scene chain mode)
    const handleBake = useCallback(async () => {
        if (editMode === 'scene-chain' && !selectedChainId) return;

        setIsBaking(true);
        setBakeResult(null);

        try {
            if (editMode === 'scene-chain') {
                const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}/bake`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fps: 24,
                        codec: 'h264',
                        quality: 'master',
                        includeAudio: true,
                    }),
                });

                const data = await res.json();

                if (res.ok && data.success) {
                    setBakeResult({ success: true, url: data.finalVideoUrl });
                    // Store path for YouTube upload
                    if (data.videoPath) {
                        setBakedVideoPath(data.videoPath);
                    }
                } else {
                    setBakeResult({ success: false, error: data.error || 'Bake failed' });
                }
            } else {
                // Quick edit mode - use direct bake endpoint
                const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/timeline/bake`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clips: quickEditClips.map(c => ({
                            videoUrl: c.videoUrl?.startsWith('http') ? c.videoUrl : `${BACKEND_URL}${c.videoUrl}`,
                            duration: c.duration,
                            trimStart: c.trimStart,
                            trimEnd: c.trimEnd,
                        })),
                        fps: 24,
                        codec: 'h264',
                        quality: 'master',
                    }),
                });

                const data = await res.json();

                if (res.ok && data.success) {
                    setBakeResult({ success: true, url: data.finalVideoUrl });
                    // Store path for YouTube upload
                    if (data.videoPath) {
                        setBakedVideoPath(data.videoPath);
                    }
                } else {
                    setBakeResult({ success: false, error: data.error || 'Bake failed' });
                }
            }
        } catch (error: any) {
            setBakeResult({ success: false, error: error.message });
        } finally {
            setIsBaking(false);
        }
    }, [editMode, projectId, selectedChainId, quickEditClips]);

    // Calculate total duration
    const totalDuration = clips.reduce((sum, clip) =>
        sum + (clip.duration - clip.trimStart - clip.trimEnd), 0
    );

    const selectedChain = sceneChains.find(c => c.id === selectedChainId);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-black text-white">
            {/* Session Recovery Toast */}
            <RecoveryToast
                isVisible={showRecoveryToast}
                savedAt={recoverableSession?.savedAt || 0}
                pageType="timeline"
                onRestore={handleRestoreSession}
                onDismiss={handleDismissRecovery}
            />

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
            />

            {/* Header */}
            <header className="flex h-14 items-center justify-between border-b border-white/10 bg-black/50 px-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-400 hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back</span>
                    </button>
                    <div className="h-6 w-px bg-white/10" />
                    <Film className="h-5 w-5 text-cyan-500" />
                    <h1 className="text-lg font-semibold">NLE Timeline</h1>

                    {/* Mode Toggle */}
                    <div className="ml-4 flex rounded-lg border border-white/10 bg-white/5 p-0.5">
                        <button
                            onClick={() => setEditMode('scene-chain')}
                            className={clsx(
                                'rounded-md px-3 py-1 text-xs font-medium transition-all',
                                editMode === 'scene-chain'
                                    ? 'bg-cyan-500 text-white'
                                    : 'text-gray-400 hover:text-white'
                            )}
                        >
                            Scene Chains
                        </button>
                        <button
                            onClick={() => setEditMode('quick-edit')}
                            className={clsx(
                                'rounded-md px-3 py-1 text-xs font-medium transition-all',
                                editMode === 'quick-edit'
                                    ? 'bg-purple-500 text-white'
                                    : 'text-gray-400 hover:text-white'
                            )}
                        >
                            Quick Edit
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Mode-specific controls */}
                    {editMode === 'scene-chain' ? (
                        <select
                            value={selectedChainId || ''}
                            onChange={(e) => setSelectedChainId(e.target.value || null)}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
                        >
                            <option value="">Select Scene Chain</option>
                            {sceneChains.map(chain => (
                                <option key={chain.id} value={chain.id}>
                                    {chain.name} ({chain.segments?.length || 0} segments)
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleOpenPicker}
                                className="flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-sm text-purple-400 hover:bg-purple-500/20"
                            >
                                <Video className="h-4 w-4" />
                                Add Generation
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-400 hover:bg-white/10 hover:text-white"
                            >
                                {isUploading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="h-4 w-4" />
                                )}
                                Upload Video
                            </button>
                        </div>
                    )}

                    {/* Duration Badge */}
                    <div className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-gray-400">
                        {totalDuration.toFixed(1)}s
                    </div>

                    {/* Overlays Button */}
                    <button
                        onClick={() => setIsOverlayPanelOpen(true)}
                        className={clsx(
                            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                            isOverlayPanelOpen
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                        )}
                    >
                        <Layers className="h-4 w-4" />
                        Overlays
                    </button>

                    {/* Bake Button */}
                    <button
                        onClick={handleBake}
                        disabled={isBaking || clips.length === 0}
                        className={clsx(
                            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                            isBaking
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400',
                            'disabled:cursor-not-allowed disabled:opacity-50'
                        )}
                    >
                        {isBaking ? (
                            <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Baking...
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4" />
                                Bake Timeline
                            </>
                        )}
                    </button>
                </div>
            </header>

            {/* Bake Result Toast */}
            <AnimatePresence>
                {bakeResult && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={clsx(
                            'absolute left-1/2 top-16 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg px-4 py-3 shadow-lg',
                            bakeResult.success
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        )}
                    >
                        {bakeResult.success ? (
                            <>
                                <CheckCircle2 className="h-5 w-5" />
                                <span>Bake complete!</span>
                                <a
                                    href={bakeResult.url}
                                    download
                                    className="ml-2 rounded bg-green-500/20 px-2 py-1 text-xs hover:bg-green-500/30"
                                >
                                    Download
                                </a>
                                <button
                                    onClick={() => {
                                        setIsDeliveryModalOpen(true);
                                        setBakeResult(null);
                                    }}
                                    className="ml-2 flex items-center gap-1 rounded bg-red-500/20 px-2 py-1 text-xs text-red-400 hover:bg-red-500/30"
                                >
                                    <Youtube className="h-3 w-3" />
                                    YouTube
                                </button>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="h-5 w-5" />
                                <span>{bakeResult.error}</span>
                            </>
                        )}
                        <button
                            onClick={() => setBakeResult(null)}
                            className="ml-2 text-white/50 hover:text-white"
                        >
                            ×
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Generation Picker Modal */}
            <AnimatePresence>
                {showGenerationPicker && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
                        onClick={() => setShowGenerationPicker(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-xl border border-white/10 bg-zinc-900"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <Video className="h-5 w-5 text-purple-400" />
                                    <h2 className="text-lg font-semibold">Select Video Generation</h2>
                                </div>
                                <button
                                    onClick={() => setShowGenerationPicker(false)}
                                    className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="max-h-[60vh] overflow-y-auto p-4">
                                {loadingGenerations ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                                    </div>
                                ) : generations.length === 0 ? (
                                    <div className="py-12 text-center text-gray-500">
                                        <Video className="mx-auto h-12 w-12 text-gray-600" />
                                        <p className="mt-2">No video generations found</p>
                                        <p className="text-sm">Generate some videos first, then come back here</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-4">
                                        {generations.map(gen => {
                                            const videoOutput = gen.outputs?.find(o => o.type === 'video' || o.url?.includes('.mp4'));
                                            return (
                                                <button
                                                    key={gen.id}
                                                    onClick={() => handleAddGeneration(gen)}
                                                    className="group overflow-hidden rounded-lg border border-white/10 bg-white/5 transition-all hover:border-purple-500/50 hover:bg-purple-500/10"
                                                >
                                                    <div className="aspect-video bg-black">
                                                        {gen.thumbnailUrl ? (
                                                            <img
                                                                src={gen.thumbnailUrl.startsWith('http') ? gen.thumbnailUrl : `${BACKEND_URL}${gen.thumbnailUrl}`}
                                                                alt={gen.inputPrompt}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : videoOutput ? (
                                                            <video
                                                                src={videoOutput.url.startsWith('http') ? videoOutput.url : `${BACKEND_URL}${videoOutput.url}`}
                                                                className="h-full w-full object-cover"
                                                                muted
                                                                onMouseEnter={(e) => e.currentTarget.play()}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.pause();
                                                                    e.currentTarget.currentTime = 0;
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="flex h-full items-center justify-center">
                                                                <Video className="h-8 w-8 text-gray-600" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-2">
                                                        <p className="truncate text-xs text-gray-400 group-hover:text-white">
                                                            {gen.inputPrompt?.slice(0, 50) || 'Untitled'}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content - Two Column Layout (constrained height so timeline stays visible) */}
            <div className="flex flex-1 min-h-0 max-h-[calc(100vh-344px)] overflow-hidden">
                {/* Left Side: Large Preview Monitor */}
                <div className={clsx(
                    "flex flex-col min-h-0 border-r border-white/10 bg-black transition-all duration-300",
                    previewExpanded ? "w-full" : "w-2/3"
                )}>
                    {/* Preview Monitor */}
                    <div className="relative z-10 flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-gray-900/30 to-black">
                        {previewVideoUrl ? (
                            <>
                                <video
                                    ref={videoPreviewRef}
                                    src={previewVideoUrl}
                                    className="max-h-full max-w-full object-contain"
                                    muted={isMuted}
                                    onTimeUpdate={handleTimeUpdate}
                                    onEnded={handleVideoEnded}
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                />

                                {/* Video Controls Overlay - bottom-4 keeps controls above timeline boundary */}
                                <div className="absolute inset-x-0 bottom-4 z-10 rounded-lg bg-black/80 px-4 py-3 mx-4 backdrop-blur-sm">
                                    {/* Progress Bar */}
                                    <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-white/20">
                                        <div
                                            className="h-full bg-cyan-500 transition-all"
                                            style={{
                                                width: `${(currentTime / (selectedClip?.duration || 1)) * 100}%`
                                            }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        {/* Left: Timecode - click to toggle ms/frames */}
                                        <button
                                            onClick={() => setShowMilliseconds(prev => !prev)}
                                            className="flex items-center gap-2 rounded px-2 py-1 hover:bg-white/10 transition-colors cursor-pointer"
                                            title="Click to toggle milliseconds/frames"
                                        >
                                            <span className="font-mono text-sm text-cyan-400">
                                                {showMilliseconds
                                                    ? formatTimecodeWithMs(currentTime)
                                                    : formatTimecode(currentTime)}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                / {showMilliseconds
                                                    ? formatTimecodeWithMs(selectedClip?.duration || 0)
                                                    : formatTimecode(selectedClip?.duration || 0)}
                                            </span>
                                        </button>

                                        {/* Center: Playback Controls */}
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={handleSkipPrevious}
                                                disabled={clips.findIndex(c => c.id === selectedClipId) === 0}
                                                className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Previous clip (J)"
                                            >
                                                <SkipBack className="h-5 w-5" />
                                            </button>

                                            {/* Frame backward button */}
                                            <button
                                                onClick={handleFrameBack}
                                                className="rounded-lg p-2 text-gray-400 hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors"
                                                title="Previous frame (←)"
                                            >
                                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M6 4v16M10 12l8-6v12l-8-6z" />
                                                </svg>
                                            </button>

                                            <button
                                                onClick={handlePlayPause}
                                                className="rounded-full bg-cyan-500 p-3 text-white hover:bg-cyan-400 transition-colors"
                                                title="Play/Pause (Space or K)"
                                            >
                                                {isPlaying ? (
                                                    <Pause className="h-6 w-6" />
                                                ) : (
                                                    <Play className="h-6 w-6 ml-0.5" />
                                                )}
                                            </button>

                                            {/* Frame forward button */}
                                            <button
                                                onClick={handleFrameForward}
                                                className="rounded-lg p-2 text-gray-400 hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors"
                                                title="Next frame (→)"
                                            >
                                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M18 4v16M6 6l8 6-8 6V6z" />
                                                </svg>
                                            </button>

                                            <button
                                                onClick={handleSkipNext}
                                                disabled={clips.findIndex(c => c.id === selectedClipId) === clips.length - 1}
                                                className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Next clip (L)"
                                            >
                                                <SkipForward className="h-5 w-5" />
                                            </button>
                                        </div>

                                        {/* Right: Volume & Fullscreen */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setIsMuted(prev => !prev)}
                                                className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
                                                title="Mute/Unmute (M)"
                                            >
                                                {isMuted ? (
                                                    <VolumeX className="h-5 w-5" />
                                                ) : (
                                                    <Volume2 className="h-5 w-5" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => setPreviewExpanded(prev => !prev)}
                                                className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
                                                title="Expand/Collapse (F)"
                                            >
                                                {previewExpanded ? (
                                                    <Minimize2 className="h-5 w-5" />
                                                ) : (
                                                    <Maximize2 className="h-5 w-5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                            </>
                        ) : (
                            <div className="text-center">
                                <Film className="mx-auto h-16 w-16 text-gray-700" />
                                <p className="mt-4 text-lg text-gray-500">No Preview Available</p>
                                <p className="mt-1 text-sm text-gray-600">
                                    {clips.length === 0
                                        ? 'Add clips to start editing'
                                        : 'Select a clip to preview'
                                    }
                                </p>
                                <p className="mt-4 text-xs text-gray-600">
                                    <span className="text-cyan-500">Space/K</span> Play •
                                    <span className="text-cyan-500 ml-2">J/L</span> Prev/Next •
                                    <span className="text-cyan-500 ml-2">M</span> Mute •
                                    <span className="text-cyan-500 ml-2">F</span> Fullscreen
                                </p>
                            </div>
                        )}

                        {/* Clip Info Badge - always visible when clips exist */}
                        {clips.length > 0 && selectedClipId && (
                            <div className="absolute left-4 top-4 rounded-lg bg-black/70 px-3 py-1.5 backdrop-blur-sm">
                                <span className="text-xs font-medium text-white">
                                    Clip {clips.findIndex(c => c.id === selectedClipId) + 1} of {clips.length}
                                </span>
                                <span className="ml-2 text-xs text-cyan-400">
                                    {selectedClip?.name?.slice(0, 40)}{selectedClip?.name && selectedClip.name.length > 40 ? '...' : ''}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Clip List Panel */}
                <div className={clsx(
                    "flex flex-col bg-zinc-900/50 transition-all duration-300",
                    previewExpanded ? "w-0 overflow-hidden" : "w-1/3"
                )}>
                    {/* Panel Header */}
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <Video className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-300">
                                {editMode === 'quick-edit' ? 'Quick Edit Clips' : 'Scene Chain Clips'}
                            </span>
                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-gray-500">
                                {clips.length}
                            </span>
                        </div>
                        {editMode === 'quick-edit' && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleOpenPicker}
                                    className="rounded p-1.5 text-purple-400 hover:bg-purple-500/20"
                                    title="Add from generations"
                                >
                                    <Video className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
                                    title="Upload video"
                                >
                                    {isUploading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Upload className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Clips List */}
                    <div className="flex-1 overflow-y-auto p-2" data-testid="clip-list-panel">
                        {clips.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-center">
                                <Video className="h-10 w-10 text-gray-600" />
                                <p className="mt-2 text-sm text-gray-500">No clips yet</p>
                                {editMode === 'quick-edit' && (
                                    <div className="mt-4 flex flex-col gap-2">
                                        <button
                                            onClick={handleOpenPicker}
                                            className="flex items-center gap-2 rounded-lg bg-purple-500/20 px-3 py-2 text-sm text-purple-400 hover:bg-purple-500/30"
                                        >
                                            <Video className="h-4 w-4" />
                                            From Generations
                                        </button>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-gray-400 hover:bg-white/20"
                                        >
                                            <Upload className="h-4 w-4" />
                                            Upload Video
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {clips.map((clip, index) => (
                                    <div
                                        key={clip.id}
                                        role="button"
                                        tabIndex={0}
                                        data-testid={`clip-item-${index}`}
                                        data-clip-id={clip.id}
                                        onClick={() => setSelectedClipId(clip.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setSelectedClipId(clip.id);
                                            }
                                        }}
                                        className={clsx(
                                            "group relative flex cursor-pointer gap-3 rounded-lg border p-2 text-left transition-all",
                                            selectedClipId === clip.id
                                                ? "border-cyan-500/50 bg-cyan-500/10"
                                                : "border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10"
                                        )}
                                    >
                                        {/* Thumbnail */}
                                        <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded bg-black">
                                            {clip.thumbnailUrl ? (
                                                <img
                                                    src={clip.thumbnailUrl.startsWith('http') ? clip.thumbnailUrl : `${BACKEND_URL}${clip.thumbnailUrl}`}
                                                    alt={clip.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : clip.videoUrl ? (
                                                <video
                                                    src={clip.videoUrl.startsWith('http') ? clip.videoUrl : `${BACKEND_URL}${clip.videoUrl}`}
                                                    className="h-full w-full object-cover"
                                                    muted
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center">
                                                    <Video className="h-6 w-6 text-gray-600" />
                                                </div>
                                            )}
                                            {/* Index Badge */}
                                            <div className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                                {index + 1}
                                            </div>
                                            {/* Playing indicator */}
                                            {selectedClipId === clip.id && isPlaying && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                    <div className="flex items-center gap-0.5">
                                                        <div className="h-3 w-0.5 animate-pulse bg-cyan-400" />
                                                        <div className="h-4 w-0.5 animate-pulse bg-cyan-400 animation-delay-75" />
                                                        <div className="h-2 w-0.5 animate-pulse bg-cyan-400 animation-delay-150" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex min-w-0 flex-1 flex-col justify-center">
                                            <p className="truncate text-sm text-gray-300">
                                                {clip.name?.slice(0, 30) || `Clip ${index + 1}`}
                                            </p>
                                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                                <span>{(clip.trimEnd - clip.trimStart).toFixed(1)}s</span>
                                                {(clip.trimStart > 0 || clip.trimEnd > 0) && (
                                                    <span className="text-amber-500/70">(trimmed)</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Delete (Quick Edit only) */}
                                        {editMode === 'quick-edit' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveQuickClip(clip.id);
                                                }}
                                                className="absolute right-1 top-1 rounded p-1 text-gray-500 opacity-0 transition-opacity hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Timeline - Fixed Height at Bottom (h-72 = 288px for more room) */}
            <div className="relative z-0 h-72 flex-shrink-0 border-t border-white/10">
                <NLETimeline
                    clips={clips}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    duration={clips.reduce((sum, c) => sum + (c.trimEnd - c.trimStart), 0)}
                    frameRate={24}
                    zoom={50}
                    onClipsChange={handleClipsChange}
                    onTimeChange={handleTimeChange}
                    onPlayPause={handlePlayPauseToggle}
                    onDelete={handleDeleteClip}
                />
            </div>

            {/* Overlay Track Panel */}
            <OverlayTrackPanel
                isOpen={isOverlayPanelOpen}
                onClose={() => setIsOverlayPanelOpen(false)}
                videoDuration={clips.reduce((sum, c) => sum + (c.trimEnd - c.trimStart), 0)}
                currentTime={currentTime}
            />

            {/* YouTube Delivery Modal */}
            <DeliveryModal
                isOpen={isDeliveryModalOpen}
                onClose={() => setIsDeliveryModalOpen(false)}
                videoPath={bakedVideoPath || bakeResult?.url || ''}
                projectName={projectName}
            />
        </div>
    );
}
