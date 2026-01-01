'use client';

import { useState, useCallback } from 'react';
import { Mic, Image as ImageIcon, Video, Play, Loader2, Upload, User, Music } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

interface Element {
    id: string;
    name: string;
    type: string;
    url?: string;
    fileUrl?: string;
    thumbnail?: string;
    metadata?: string;
}

interface PerformanceTabProps {
    projectId: string;
    characters: Element[];
    audioFiles: Element[];
    onRefresh?: () => void;
}

export function PerformanceTab({ projectId, characters, audioFiles, onRefresh }: PerformanceTabProps) {
    const [selectedChar, setSelectedChar] = useState<string>('');
    const [selectedAudio, setSelectedAudio] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lipSyncStrength, setLipSyncStrength] = useState(0.8);
    const [enhanceFace, setEnhanceFace] = useState(true);
    const [uploadingAudio, setUploadingAudio] = useState(false);

    const getImageUrl = (el: Element): string => {
        const url = el.url || el.fileUrl || el.thumbnail || '';
        if (url.startsWith('http')) return url;
        if (url.startsWith('/')) return `${BACKEND_URL}${url}`;
        return url;
    };

    const handleSubmit = async () => {
        if (!selectedChar || !selectedAudio) {
            toast.error('Please select both a character and an audio file');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}/foundry/performance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterId: selectedChar,
                    audioId: selectedAudio,
                    lipSyncStrength,
                    enhanceFace,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                toast.success('Performance queued! Check the Generate page for results.');
                setSelectedChar('');
                setSelectedAudio('');
                onRefresh?.();
            } else {
                toast.error(data.error || 'Failed to start performance generation');
            }
        } catch (e) {
            console.error('[PerformanceTab] Submit error:', e);
            toast.error('Failed to connect to server');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAudioUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('audio/')) {
            toast.error('Please upload an audio file');
            return;
        }

        setUploadingAudio(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'audio');
            formData.append('name', file.name.replace(/\.[^/.]+$/, '')); // Remove extension

            const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}/elements`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                toast.success(`Audio "${file.name}" uploaded!`);
                onRefresh?.();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Failed to upload audio');
            }
        } catch (e) {
            console.error('[PerformanceTab] Audio upload error:', e);
            toast.error('Failed to upload audio');
        } finally {
            setUploadingAudio(false);
            // Reset the input
            e.target.value = '';
        }
    }, [projectId, onRefresh]);

    const selectedCharacter = characters.find(c => c.id === selectedChar);
    const selectedAudioFile = audioFiles.find(a => a.id === selectedAudio);

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Performance Generation</h2>
                    <p className="text-sm text-gray-400 mt-1">
                        Create AI-driven talking head videos from character images + audio
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Video className="h-4 w-4" />
                    <span>Powered by FlashPortrait</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
                {/* LEFT: THE ACTOR */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-wider">
                        <User className="h-4 w-4" />
                        1. Select Actor
                    </label>

                    {characters.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/20 rounded-xl">
                            <ImageIcon className="h-8 w-8 text-gray-600 mb-2" />
                            <p className="text-sm text-gray-500">No character assets found</p>
                            <p className="text-xs text-gray-600 mt-1">Add characters via Script Lab or Elements</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                            {characters.map(char => {
                                const imageUrl = getImageUrl(char);
                                const hasImage = !!imageUrl;

                                return (
                                    <button
                                        key={char.id}
                                        onClick={() => setSelectedChar(char.id)}
                                        className={clsx(
                                            'relative aspect-square rounded-xl overflow-hidden border-2 transition-all',
                                            selectedChar === char.id
                                                ? 'border-purple-500 ring-2 ring-purple-500/30 scale-[1.02]'
                                                : 'border-white/10 hover:border-white/30'
                                        )}
                                    >
                                        {hasImage ? (
                                            <img
                                                src={imageUrl}
                                                alt={char.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
                                                <User className="h-8 w-8 text-purple-400" />
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                            <p className="text-[10px] text-white truncate font-medium">
                                                {char.name}
                                            </p>
                                        </div>
                                        {selectedChar === char.id && (
                                            <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* RIGHT: THE VOICE */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-wider">
                        <Music className="h-4 w-4" />
                        2. Select Voice/Audio
                    </label>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                        {audioFiles.map(audio => (
                            <button
                                key={audio.id}
                                onClick={() => setSelectedAudio(audio.id)}
                                className={clsx(
                                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-all',
                                    selectedAudio === audio.id
                                        ? 'bg-purple-500/20 border-purple-500'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                )}
                            >
                                <div className={clsx(
                                    'w-10 h-10 rounded-full flex items-center justify-center',
                                    selectedAudio === audio.id
                                        ? 'bg-purple-500/30 text-purple-300'
                                        : 'bg-cyan-500/20 text-cyan-400'
                                )}>
                                    <Mic size={16} />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="text-sm font-medium text-white">{audio.name}</div>
                                    <div className="text-xs text-gray-500">Audio file</div>
                                </div>
                                {selectedAudio === audio.id && (
                                    <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        ))}

                        {/* Upload New Button */}
                        <label className={clsx(
                            'w-full flex items-center justify-center gap-2 py-4 border border-dashed rounded-lg cursor-pointer transition-all',
                            uploadingAudio
                                ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                                : 'border-white/20 text-gray-500 hover:text-white hover:border-white/40 hover:bg-white/5'
                        )}>
                            <input
                                type="file"
                                accept="audio/*"
                                onChange={handleAudioUpload}
                                disabled={uploadingAudio}
                                className="hidden"
                            />
                            {uploadingAudio ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4" />
                                    <span className="text-sm">Upload New Audio</span>
                                </>
                            )}
                        </label>
                    </div>
                </div>
            </div>

            {/* Advanced Options */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-4">
                <h3 className="text-sm font-medium text-gray-400">Advanced Options</h3>

                <div className="grid grid-cols-2 gap-6">
                    {/* Lip Sync Strength */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs text-gray-500">Lip Sync Strength</label>
                            <span className="text-xs text-cyan-400">{Math.round(lipSyncStrength * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={lipSyncStrength * 100}
                            onChange={(e) => setLipSyncStrength(Number(e.target.value) / 100)}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>

                    {/* Enhance Face Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-xs text-gray-500">Face Enhancement</label>
                            <p className="text-[10px] text-gray-600">Apply AI face restoration</p>
                        </div>
                        <button
                            onClick={() => setEnhanceFace(!enhanceFace)}
                            className={clsx(
                                'w-12 h-6 rounded-full transition-colors relative',
                                enhanceFace ? 'bg-cyan-500' : 'bg-white/20'
                            )}
                        >
                            <div className={clsx(
                                'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                                enhanceFace ? 'translate-x-7' : 'translate-x-1'
                            )} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview & Submit */}
            <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                    {/* Preview */}
                    <div className="flex items-center gap-4">
                        {selectedCharacter && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
                                <User className="h-4 w-4 text-purple-400" />
                                <span className="text-sm text-purple-300">{selectedCharacter.name}</span>
                            </div>
                        )}
                        {selectedCharacter && selectedAudioFile && (
                            <span className="text-gray-600">+</span>
                        )}
                        {selectedAudioFile && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                                <Music className="h-4 w-4 text-cyan-400" />
                                <span className="text-sm text-cyan-300">{selectedAudioFile.name}</span>
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedChar || !selectedAudio || isSubmitting}
                        className={clsx(
                            'flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white shadow-lg transition-all',
                            (!selectedChar || !selectedAudio || isSubmitting)
                                ? 'bg-gray-700 opacity-50 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-105 hover:shadow-purple-500/25'
                        )}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <Play className="h-5 w-5" />
                                <span>Generate Performance</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PerformanceTab;
