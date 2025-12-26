"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GitBranch, GitCommit, Trash2, Tag, ChevronRight, Copy, RotateCcw, Clock, Image } from "lucide-react";
import { clsx } from "clsx";
import {
    usePromptTreeStore,
    PromptNode,
    formatTimeAgo,
    truncatePrompt,
} from "@/lib/promptTreeStore";

interface PromptTreePanelProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onLoadPrompt: (prompt: string, negativePrompt?: string) => void;
}

export function PromptTreePanel({ isOpen, onClose, projectId, onLoadPrompt }: PromptTreePanelProps) {
    const {
        getTree,
        getNode,
        getLineage,
        getChildren,
        getRoots,
        setActiveNode,
        deleteNode,
        updateNode,
        activeNodeId,
    } = usePromptTreeStore();

    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [editingLabel, setEditingLabel] = useState<string | null>(null);
    const [labelInput, setLabelInput] = useState("");

    const tree = getTree(projectId);
    const roots = getRoots(projectId);
    const currentActiveId = activeNodeId[projectId];

    // Build a map for efficient lookup
    const nodeMap = useMemo(() => {
        const map: Record<string, PromptNode> = {};
        tree.forEach((node) => {
            map[node.id] = node;
        });
        return map;
    }, [tree]);

    const toggleExpand = (nodeId: string) => {
        setExpandedNodes((prev) => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    };

    const handleLoadPrompt = (node: PromptNode) => {
        setActiveNode(projectId, node.id);
        onLoadPrompt(node.prompt, node.negativePrompt);
    };

    const handleCopyPrompt = async (prompt: string) => {
        await navigator.clipboard.writeText(prompt);
    };

    const handleSaveLabel = (nodeId: string) => {
        if (labelInput.trim()) {
            updateNode(projectId, nodeId, { label: labelInput.trim() });
        }
        setEditingLabel(null);
        setLabelInput("");
    };

    const handleDeleteNode = (nodeId: string) => {
        if (confirm('Delete this prompt and all its branches?')) {
            deleteNode(projectId, nodeId);
        }
    };

    // Render a node and its children recursively
    const renderNode = (node: PromptNode, depth: number = 0) => {
        const children = getChildren(projectId, node.id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedNodes.has(node.id);
        const isActive = currentActiveId === node.id;

        return (
            <div key={node.id} className="relative">
                {/* Branch line for nested nodes */}
                {depth > 0 && (
                    <div
                        className="absolute left-2 top-0 bottom-0 w-px bg-white/10"
                        style={{ left: `${depth * 16 + 8}px` }}
                    />
                )}

                <div
                    className={clsx(
                        "group relative flex items-start gap-2 p-2 rounded-lg transition-colors cursor-pointer",
                        isActive
                            ? "bg-purple-500/20 border border-purple-500/30"
                            : "hover:bg-white/5 border border-transparent"
                    )}
                    style={{ marginLeft: `${depth * 16}px` }}
                    onClick={() => handleLoadPrompt(node)}
                >
                    {/* Expand/Collapse button */}
                    {hasChildren ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(node.id);
                            }}
                            className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
                        >
                            <ChevronRight
                                className={clsx(
                                    "w-3 h-3 text-gray-500 transition-transform",
                                    isExpanded && "rotate-90"
                                )}
                            />
                        </button>
                    ) : (
                        <div className="w-5 flex items-center justify-center flex-shrink-0">
                            <GitCommit className="w-3 h-3 text-gray-600" />
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        {/* Label or timestamp */}
                        <div className="flex items-center gap-2 mb-0.5">
                            {editingLabel === node.id ? (
                                <input
                                    type="text"
                                    value={labelInput}
                                    onChange={(e) => setLabelInput(e.target.value)}
                                    onBlur={() => handleSaveLabel(node.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveLabel(node.id);
                                        if (e.key === 'Escape') {
                                            setEditingLabel(null);
                                            setLabelInput("");
                                        }
                                    }}
                                    autoFocus
                                    className="h-5 px-1.5 text-xs bg-black/50 border border-purple-500/30 rounded text-white focus:outline-none"
                                    placeholder="Label..."
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <>
                                    {node.label && (
                                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded font-medium">
                                            {node.label}
                                        </span>
                                    )}
                                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5" />
                                        {formatTimeAgo(node.timestamp)}
                                    </span>
                                    {node.generationIds.length > 0 && (
                                        <span className="text-[10px] text-green-500 flex items-center gap-1">
                                            <Image className="w-2.5 h-2.5" />
                                            {node.generationIds.length}
                                        </span>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Prompt preview */}
                        <p className="text-xs text-gray-300 line-clamp-2">
                            {truncatePrompt(node.prompt, 100)}
                        </p>

                        {/* Metadata badges */}
                        {node.metadata && (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {node.metadata.model && (
                                    <span className="text-[9px] px-1 py-0.5 bg-white/5 text-gray-500 rounded">
                                        {node.metadata.model.split('/').pop()}
                                    </span>
                                )}
                                {node.metadata.aspectRatio && (
                                    <span className="text-[9px] px-1 py-0.5 bg-white/5 text-gray-500 rounded">
                                        {node.metadata.aspectRatio}
                                    </span>
                                )}
                                {node.metadata.lensPreset && (
                                    <span className="text-[9px] px-1 py-0.5 bg-cyan-500/10 text-cyan-400 rounded">
                                        {node.metadata.lensPreset}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingLabel(node.id);
                                setLabelInput(node.label || "");
                            }}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            title="Add label"
                        >
                            <Tag className="w-3 h-3 text-gray-500" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCopyPrompt(node.prompt);
                            }}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            title="Copy prompt"
                        >
                            <Copy className="w-3 h-3 text-gray-500" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNode(node.id);
                            }}
                            className="p-1 rounded hover:bg-red-500/20 transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                    </div>
                </div>

                {/* Render children if expanded */}
                {hasChildren && isExpanded && (
                    <div className="mt-1">
                        {children.map((child) => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    // Get lineage for current active node
    const activeLineage = currentActiveId ? getLineage(projectId, currentActiveId) : [];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="fixed right-4 top-20 w-[400px] max-h-[85vh] bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <GitBranch className="w-5 h-5 text-purple-400" />
                            <h2 className="text-lg font-bold text-white">Prompt Tree</h2>
                            <span className="text-xs text-gray-500 px-2 py-0.5 bg-white/5 rounded-full">
                                {tree.length} versions
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    {/* Current Lineage Breadcrumb */}
                    {activeLineage.length > 0 && (
                        <div className="px-4 py-2 bg-purple-500/5 border-b border-white/10">
                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                <span className="text-purple-400 font-medium">Active Path:</span>
                                {activeLineage.map((node, i) => (
                                    <span key={node.id} className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleLoadPrompt(node)}
                                            className={clsx(
                                                "px-1.5 py-0.5 rounded transition-colors",
                                                node.id === currentActiveId
                                                    ? "bg-purple-500/30 text-purple-300"
                                                    : "hover:bg-white/10 text-gray-400"
                                            )}
                                        >
                                            {node.label || `v${i + 1}`}
                                        </button>
                                        {i < activeLineage.length - 1 && (
                                            <ChevronRight className="w-2.5 h-2.5 text-gray-600" />
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tree View */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                        {tree.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 text-sm">
                                <GitBranch className="w-8 h-8 mx-auto mb-3 opacity-30" />
                                <p>No prompt history yet.</p>
                                <p className="text-xs mt-1">Prompts are saved when you generate.</p>
                            </div>
                        ) : (
                            roots.map((root) => renderNode(root, 0))
                        )}
                    </div>

                    {/* Footer - Usage Hints */}
                    <div className="px-4 pb-4">
                        <div className="p-2 bg-purple-500/5 border border-purple-500/10 rounded-lg text-[10px] text-purple-400/70 space-y-1">
                            <div className="flex items-center gap-2">
                                <RotateCcw className="w-3 h-3" />
                                <span>Click a prompt to load it as your starting point</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <GitBranch className="w-3 h-3" />
                                <span>New prompts branch from the active node</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
