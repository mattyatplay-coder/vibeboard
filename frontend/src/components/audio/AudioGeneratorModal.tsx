import React, { useState } from 'react';
import { X, Music, Loader2, Play, Pause } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { toast } from 'sonner';

interface AudioGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onGenerate?: () => void;
}

export const AudioGeneratorModal = ({ isOpen, onClose, projectId, onGenerate }: AudioGeneratorModalProps) => {
    const [prompt, setPrompt] = useState("");
    const [duration, setDuration] = useState("10");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsGenerating(true);
        setGeneratedAudio(null);
        try {
            const res = await fetchAPI(`/projects/${projectId}/generations`, {
                method: 'POST',
                body: JSON.stringify({
                    projectId,
                    mode: 'text_to_audio',
                    inputPrompt: prompt,
                    duration,
                    engine: 'fal', // Force Fal for audio
                    variations: 1
                })
            });

            // Poll for completion
            const pollInterval = setInterval(async () => {
                try {
                    const gen = await fetchAPI(`/projects/${projectId}/generations?generationId=${res.id}`); // Assuming filtering by ID works or we fetch list and find
                    // Actually the current API returns list. Let's assume we can get by ID or just wait a bit.
                    // For MVP, let's just wait 15s then check list.
                } catch (e) {
                    console.error(e);
                }
            }, 2000);

            // Better polling logic:
            let attempts = 0;
            const checkStatus = async () => {
                if (attempts > 30) {
                    setIsGenerating(false);
                    toast.error("Generation timed out");
                    return;
                }

                // We need an endpoint to get single generation or filter.
                // For now, let's re-fetch the list and find the latest one.
                const generations = await fetchAPI(`/projects/${projectId}/generations`);
                const gen = generations.find((g: any) => g.id === res.id);

                if (gen && gen.status === 'succeeded') {
                    setIsGenerating(false);
                    if (gen.outputs && gen.outputs.length > 0) {
                        setGeneratedAudio(gen.outputs[0].url);
                        toast.success("Audio generated!");
                        if (onGenerate) onGenerate();
                    }
                } else if (gen && gen.status === 'failed') {
                    setIsGenerating(false);
                    toast.error("Generation failed: " + gen.failureReason);
                } else {
                    attempts++;
                    setTimeout(checkStatus, 2000);
                }
            };

            checkStatus();

        } catch (error) {
            console.error(error);
            toast.error("Failed to start generation");
            setIsGenerating(false);
        }
    };

    const togglePlay = () => {
        if (!generatedAudio) return;

        if (isPlaying && audioElement) {
            audioElement.pause();
            setIsPlaying(false);
        } else {
            if (!audioElement) {
                const audio = new Audio(generatedAudio);
                audio.onended = () => setIsPlaying(false);
                setAudioElement(audio);
                audio.play();
                setIsPlaying(true);
            } else {
                audioElement.play();
                setIsPlaying(true);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Music className="w-5 h-5 text-purple-400" />
                        Generate Audio
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Prompt</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe the sound or music (e.g. 'Cinematic orchestral build-up', 'Rain falling on a tin roof')"
                            className="w-full h-24 bg-black/50 border border-white/10 rounded-lg p-3 text-sm focus:border-purple-500 outline-none resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Duration (seconds)</label>
                        <select
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-sm focus:border-purple-500 outline-none"
                        >
                            <option value="5">5 seconds</option>
                            <option value="10">10 seconds</option>
                            <option value="30">30 seconds</option>
                            <option value="60">60 seconds</option>
                        </select>
                    </div>

                    {generatedAudio && (
                        <div className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={togglePlay}
                                    className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center hover:bg-purple-500 transition-colors"
                                >
                                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                                </button>
                                <div className="text-sm text-gray-300">Generated Audio</div>
                            </div>
                            <a
                                href={generatedAudio}
                                download
                                target="_blank"
                                className="text-xs text-purple-400 hover:text-purple-300"
                            >
                                Download
                            </a>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/10 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt.trim()}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Music className="w-4 h-4" />
                                Generate
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
