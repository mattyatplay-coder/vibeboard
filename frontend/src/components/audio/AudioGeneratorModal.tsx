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

export const AudioGeneratorModal = ({
  isOpen,
  onClose,
  projectId,
  onGenerate,
}: AudioGeneratorModalProps) => {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState('10');
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
          variations: 1,
        }),
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
          toast.error('Generation timed out');
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
            toast.success('Audio generated!');
            if (onGenerate) onGenerate();
          }
        } else if (gen && gen.status === 'failed') {
          setIsGenerating(false);
          toast.error('Generation failed: ' + gen.failureReason);
        } else {
          attempts++;
          setTimeout(checkStatus, 2000);
        }
      };

      checkStatus();
    } catch (error) {
      console.error(error);
      toast.error('Failed to start generation');
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
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Music className="h-5 w-5 text-purple-400" />
            Generate Audio
          </h2>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Prompt</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the sound or music (e.g. 'Cinematic orchestral build-up', 'Rain falling on a tin roof')"
              className="h-24 w-full resize-none rounded-lg border border-white/10 bg-black/50 p-3 text-sm outline-none focus:border-purple-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Duration (seconds)</label>
            <select
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/50 p-2 text-sm outline-none focus:border-purple-500"
            >
              <option value="5">5 seconds</option>
              <option value="10">10 seconds</option>
              <option value="30">30 seconds</option>
              <option value="60">60 seconds</option>
            </select>
          </div>

          {generatedAudio && (
            <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 transition-colors hover:bg-purple-500"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-1 h-5 w-5" />}
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

        <div className="flex justify-end gap-3 border-t border-white/10 p-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Music className="h-4 w-4" />
                Generate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
