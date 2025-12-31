/**
 * DeliveryModal - YouTube Upload Interface
 *
 * Provides:
 * - OAuth2 connection status
 * - AI-generated viral titles/descriptions
 * - Privacy settings
 * - Upload progress tracking
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Youtube,
    Sparkles,
    Upload,
    Check,
    AlertCircle,
    RefreshCw,
    Lock,
    Globe,
    Users,
    Loader2,
    Copy,
    ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface GeneratedMetadata {
    titles: string[];
    description: string;
    tags: string[];
    recommendedTitle: string;
}

interface ChannelInfo {
    id: string;
    title: string;
    thumbnailUrl: string;
}

interface DeliveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoPath: string;      // Path to the exported video
    projectName: string;    // For default title
    concept?: string;       // For metadata generation
    archetype?: string;     // Content archetype (e.g., 'educational', 'entertainment')
    hook?: string;          // Opening hook text
    thumbnailPath?: string; // Optional custom thumbnail
}

type PrivacyStatus = 'private' | 'unlisted' | 'public';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function DeliveryModal({
    isOpen,
    onClose,
    videoPath,
    projectName,
    concept,
    archetype = 'entertainment',
    hook,
    thumbnailPath,
}: DeliveryModalProps) {
    // Connection state
    const [isConnected, setIsConnected] = useState(false);
    const [channel, setChannel] = useState<ChannelInfo | null>(null);
    const [isCheckingConnection, setIsCheckingConnection] = useState(true);

    // Metadata state
    const [title, setTitle] = useState(projectName);
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
    const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);

    // Upload settings
    const [privacyStatus, setPrivacyStatus] = useState<PrivacyStatus>('private');
    const [madeForKids, setMadeForKids] = useState(false);

    // Upload state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStage, setUploadStage] = useState<string>('');
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);

    // ─────────────────────────────────────────────────────────────────────────
    // Check YouTube connection
    // ─────────────────────────────────────────────────────────────────────────

    const checkConnection = useCallback(async () => {
        setIsCheckingConnection(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/youtube/auth/status`);
            const data = await response.json();

            if (data.success && data.connected) {
                setIsConnected(true);
                setChannel(data.channel);
            } else {
                setIsConnected(false);
                setChannel(null);
            }
        } catch (error) {
            console.error('[DeliveryModal] Connection check failed:', error);
            setIsConnected(false);
        } finally {
            setIsCheckingConnection(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            checkConnection();
        }
    }, [isOpen, checkConnection]);

    // ─────────────────────────────────────────────────────────────────────────
    // Connect to YouTube
    // ─────────────────────────────────────────────────────────────────────────

    const handleConnect = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/youtube/auth/init`);
            const data = await response.json();

            if (data.success && data.authUrl) {
                // Open OAuth popup
                window.open(data.authUrl, 'youtube-auth', 'width=600,height=700');

                // Poll for connection
                const pollInterval = setInterval(async () => {
                    await checkConnection();
                    if (isConnected) {
                        clearInterval(pollInterval);
                    }
                }, 2000);

                // Stop polling after 5 minutes
                setTimeout(() => clearInterval(pollInterval), 300000);
            }
        } catch (error) {
            console.error('[DeliveryModal] Connect failed:', error);
        }
    };

    const handleDisconnect = async () => {
        try {
            await fetch(`${BACKEND_URL}/api/youtube/auth/disconnect`, { method: 'POST' });
            setIsConnected(false);
            setChannel(null);
        } catch (error) {
            console.error('[DeliveryModal] Disconnect failed:', error);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Generate Metadata
    // ─────────────────────────────────────────────────────────────────────────

    const handleGenerateMetadata = async () => {
        if (!concept || !hook) {
            setUploadError('Concept and hook are required for AI metadata generation');
            return;
        }

        setIsGeneratingMetadata(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/youtube/generate-metadata`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    concept,
                    archetype,
                    hook,
                }),
            });

            const data = await response.json();

            if (data.success && data.metadata) {
                const meta = data.metadata as GeneratedMetadata;
                setGeneratedTitles(meta.titles);
                setTitle(meta.recommendedTitle);
                setDescription(meta.description);
                setTags(meta.tags);
            }
        } catch (error) {
            console.error('[DeliveryModal] Metadata generation failed:', error);
            setUploadError('Failed to generate metadata');
        } finally {
            setIsGeneratingMetadata(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Upload Video
    // ─────────────────────────────────────────────────────────────────────────

    const handleUpload = async () => {
        if (!title.trim()) {
            setUploadError('Title is required');
            return;
        }

        setIsUploading(true);
        setUploadError(null);
        setUploadProgress(0);
        setUploadStage('Preparing...');

        try {
            const response = await fetch(`${BACKEND_URL}/api/youtube/upload-from-path`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoPath,
                    title,
                    description,
                    tags,
                    privacyStatus,
                    madeForKids,
                    thumbnailPath,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setUploadedVideoUrl(data.videoUrl);
                setUploadProgress(100);
                setUploadStage('Complete!');
            } else {
                setUploadError(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('[DeliveryModal] Upload failed:', error);
            setUploadError(error instanceof Error ? error.message : 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    onClick={(e) => e.target === e.currentTarget && onClose()}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/10 p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
                                    <Youtube className="h-5 w-5 text-red-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Publish to YouTube</h2>
                                    <p className="text-xs text-gray-400">Upload your video with AI-optimized metadata</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="max-h-[70vh] overflow-y-auto p-4">
                            {/* Connection Status */}
                            <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
                                {isCheckingConnection ? (
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Checking connection...</span>
                                    </div>
                                ) : isConnected && channel ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={channel.thumbnailUrl}
                                                alt={channel.title}
                                                className="h-10 w-10 rounded-full"
                                            />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-white">{channel.title}</span>
                                                    <Check className="h-4 w-4 text-green-400" />
                                                </div>
                                                <span className="text-xs text-gray-400">Connected</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleDisconnect}
                                            className="text-xs text-red-400 hover:text-red-300"
                                        >
                                            Disconnect
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-gray-400">
                                            <AlertCircle className="h-5 w-5" />
                                            <span>Not connected to YouTube</span>
                                        </div>
                                        <button
                                            onClick={handleConnect}
                                            className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
                                        >
                                            <Youtube className="h-4 w-4" />
                                            Connect
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Metadata Section */}
                            {isConnected && (
                                <>
                                    {/* AI Generate Button */}
                                    {concept && hook && (
                                        <button
                                            onClick={handleGenerateMetadata}
                                            disabled={isGeneratingMetadata}
                                            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 py-3 text-sm font-medium text-purple-300 transition-all hover:bg-purple-500/20 disabled:opacity-50"
                                        >
                                            {isGeneratingMetadata ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Generating viral metadata...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="h-4 w-4" />
                                                    Generate AI Metadata
                                                </>
                                            )}
                                        </button>
                                    )}

                                    {/* Generated Titles */}
                                    {generatedTitles.length > 0 && (
                                        <div className="mb-4">
                                            <label className="mb-2 block text-xs font-medium text-gray-400">
                                                AI Title Suggestions (click to use)
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {generatedTitles.map((t, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setTitle(t)}
                                                        className={clsx(
                                                            'rounded-lg border px-3 py-1.5 text-xs transition-all',
                                                            title === t
                                                                ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                                                                : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                                                        )}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Title */}
                                    <div className="mb-4">
                                        <label className="mb-2 block text-xs font-medium text-gray-400">
                                            Title <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            maxLength={100}
                                            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                                            placeholder="Enter video title"
                                        />
                                        <div className="mt-1 text-right text-xs text-gray-500">
                                            {title.length}/100
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="mb-4">
                                        <label className="mb-2 block text-xs font-medium text-gray-400">
                                            Description
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={4}
                                            maxLength={5000}
                                            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                                            placeholder="Enter video description"
                                        />
                                    </div>

                                    {/* Tags */}
                                    <div className="mb-4">
                                        <label className="mb-2 block text-xs font-medium text-gray-400">
                                            Tags
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {tags.map((tag, i) => (
                                                <span
                                                    key={i}
                                                    className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300"
                                                >
                                                    {tag}
                                                    <button
                                                        onClick={() => setTags(tags.filter((_, j) => j !== i))}
                                                        className="ml-1 text-gray-500 hover:text-red-400"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Add tag (press Enter)"
                                            className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                                    setTags([...tags, e.currentTarget.value.trim()]);
                                                    e.currentTarget.value = '';
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* Privacy Settings */}
                                    <div className="mb-4">
                                        <label className="mb-2 block text-xs font-medium text-gray-400">
                                            Privacy
                                        </label>
                                        <div className="flex gap-2">
                                            {[
                                                { value: 'private', icon: Lock, label: 'Private' },
                                                { value: 'unlisted', icon: Users, label: 'Unlisted' },
                                                { value: 'public', icon: Globe, label: 'Public' },
                                            ].map(({ value, icon: Icon, label }) => (
                                                <button
                                                    key={value}
                                                    onClick={() => setPrivacyStatus(value as PrivacyStatus)}
                                                    className={clsx(
                                                        'flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm transition-all',
                                                        privacyStatus === value
                                                            ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                                                            : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                                                    )}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Made for Kids */}
                                    <div className="mb-6">
                                        <label className="flex cursor-pointer items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={madeForKids}
                                                onChange={(e) => setMadeForKids(e.target.checked)}
                                                className="h-4 w-4 rounded border-white/20 bg-white/5"
                                            />
                                            <span className="text-sm text-gray-300">Made for kids</span>
                                        </label>
                                    </div>

                                    {/* Error */}
                                    {uploadError && (
                                        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                                            {uploadError}
                                        </div>
                                    )}

                                    {/* Success */}
                                    {uploadedVideoUrl && (
                                        <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                                            <div className="mb-2 flex items-center gap-2 text-green-300">
                                                <Check className="h-5 w-5" />
                                                <span className="font-medium">Video uploaded successfully!</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={uploadedVideoUrl}
                                                    readOnly
                                                    className="flex-1 rounded bg-black/20 px-3 py-1.5 text-sm text-white"
                                                />
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(uploadedVideoUrl)}
                                                    className="rounded p-2 text-gray-400 hover:text-white"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </button>
                                                <a
                                                    href={uploadedVideoUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="rounded p-2 text-gray-400 hover:text-white"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    {/* Upload Button */}
                                    {!uploadedVideoUrl && (
                                        <button
                                            onClick={handleUpload}
                                            disabled={isUploading || !title.trim()}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-3 font-medium text-white transition-all hover:bg-red-600 disabled:opacity-50"
                                        >
                                            {isUploading ? (
                                                <>
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    {uploadStage}
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="h-5 w-5" />
                                                    Upload to YouTube
                                                </>
                                            )}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default DeliveryModal;
