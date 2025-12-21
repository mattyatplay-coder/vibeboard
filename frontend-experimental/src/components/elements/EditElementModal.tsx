 /* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { useState, useEffect, useRef } from "react";
import { Element as StoreElement, ElementType } from "@/lib/store";
import { X, User, Car, FlaskConical, Mic, Plus, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

interface EditElementModalProps {
    element: StoreElement | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, updates: any) => void;
    sessions: { id: string; name: string }[];
}

const ELEMENT_TYPES: { id: ElementType; label: string; icon: any }[] = [
    { id: "character", label: "Character", icon: User },
    { id: "prop", label: "Object", icon: Car }, // Mapping 'prop' to 'Object' label for UI
    { id: "place", label: "Other", icon: FlaskConical }, // Mapping 'place' to 'Other' for UI
];

export function EditElementModal({ element, isOpen, onClose, onSave, sessions }: EditElementModalProps) {
    const [name, setName] = useState("");
    const [type, setType] = useState<ElementType>("character");
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [error, setError] = useState<string | null>(null);

    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

    useEffect(() => {
        if (element) {
            setName(element.name);
            setType(element.type);
            setFile(null);
            setPreviewUrl(null);
            setTags(Array.isArray(element.tags) ? element.tags : []);
            setSelectedSessionId(element.session?.id || null);
            setError(null);
        }
    }, [element]);

    const handleSave = async () => {
        if (element && name.trim()) {
            try {
                await onSave(element.id, { name, type, file, tags, sessionId: selectedSessionId });
                onClose();
            } catch (err: any) {
                console.error("Save failed", err);
                if (err.message.includes("already exists")) {
                    setError("Name already taken. Please choose another.");
                } else {
                    setError("Failed to save changes.");
                }
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleAddTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags([...tags, newTag.trim()]);
            setNewTag("");
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && element && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                    >
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white">Edit Element</h2>
                                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Name Input */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Name*</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-[#2a2a2a] border border-white/5 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    placeholder="Element Name"
                                />
                                {error && (
                                    <p className="text-xs text-red-400 font-medium mt-1">{error}</p>
                                )}
                            </div>

                            {/* Session Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Session</label>
                                <select
                                    value={selectedSessionId || ""}
                                    onChange={(e) => setSelectedSessionId(e.target.value || null)}
                                    className="w-full bg-[#2a2a2a] border border-white/5 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                                >
                                    <option value="">Global / Unassigned</option>
                                    {sessions.map(session => (
                                        <option key={session.id} value={session.id}>{session.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Source Image Preview */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Source Image</label>
                                <div className="relative aspect-video rounded-lg overflow-hidden bg-black/50 border border-white/5 group">
                                    {previewUrl ? (
                                        file?.type.startsWith('video') ? (
                                            <video src={previewUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={previewUrl} className="w-full h-full object-cover" />
                                        )
                                    ) : (
                                        element.type === 'video' ? (
                                            <video src={element.url} className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={element.url} alt={element.name} className="w-full h-full object-cover" />
                                        )
                                    )}
                                    <div className="absolute bottom-2 left-2">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-2 py-1 bg-black/60 hover:bg-black/80 rounded text-xs font-medium text-white backdrop-blur-md transition-colors"
                                        >
                                            Upload
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            className="hidden"
                                            accept="image/*,video/*"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Element Type Selection */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Element Type</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {ELEMENT_TYPES.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setType(t.id)}
                                            className={clsx(
                                                "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                                                type === t.id
                                                    ? "bg-blue-900/20 border-blue-500 text-blue-400"
                                                    : "bg-[#2a2a2a] border-transparent text-gray-400 hover:bg-[#333]"
                                            )}
                                        >
                                            <t.icon className="w-5 h-5" />
                                            <span className="text-xs font-medium">{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tags</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {tags.map(tag => (
                                        <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-300">
                                            {tag}
                                            <button onClick={() => handleRemoveTag(tag)} className="hover:text-white">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className="w-full bg-[#2a2a2a] border border-white/5 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                            placeholder="Add a tag..."
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddTag}
                                        disabled={!newTag.trim()}
                                        className="px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Voice (Placeholder) */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Voice</label>
                                <button className="w-full flex items-center justify-between bg-[#2a2a2a] border border-white/5 rounded-lg px-4 py-3 text-white hover:bg-[#333] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Mic className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm">Alnilam</span>
                                    </div>
                                </button>
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-[#2a2a2a]/50 border-t border-white/5 flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-blue-600/20"
                            >
                                Save Element
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
