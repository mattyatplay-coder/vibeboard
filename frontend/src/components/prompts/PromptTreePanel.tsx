'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  GitBranch,
  GitCommit,
  Trash2,
  Tag,
  ChevronRight,
  Copy,
  RotateCcw,
  Clock,
  Image,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  usePromptTreeStore,
  PromptNode,
  formatTimeAgo,
  truncatePrompt,
} from '@/lib/promptTreeStore';

interface PromptTreePanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onLoadPrompt: (prompt: string, negativePrompt?: string) => void;
}

export function PromptTreePanel({
  isOpen,
  onClose,
  projectId,
  onLoadPrompt,
}: PromptTreePanelProps) {
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
  const [labelInput, setLabelInput] = useState('');

  const tree = getTree(projectId);
  const roots = getRoots(projectId);
  const currentActiveId = activeNodeId[projectId];

  // Build a map for efficient lookup
  const nodeMap = useMemo(() => {
    const map: Record<string, PromptNode> = {};
    tree.forEach(node => {
      map[node.id] = node;
    });
    return map;
  }, [tree]);

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
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
    setLabelInput('');
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
            className="absolute top-0 bottom-0 left-2 w-px bg-white/10"
            style={{ left: `${depth * 16 + 8}px` }}
          />
        )}

        <div
          className={clsx(
            'group relative flex cursor-pointer items-start gap-2 rounded-lg p-2 transition-colors',
            isActive
              ? 'border border-purple-500/30 bg-purple-500/20'
              : 'border border-transparent hover:bg-white/5'
          )}
          style={{ marginLeft: `${depth * 16}px` }}
          onClick={() => handleLoadPrompt(node)}
        >
          {/* Expand/Collapse button */}
          {hasChildren ? (
            <button
              onClick={e => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="flex-shrink-0 rounded p-1 transition-colors hover:bg-white/10"
            >
              <ChevronRight
                className={clsx(
                  'h-3 w-3 text-gray-500 transition-transform',
                  isExpanded && 'rotate-90'
                )}
              />
            </button>
          ) : (
            <div className="flex w-5 flex-shrink-0 items-center justify-center">
              <GitCommit className="h-3 w-3 text-gray-600" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {/* Label or timestamp */}
            <div className="mb-0.5 flex items-center gap-2">
              {editingLabel === node.id ? (
                <input
                  type="text"
                  value={labelInput}
                  onChange={e => setLabelInput(e.target.value)}
                  onBlur={() => handleSaveLabel(node.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveLabel(node.id);
                    if (e.key === 'Escape') {
                      setEditingLabel(null);
                      setLabelInput('');
                    }
                  }}
                  autoFocus
                  className="h-5 rounded border border-purple-500/30 bg-black/50 px-1.5 text-xs text-white focus:outline-none"
                  placeholder="Label..."
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <>
                  {node.label && (
                    <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-medium text-purple-300">
                      {node.label}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[10px] text-gray-500">
                    <Clock className="h-2.5 w-2.5" />
                    {formatTimeAgo(node.timestamp)}
                  </span>
                  {node.generationIds.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-green-500">
                      <Image className="h-2.5 w-2.5" />
                      {node.generationIds.length}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Prompt preview */}
            <p className="line-clamp-2 text-xs text-gray-300">{truncatePrompt(node.prompt, 100)}</p>

            {/* Metadata badges */}
            {node.metadata && (
              <div className="mt-1 flex flex-wrap gap-1">
                {node.metadata.model && (
                  <span className="rounded bg-white/5 px-1 py-0.5 text-[9px] text-gray-500">
                    {node.metadata.model.split('/').pop()}
                  </span>
                )}
                {node.metadata.aspectRatio && (
                  <span className="rounded bg-white/5 px-1 py-0.5 text-[9px] text-gray-500">
                    {node.metadata.aspectRatio}
                  </span>
                )}
                {node.metadata.lensPreset && (
                  <span className="rounded bg-cyan-500/10 px-1 py-0.5 text-[9px] text-cyan-400">
                    {node.metadata.lensPreset}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-shrink-0 items-start gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={e => {
                e.stopPropagation();
                setEditingLabel(node.id);
                setLabelInput(node.label || '');
              }}
              className="rounded p-1 transition-colors hover:bg-white/10"
              title="Add label"
            >
              <Tag className="h-3 w-3 text-gray-500" />
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                handleCopyPrompt(node.prompt);
              }}
              className="rounded p-1 transition-colors hover:bg-white/10"
              title="Copy prompt"
            >
              <Copy className="h-3 w-3 text-gray-500" />
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                handleDeleteNode(node.id);
              }}
              className="rounded p-1 transition-colors hover:bg-red-500/20"
              title="Delete"
            >
              <Trash2 className="h-3 w-3 text-red-400" />
            </button>
          </div>
        </div>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div className="mt-1">{children.map(child => renderNode(child, depth + 1))}</div>
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
          className="fixed top-20 right-4 z-50 flex max-h-[85vh] w-[400px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white">Prompt Tree</h2>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-500">
                {tree.length} versions
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Current Lineage Breadcrumb */}
          {activeLineage.length > 0 && (
            <div className="border-b border-white/10 bg-purple-500/5 px-4 py-2">
              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                <span className="font-medium text-purple-400">Active Path:</span>
                {activeLineage.map((node, i) => (
                  <span key={node.id} className="flex items-center gap-1">
                    <button
                      onClick={() => handleLoadPrompt(node)}
                      className={clsx(
                        'rounded px-1.5 py-0.5 transition-colors',
                        node.id === currentActiveId
                          ? 'bg-purple-500/30 text-purple-300'
                          : 'text-gray-400 hover:bg-white/10'
                      )}
                    >
                      {node.label || `v${i + 1}`}
                    </button>
                    {i < activeLineage.length - 1 && (
                      <ChevronRight className="h-2.5 w-2.5 text-gray-600" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tree View */}
          <div className="flex-1 space-y-1 overflow-y-auto p-3">
            {tree.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">
                <GitBranch className="mx-auto mb-3 h-8 w-8 opacity-30" />
                <p>No prompt history yet.</p>
                <p className="mt-1 text-xs">Prompts are saved when you generate.</p>
              </div>
            ) : (
              roots.map(root => renderNode(root, 0))
            )}
          </div>

          {/* Footer - Usage Hints */}
          <div className="px-4 pb-4">
            <div className="space-y-1 rounded-lg border border-purple-500/10 bg-purple-500/5 p-2 text-[10px] text-purple-400/70">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-3 w-3" />
                <span>Click a prompt to load it as your starting point</span>
              </div>
              <div className="flex items-center gap-2">
                <GitBranch className="h-3 w-3" />
                <span>New prompts branch from the active node</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
