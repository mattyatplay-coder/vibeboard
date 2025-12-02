"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, ChevronDown, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { ADVANCED_OPTIONS } from "./CreateStyleModal";

interface ShotStyleEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    shot: any;
    onSave: (shotId: string, newPrompt: string) => void;
}

export function ShotStyleEditorModal({ isOpen, onClose, shot, onSave }: ShotStyleEditorModalProps) {
    const [prompt, setPrompt] = useState("");
    const [activePopover, setActivePopover] = useState<string | null>(null);

    useEffect(() => {
        if (shot && shot.generation) {
            setPrompt(shot.generation.inputPrompt || "");
        }
    }, [shot]);

    const handleAddTag = (tag: string, category: string) => {
        const prefix = prompt ? `${prompt}, ` : "";
        let newTag = tag;

        // Add context to the tag based on category
        if (category === 'cameras') newTag = `shot on ${tag}`;
        else if (category === 'lenses') newTag = `${tag} lens`;
        else if (category === 'films') newTag = `${tag} film stock`;
        else if (category === 'colors') newTag = `${tag} color grading`;
        else if (category === 'lighting') newTag = `${tag} lighting`;
        else if (category === 'cameraMotions') newTag = `${tag} camera movement`;
        else if (category === 'moods') newTag = `${tag} mood`;

        setPrompt(prefix + newTag);
        setActivePopover(null);
    };

    const handleSave = () => {
        if (shot) {
            onSave(shot.id, prompt);
            onClose();
        }
    };

    if (!shot) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
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
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quick Add Advanced Styles</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'lighting', label: 'Lighting', icon: '💡' },
                                        { id: 'cameraMotions', label: 'Motion', icon: '🎥' },
                                        { id: 'moods', label: 'Mood', icon: '🎭' },
                                        { id: 'cameras', label: 'Camera', icon: '📷' }
                                    ].map(cat => (
                                        <div key={cat.id} className="relative">
                                            <button
                                                onClick={() => setActivePopover(activePopover === cat.id ? null : cat.id)}
                                                className={clsx(
                                                    "w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-300 hover:text-white flex items-center justify-between transition-colors",
                                                    activePopover === cat.id && "bg-white/10 border-white/30 text-white"
                                                )}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <span>{cat.icon}</span> {cat.label}
                                                </span>
                                                <ChevronDown className="w-4 h-4 opacity-50" />
                                            </button>

                                            {/* Popover */}
                                            {activePopover === cat.id && (
                                                <div className="absolute bottom-full left-0 mb-2 w-full max-h-48 overflow-y-auto bg-[#252525] border border-white/20 rounded-lg shadow-xl z-50 p-1">
                                                    {(ADVANCED_OPTIONS as any)[cat.id]?.map((opt: string) => (
                                                        <button
                                                            key={opt}
                                                            onClick={() => handleAddTag(opt, cat.id)}
                                                            className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-purple-500/20 hover:text-purple-400 rounded transition-colors truncate"
                                                        >
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
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
    );
}
