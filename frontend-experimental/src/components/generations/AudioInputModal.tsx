"use client";

import { X, Music } from "lucide-react";
import { AudioInput } from "./AudioInput";

interface AudioInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAudioChange: (file: File | null) => void;
    currentFile: File | null;
}

export function AudioInputModal({ isOpen, onClose, onAudioChange, currentFile }: AudioInputModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Music className="w-4 h-4 text-blue-400" />
                        Audio Source
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    <p className="text-xs text-gray-400 mb-4">
                        Upload an audio file or record your voice to drive the avatar's animation.
                    </p>

                    <AudioInput
                        onAudioChange={onAudioChange}
                        className="border-0 bg-white/5"
                    />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
