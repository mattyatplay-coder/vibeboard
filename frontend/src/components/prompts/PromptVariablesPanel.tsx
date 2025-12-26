"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Edit2, Check, Code2, Lightbulb, Copy } from "lucide-react";
import { clsx } from "clsx";
import {
    usePromptVariablesStore,
    PromptVariable,
    detectUnexpandedVariables,
} from "@/lib/promptVariablesStore";
import { toast } from "sonner";

interface PromptVariablesPanelProps {
    isOpen: boolean;
    onClose: () => void;
    embedded?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
    character: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    style: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    lighting: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    camera: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    custom: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

export function PromptVariablesPanel({
    isOpen,
    onClose,
    embedded = false,
}: PromptVariablesPanelProps) {
    const { variables, addVariable, updateVariable, deleteVariable } =
        usePromptVariablesStore();

    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newName, setNewName] = useState("");
    const [newValue, setNewValue] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newCategory, setNewCategory] = useState<PromptVariable["category"]>("custom");

    const handleCreate = () => {
        if (!newName.trim() || !newValue.trim()) {
            toast.error("Name and value are required");
            return;
        }

        // Validate name format (no spaces, starts with letter)
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newName)) {
            toast.error("Variable name must start with a letter and contain no spaces");
            return;
        }

        addVariable({
            name: newName.trim(),
            value: newValue.trim(),
            description: newDescription.trim() || undefined,
            category: newCategory,
        });

        setNewName("");
        setNewValue("");
        setNewDescription("");
        setNewCategory("custom");
        setIsCreating(false);
        toast.success(`Variable $${newName} created`);
    };

    const handleCopyUsage = (name: string) => {
        navigator.clipboard.writeText(`$${name}`);
        toast.success(`Copied $${name} to clipboard`);
    };

    const panelContent = (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-purple-400" />
                    <h2 className="text-lg font-bold text-white">Prompt Variables</h2>
                </div>
                {!embedded && (
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                )}
            </div>

            {/* Hint */}
            <div className="px-4 py-3 bg-purple-500/10 border-b border-purple-500/20">
                <div className="flex gap-2 text-xs text-purple-200">
                    <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium mb-1">How to use:</p>
                        <p className="text-purple-300/80">
                            Type <code className="bg-purple-500/30 px-1 rounded">$VariableName</code> or{" "}
                            <code className="bg-purple-500/30 px-1 rounded">{"${VariableName}"}</code> in your prompt.
                            Variables are expanded automatically before generation.
                        </p>
                    </div>
                </div>
            </div>

            {/* Variables List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {variables.map((variable) => (
                    <div
                        key={variable.id}
                        className="bg-white/5 border border-white/10 rounded-lg p-3 hover:border-white/20 transition-colors"
                    >
                        {editingId === variable.id ? (
                            /* Edit Mode */
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                    placeholder="Variable name"
                                />
                                <textarea
                                    value={newValue}
                                    onChange={(e) => setNewValue(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded px-2 py-1.5 text-sm text-white resize-none"
                                    rows={3}
                                    placeholder="Prompt snippet..."
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            updateVariable(variable.id, {
                                                name: newName,
                                                value: newValue,
                                            });
                                            setEditingId(null);
                                            toast.success("Variable updated");
                                        }}
                                        className="flex-1 py-1.5 bg-green-600 hover:bg-green-500 rounded text-xs text-white font-medium transition-colors"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* View Mode */
                            <>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-mono font-bold text-purple-300">
                                            ${variable.name}
                                        </span>
                                        {variable.category && (
                                            <span
                                                className={clsx(
                                                    "text-[10px] px-1.5 py-0.5 rounded border",
                                                    CATEGORY_COLORS[variable.category]
                                                )}
                                            >
                                                {variable.category}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleCopyUsage(variable.name)}
                                            className="p-1 rounded hover:bg-white/10 transition-colors"
                                            title="Copy usage"
                                        >
                                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingId(variable.id);
                                                setNewName(variable.name);
                                                setNewValue(variable.value);
                                            }}
                                            className="p-1 rounded hover:bg-white/10 transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                deleteVariable(variable.id);
                                                toast.success(`Deleted $${variable.name}`);
                                            }}
                                            className="p-1 rounded hover:bg-red-500/20 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 line-clamp-2 font-mono bg-black/30 px-2 py-1.5 rounded">
                                    {variable.value}
                                </p>
                                {variable.description && (
                                    <p className="text-[10px] text-gray-500 mt-1.5 italic">
                                        {variable.description}
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                ))}

                {variables.length === 0 && !isCreating && (
                    <div className="text-center py-8 text-gray-500">
                        <Code2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No variables yet</p>
                        <p className="text-xs">Create your first prompt variable below</p>
                    </div>
                )}
            </div>

            {/* Create Form */}
            <div className="border-t border-white/10 p-4">
                {isCreating ? (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                                className="flex-1 bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-gray-500"
                                placeholder="VariableName (no spaces)"
                                autoFocus
                            />
                            <select
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value as PromptVariable["category"])}
                                className="bg-black/50 border border-white/10 rounded px-2 py-2 text-sm text-white"
                            >
                                <option value="custom">Custom</option>
                                <option value="character">Character</option>
                                <option value="style">Style</option>
                                <option value="lighting">Lighting</option>
                                <option value="camera">Camera</option>
                            </select>
                        </div>
                        <textarea
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white resize-none placeholder:text-gray-500"
                            rows={3}
                            placeholder="Enter the prompt snippet that will replace $VariableName..."
                        />
                        <input
                            type="text"
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-gray-500"
                            placeholder="Optional description..."
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleCreate}
                                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm text-white font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Create Variable
                            </button>
                            <button
                                onClick={() => {
                                    setIsCreating(false);
                                    setNewName("");
                                    setNewValue("");
                                    setNewDescription("");
                                }}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-sm text-white transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="w-full py-2.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-sm text-purple-300 font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Variable
                    </button>
                )}
            </div>
        </div>
    );

    if (!isOpen) return null;

    if (embedded) {
        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-[400px] h-[90vh] bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
                {panelContent}
            </motion.div>
        );
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-[500px] max-h-[85vh] bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {panelContent}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
