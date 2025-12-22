'use client';

import { X, Music } from 'lucide-react';
import { AudioInput } from './AudioInput';

interface AudioInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAudioChange: (file: File | null) => void;
  currentFile: File | null;
}

export function AudioInputModal({
  isOpen,
  onClose,
  onAudioChange,
  currentFile,
}: AudioInputModalProps) {
  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm duration-200">
      <div className="animate-in zoom-in-95 relative w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Music className="h-4 w-4 text-blue-400" />
            Audio Source
          </h3>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="mb-4 text-xs text-gray-400">
            Upload an audio file or record your voice to drive the avatar's animation.
          </p>

          <AudioInput onAudioChange={onAudioChange} className="border-0 bg-white/5" />
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-white/10 p-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
