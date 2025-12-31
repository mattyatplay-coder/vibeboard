'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare,
    Check,
    AlertCircle,
    Filter,
    ChevronLeft,
    ChevronRight,
    Play,
    Pause,
    Volume2,
    VolumeX,
    Maximize2,
    Clock,
    User,
    ThumbsUp,
    Flag,
    X,
} from 'lucide-react';
import clsx from 'clsx';
import { Sidebar } from '@/components/layout/Sidebar';
import { AnnotationOverlay } from '@/components/dailies/AnnotationOverlay';
import { VersionSwitcher } from '@/components/dailies/VersionSwitcher';

interface Comment {
    id: string;
    generationId: string;
    text: string;
    timestamp: number | null;
    coordinates: string | null;
    type: 'note' | 'approval' | 'revision' | 'blocker';
    resolved: boolean;
    resolvedAt: string | null;
    userName: string;
    createdAt: string;
    replies?: Comment[];
    generation?: {
        id: string;
        inputPrompt: string;
        outputs: string | null;
        status: string;
    };
}

interface GenerationOutput {
    type?: string;
    url?: string;
    video_url?: string;
    thumbnail_url?: string;
}

interface Generation {
    id: string;
    inputPrompt: string;
    outputs: string | GenerationOutput[] | null;
    status: string;
    createdAt: string;
    mode?: string;
    aspectRatio?: string;
}

type FilterType = 'all' | 'unresolved' | 'blockers' | 'approved';

