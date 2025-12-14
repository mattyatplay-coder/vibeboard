"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";

interface SaveElementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, type: string) => Promise<void>;
    initialName?: string;
    initialType?: string;
    isBatch?: boolean;
    title?: string;
}

const STANDARD_TYPES = [
    { value: 'character', label: 'Character' },
    { value: 'location', label: 'Location' },
    { value: 'prop', label: 'Prop' },
    { value: 'style', label: 'Style' },
    { value: 'reference', label: 'Reference' },
];

export function SaveElementModal({
    isOpen,
    onClose,
    onSave,
    initialName = "",
    initialType = "character",
    isBatch = false,
    title
}: SaveElementModalProps) {
    const [name, setName] = useState(initialName);
    const [type, setType] = useState(initialType);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Name is required only if NOT batch
        if (!isBatch && !name.trim()) return;
        if (!type.trim()) return;

        setIsSaving(true);
        try {
            await onSave(name, type);
            onClose();
        } catch (error) {
            console.error("Failed to save element:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white">
                        {title || (isBatch ? "Save Elements" : "Save as Element")}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Name Input - Only show if single item */}
                    {!isBatch && (
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">
                                Element Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. My Avatar"
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                        </div>
                    )}

                    {/* Type Selector (Customizable) */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                            Element Type (or Custom)
                        </label>
                        <div className="relative">
                            <input
                                list="element-types"
                                type="text"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                placeholder="Select or type custom..."
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <datalist id="element-types">
                                {STANDARD_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </datalist>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">
                            Type anything to create a new category (e.g. "Face Reference")
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || (!isBatch && !name.trim()) || !type.trim()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isBatch ? "Save All" : "Save Element"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
