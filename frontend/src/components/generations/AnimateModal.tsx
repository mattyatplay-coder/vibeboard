import { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Video } from 'lucide-react';
import { MagicPromptButton } from './MagicPromptButton';
import { clsx } from 'clsx';

interface AnimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  initialAspectRatio?: string;
  initialPrompt?: string;
  onAnimate: (prompt: string, aspectRatio: string, duration: number) => void;
  isGenerating: boolean;
}

export function AnimateModal({
  isOpen,
  onClose,
  imageUrl,
  initialAspectRatio,
  initialPrompt,
  onAnimate,
  isGenerating,
}: AnimateModalProps) {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [aspectRatio, setAspectRatio] = useState(initialAspectRatio || '16:9');
  const [duration, setDuration] = useState(5);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPrompt(initialPrompt || '');
      setAspectRatio(initialAspectRatio || '16:9');
      setDuration(5);
    }
  }, [isOpen, initialAspectRatio, initialPrompt]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in-95 w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <Video className="h-5 w-5 text-purple-400" />
            Animate Image
          </h3>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Image Preview */}
          <div className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-black/50">
            <img src={imageUrl} alt="Source" className="h-full w-full object-contain" />
            <div className="absolute right-2 bottom-2 rounded border border-white/10 bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-md">
              {aspectRatio}
            </div>
          </div>

          {/* Prompt Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Animation Prompt</label>
              <MagicPromptButton currentPrompt={prompt} onPromptEnhanced={setPrompt} />
            </div>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the motion (e.g., 'Slow pan right, wind blowing through hair')..."
              className="h-24 w-full resize-none rounded-xl border border-white/10 bg-black/50 p-3 text-sm text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 focus:outline-none"
            />
          </div>

          {/* Aspect Ratio & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Aspect Ratio</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAspectRatio('16:9')}
                  className={clsx(
                    'flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-all',
                    aspectRatio === '16:9'
                      ? 'border-purple-500 bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  )}
                >
                  16:9
                </button>
                <button
                  onClick={() => setAspectRatio('9:16')}
                  className={clsx(
                    'flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-all',
                    aspectRatio === '9:16'
                      ? 'border-purple-500 bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  )}
                >
                  9:16
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Duration</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDuration(5)}
                  className={clsx(
                    'flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-all',
                    duration === 5
                      ? 'border-purple-500 bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  )}
                >
                  5 sec
                </button>
                <button
                  onClick={() => setDuration(10)}
                  className={clsx(
                    'flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-all',
                    duration === 10
                      ? 'border-purple-500 bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  )}
                >
                  10 sec
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 font-medium text-gray-300 transition-colors hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={() => onAnimate(prompt, aspectRatio, duration)}
              disabled={isGenerating || !prompt.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 font-medium text-white shadow-lg shadow-purple-600/20 transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Animating...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4" />
                  Generate Video
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
