"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, ChevronRight, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { CinematicTagsModal } from "./CinematicTagsModal";
import { ALL_CATEGORIES, CinematicTag } from "@/data/CinematicTags";

interface ShotStyleEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    shot: any;
    onSave: (shotId: string, newPrompt: string) => void;
}

export function ShotStyleEditorModal({ isOpen, onClose, shot, onSave }: ShotStyleEditorModalProps) {
    const [prompt, setPrompt] = useState("");
    const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
    const [initialTagCategory, setInitialTagCategory] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (shot && shot.generation) {
            setPrompt(shot.generation.inputPrompt || "");
        }
    }, [shot]);

    const handleAddTag = (tag: CinematicTag, categoryId: string) => {
        const prefix = prompt ? `${prompt}, ` : "";
        // Use the tag's prompt directly - it already includes the proper formatting
        setPrompt(prefix + tag.prompt);
        setIsTagsModalOpen(false);
    };

    const openTagsModal = (categoryId?: string) => {
        setInitialTagCategory(categoryId);
        setIsTagsModalOpen(true);
    };

    const handleSave = () => {
        if (shot) {
            onSave(shot.id, prompt);
            onClose();
        }
    };

    if (!shot) return null;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-lg bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-purple-400" />
                                    Edit Shot Style
                                </h2>
                                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {/* Preview Thumbnail (if available) */}
                                {shot.generation?.outputs?.[0] && (
                                    <div className="w-full h-32 rounded-lg overflow-hidden bg-black/50 border border-white/10 mb-4">
                                        <img src={shot.generation.outputs[0].url} className="w-full h-full object-cover opacity-50" />
                                    </div>
                                )}

                                {/* Prompt Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Shot Prompt</label>
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        className="w-full h-32 bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                        placeholder="Describe the shot..."
                                    />
                                </div>

                                {/* Quick Add Tags */}
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quick Add Cinematic Tags</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {ALL_CATEGORIES.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => openTagsModal(cat.id)}
                                                className="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-300 hover:text-white flex items-center justify-between transition-colors"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <span>{cat.icon}</span> {cat.label}
                                                </span>
                                                <ChevronRight className="w-4 h-4 opacity-50" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-white/10 bg-[#1a1a1a] flex justify-end gap-2">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Cinematic Tags Modal */}
            <CinematicTagsModal
                isOpen={isTagsModalOpen}
                onClose={() => setIsTagsModalOpen(false)}
                onSelectTag={handleAddTag}
                initialCategory={initialTagCategory}
            />
        </>
    );
}