export default function DailiesPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [comments, setComments] = useState<Comment[]>([]);
    const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');
    const [isAnnotating, setIsAnnotating] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    // All generations for the project
    const [allGenerations, setAllGenerations] = useState<Generation[]>([]);

    // Fetch all generations for the project
    const fetchGenerations = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/api/projects/${projectId}/generations?limit=100`);
            const data = await res.json();
            if (Array.isArray(data)) {
                // Filter to only succeeded generations
                const succeeded = data.filter((g: Generation) => g.status === 'succeeded');
                setAllGenerations(succeeded);

                // Select first generation if none selected
                if (!selectedGeneration && succeeded.length > 0) {
                    setSelectedGeneration(succeeded[0]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch generations:', error);
        }
    }, [apiUrl, projectId, selectedGeneration]);

    // Fetch all comments for the project
    const fetchComments = useCallback(async () => {
        try {
            setIsLoading(true);
            const resolvedParam = filter === 'all' ? '' : filter === 'unresolved' ? '&resolved=false' : '';
            const res = await fetch(`${apiUrl}/api/projects/${projectId}/comments?limit=100${resolvedParam}`);
            const data = await res.json();
            if (data.success) {
                let filteredComments = data.comments;
                if (filter === 'blockers') {
                    filteredComments = filteredComments.filter((c: Comment) => c.type === 'blocker');
                } else if (filter === 'approved') {
                    filteredComments = filteredComments.filter((c: Comment) => c.type === 'approval');
                }
                setComments(filteredComments);
            }
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        } finally {
            setIsLoading(false);
        }
    }, [apiUrl, projectId, filter]);

    useEffect(() => {
        fetchGenerations();
    }, [fetchGenerations]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    // Get media info from generation
    const getMediaInfo = (gen: Generation | null): { url: string | null; isVideo: boolean } => {
        if (!gen?.outputs) return { url: null, isVideo: false };
        try {
            // Handle both string (needs parsing) and already-parsed object/array
            let parsed: GenerationOutput[];
            if (typeof gen.outputs === 'string') {
                parsed = JSON.parse(gen.outputs);
            } else {
                parsed = gen.outputs;
            }
            if (Array.isArray(parsed) && parsed.length > 0) {
                const output = parsed[0];
                const url = output.url || output.video_url || output.thumbnail_url || null;
                const isVideo = output.type === 'video' || (url?.includes('.mp4') ?? false) || (url?.includes('/video/') ?? false);
                return { url, isVideo };
            }
        } catch {
            return { url: null, isVideo: false };
        }
        return { url: null, isVideo: false };
    };

    const { url: mediaUrl, isVideo } = getMediaInfo(selectedGeneration);

    // Video controls
    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const seekTo = (time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Get comments for selected generation
    const currentComments = comments.filter(c => c.generationId === selectedGeneration?.id);

    // Get unique generations with comments
    const generationsWithComments = Array.from(
        new Map(
            comments
                .filter(c => c.generation)
                .map(c => [c.generationId, c.generation])
        ).values()
    ) as Generation[];

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'blocker':
                return <Flag className="h-4 w-4 text-red-400" />;
            case 'revision':
                return <AlertCircle className="h-4 w-4 text-amber-400" />;
            case 'approval':
                return <ThumbsUp className="h-4 w-4 text-green-400" />;
            default:
                return <MessageSquare className="h-4 w-4 text-blue-400" />;
        }
    };

    return (
        <div className="flex h-screen bg-[#0a0a0a]">
            <Sidebar />

            <main className="flex flex-1 overflow-hidden">
                {/* Left Panel: Generation List */}
                <div className="w-72 flex-shrink-0 border-r border-white/10 bg-zinc-900/50">
                    {/* Filter Tabs */}
                    <div className="border-b border-white/10 p-4">
                        <h1 className="mb-4 text-xl font-bold text-white">Dailies Review</h1>
                        <div className="flex gap-1">
                            {[
                                { key: 'all', label: 'All' },
                                { key: 'unresolved', label: 'Open' },
                                { key: 'blockers', label: 'Blockers' },
                                { key: 'approved', label: 'Approved' },
                            ].map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setFilter(f.key as FilterType)}
                                    className={clsx(
                                        'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                                        filter === f.key
                                            ? 'bg-white/10 text-white'
                                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    )}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Generation List */}
                    <div className="overflow-y-auto p-4" style={{ height: 'calc(100vh - 140px)' }}>
                        {isLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="animate-pulse rounded-lg bg-white/5 p-3">
                                        <div className="mb-2 h-20 rounded bg-white/10" />
                                        <div className="h-4 w-3/4 rounded bg-white/10" />
                                    </div>
                                ))}
                            </div>
                        ) : allGenerations.length === 0 ? (
                            <div className="py-12 text-center">
                                <MessageSquare className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                                <p className="text-gray-500">No generations yet</p>
                                <p className="mt-2 text-xs text-gray-600">
                                    Create generations in the Generate page
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {allGenerations.map(gen => {
                                    const genComments = comments.filter(c => c.generationId === gen.id);
                                    const unresolvedCount = genComments.filter(c => !c.resolved).length;
                                    const hasBlocker = genComments.some(c => c.type === 'blocker' && !c.resolved);
                                    const { url: thumbUrl } = getMediaInfo(gen);

                                    return (
                                        <button
                                            key={gen.id}
                                            onClick={() => setSelectedGeneration(gen)}
                                            className={clsx(
                                                'group w-full overflow-hidden rounded-lg border transition-all',
                                                selectedGeneration?.id === gen.id
                                                    ? 'border-cyan-500/50 bg-cyan-500/10'
                                                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                            )}
                                        >
                                            {/* Thumbnail */}
                                            <div className="relative aspect-video bg-black/50">
                                                {thumbUrl ? (
                                                    <img
                                                        src={thumbUrl}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-gray-600">
                                                        No preview
                                                    </div>
                                                )}

                                                {/* Comment count badge - only show if has comments */}
                                                {genComments.length > 0 && (
                                                    <div
                                                        className={clsx(
                                                            'absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                                                            hasBlocker
                                                                ? 'bg-red-500/90 text-white'
                                                                : unresolvedCount > 0
                                                                  ? 'bg-amber-500/90 text-black'
                                                                  : 'bg-green-500/90 text-black'
                                                        )}
                                                    >
                                                        <MessageSquare className="h-3 w-3" />
                                                        {genComments.length}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="p-3 text-left">
                                                <p className="line-clamp-2 text-xs text-gray-300">
                                                    {gen.inputPrompt}
                                                </p>
                                                {genComments.length > 0 ? (
                                                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                                        <span>{unresolvedCount} open</span>
                                                        <span>•</span>
                                                        <span>
                                                            {genComments.filter(c => c.resolved).length} resolved
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="mt-2 text-xs text-gray-600">
                                                        No comments
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Center: Media Viewer */}
                <div className="flex flex-1 flex-col bg-black">
                    {selectedGeneration ? (
                        <>
                            {/* Media Player */}
                            <div className="relative flex-1">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    {isVideo && mediaUrl ? (
                                        <video
                                            ref={videoRef}
                                            src={mediaUrl}
                                            className="max-h-full max-w-full"
                                            onTimeUpdate={handleTimeUpdate}
                                            onLoadedMetadata={handleLoadedMetadata}
                                            onEnded={() => setIsPlaying(false)}
                                            muted={isMuted}
                                            loop
                                        />
                                    ) : mediaUrl ? (
                                        <img
                                            src={mediaUrl}
                                            alt=""
                                            className="max-h-full max-w-full object-contain"
                                        />
                                    ) : (
                                        <div className="text-gray-600">No media available</div>
                                    )}

                                    {/* Annotation Overlay */}
                                    <div className="absolute inset-0">
                                        <AnnotationOverlay
                                            generationId={selectedGeneration.id}
                                            mediaType={isVideo ? 'video' : 'image'}
                                            currentTime={currentTime}
                                            onTimeClick={seekTo}
                                            isEditing={isAnnotating}
                                            onCommentChange={fetchComments}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Video Controls (for video) */}
                            {isVideo && (
                                <div className="border-t border-white/10 bg-zinc-900/80 p-4">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={togglePlay}
                                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                                        >
                                            {isPlaying ? (
                                                <Pause className="h-5 w-5" />
                                            ) : (
                                                <Play className="h-5 w-5 fill-current" />
                                            )}
                                        </button>

                                        {/* Timeline */}
                                        <div className="flex-1">
                                            <input
                                                type="range"
                                                min={0}
                                                max={duration || 100}
                                                value={currentTime}
                                                onChange={e => seekTo(parseFloat(e.target.value))}
                                                className="w-full accent-cyan-500"
                                            />
                                        </div>

                                        <span className="text-sm text-gray-400">
                                            {formatTime(currentTime)} / {formatTime(duration)}
                                        </span>

                                        <button
                                            onClick={() => setIsMuted(!isMuted)}
                                            className="text-gray-400 hover:text-white"
                                        >
                                            {isMuted ? (
                                                <VolumeX className="h-5 w-5" />
                                            ) : (
                                                <Volume2 className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Annotation Toggle Bar */}
                            <div className="flex items-center justify-between border-t border-white/10 bg-zinc-900/50 px-4 py-2">
                                <button
                                    onClick={() => setIsAnnotating(!isAnnotating)}
                                    className={clsx(
                                        'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                                        isAnnotating
                                            ? 'bg-cyan-500 text-black'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                    )}
                                >
                                    <MessageSquare className="h-4 w-4" />
                                    {isAnnotating ? 'Done Annotating' : 'Add Annotation'}
                                </button>

                                <VersionSwitcher
                                    generationId={selectedGeneration.id}
                                    onVersionSelect={(genId) => {
                                        // Fetch the new generation and update selection
                                        fetch(`${apiUrl}/api/projects/${projectId}/generations/${genId}`)
                                            .then(res => res.json())
                                            .then(data => {
                                                if (data) {
                                                    setSelectedGeneration(data);
                                                }
                                            });
                                    }}
                                    compact
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-1 items-center justify-center">
                            <div className="text-center">
                                <MessageSquare className="mx-auto mb-4 h-16 w-16 text-gray-700" />
                                <p className="text-gray-500">Select a generation to review</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel: Comments Thread */}
                <div className="w-80 flex-shrink-0 border-l border-white/10 bg-zinc-900/50">
                    <div className="border-b border-white/10 p-4">
                        <h2 className="text-sm font-medium text-white">
                            Comments ({currentComments.length})
                        </h2>
                    </div>

                    <div className="overflow-y-auto p-4" style={{ height: 'calc(100vh - 60px)' }}>
                        {currentComments.length === 0 ? (
                            <div className="py-12 text-center">
                                <MessageSquare className="mx-auto mb-4 h-10 w-10 text-gray-600" />
                                <p className="text-sm text-gray-500">No comments yet</p>
                                <p className="mt-2 text-xs text-gray-600">
                                    Click "Add Annotation" to start
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {currentComments.map(comment => (
                                    <div
                                        key={comment.id}
                                        className={clsx(
                                            'rounded-lg border p-3 transition-colors',
                                            comment.resolved
                                                ? 'border-white/5 bg-white/5 opacity-60'
                                                : 'border-white/10 bg-white/5'
                                        )}
                                    >
                                        {/* Header */}
                                        <div className="mb-2 flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                {getTypeIcon(comment.type)}
                                                <span className="text-sm font-medium text-white">
                                                    {comment.userName}
                                                </span>
                                            </div>
                                            {comment.timestamp !== null && (
                                                <button
                                                    onClick={() => seekTo(comment.timestamp!)}
                                                    className="flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-xs text-gray-400 hover:bg-white/20"
                                                >
                                                    <Clock className="h-3 w-3" />
                                                    {formatTime(comment.timestamp)}
                                                </button>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <p className="text-sm text-gray-300">{comment.text}</p>

                                        {/* Footer */}
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-xs text-gray-500">
                                                {new Date(comment.createdAt).toLocaleDateString()}
                                            </span>
                                            {comment.resolved && (
                                                <span className="flex items-center gap-1 text-xs text-green-400">
                                                    <Check className="h-3 w-3" />
                                                    Resolved
                                                </span>
                                            )}
                                        </div>

                                        {/* Replies */}
                                        {comment.replies && comment.replies.length > 0 && (
                                            <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                                                {comment.replies.map(reply => (
                                                    <div key={reply.id} className="rounded bg-white/5 p-2">
                                                        <div className="mb-1 flex items-center gap-2">
                                                            <span className="text-xs font-medium text-white">
                                                                {reply.userName}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {new Date(reply.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-300">{reply.text}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
