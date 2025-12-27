'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Edit2, Check, Code2, Lightbulb, Copy } from 'lucide-react';
import { clsx } from 'clsx';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  usePromptVariablesStore,
  PromptVariable,
  detectUnexpandedVariables,
} from '@/lib/promptVariablesStore';
import { toast } from 'sonner';

interface PromptVariablesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  character: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  style: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  lighting: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  camera: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  custom: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

export function PromptVariablesPanel({
  isOpen,
  onClose,
  embedded = false,
}: PromptVariablesPanelProps) {
  const { variables, addVariable, updateVariable, deleteVariable } = usePromptVariablesStore();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<PromptVariable['category']>('custom');

  const handleCreate = () => {
    if (!newName.trim() || !newValue.trim()) {
      toast.error('Name and value are required');
      return;
    }

    // Validate name format (no spaces, starts with letter)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newName)) {
      toast.error('Variable name must start with a letter and contain no spaces');
      return;
    }

    addVariable({
      name: newName.trim(),
      value: newValue.trim(),
      description: newDescription.trim() || undefined,
      category: newCategory,
    });

    setNewName('');
    setNewValue('');
    setNewDescription('');
    setNewCategory('custom');
    setIsCreating(false);
    toast.success(`Variable $${newName} created`);
  };

  const handleCopyUsage = (name: string) => {
    navigator.clipboard.writeText(`$${name}`);
    toast.success(`Copied $${name} to clipboard`);
  };

  const panelContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-bold text-white">Prompt Variables</h2>
        </div>
        {!embedded && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Hint */}
      <div className="border-b border-purple-500/20 bg-purple-500/10 px-4 py-3">
        <div className="flex gap-2 text-xs text-purple-200">
          <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="mb-1 font-medium">How to use:</p>
            <p className="text-purple-300/80">
              Type <code className="rounded bg-purple-500/30 px-1">$VariableName</code> or{' '}
              <code className="rounded bg-purple-500/30 px-1">{'${VariableName}'}</code> in your
              prompt. Variables are expanded automatically before generation.
            </p>
          </div>
        </div>
      </div>

      {/* Variables List */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {variables.map(variable => (
          <div
            key={variable.id}
            className="rounded-lg border border-white/10 bg-white/5 p-3 transition-colors hover:border-white/20"
          >
            {editingId === variable.id ? (
              /* Edit Mode */
              <div className="space-y-2">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-sm text-white"
                  placeholder="Variable name"
                />
                <textarea
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  className="w-full resize-none rounded border border-white/10 bg-black/50 px-2 py-1.5 text-sm text-white"
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
                      toast.success('Variable updated');
                    }}
                    className="flex-1 rounded bg-green-600 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-500"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex-1 rounded bg-white/10 py-1.5 text-xs text-white transition-colors hover:bg-white/20"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <>
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-purple-300">
                      ${variable.name}
                    </span>
                    {variable.category && (
                      <span
                        className={clsx(
                          'rounded border px-1.5 py-0.5 text-[10px]',
                          CATEGORY_COLORS[variable.category]
                        )}
                      >
                        {variable.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip content="Copy usage" side="top">
                      <button
                        onClick={() => handleCopyUsage(variable.name)}
                        className="rounded p-1 transition-colors hover:bg-white/10"
                      >
                        <Copy className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Edit" side="top">
                      <button
                        onClick={() => {
                          setEditingId(variable.id);
                          setNewName(variable.name);
                          setNewValue(variable.value);
                        }}
                        className="rounded p-1 transition-colors hover:bg-white/10"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Delete" side="top">
                      <button
                        onClick={() => {
                          deleteVariable(variable.id);
                          toast.success(`Deleted $${variable.name}`);
                        }}
                        className="rounded p-1 transition-colors hover:bg-red-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
                <p className="line-clamp-2 rounded bg-black/30 px-2 py-1.5 font-mono text-xs text-gray-400">
                  {variable.value}
                </p>
                {variable.description && (
                  <p className="mt-1.5 text-[10px] text-gray-500 italic">{variable.description}</p>
                )}
              </>
            )}
          </div>
        ))}

        {variables.length === 0 && !isCreating && (
          <div className="py-8 text-center text-gray-500">
            <Code2 className="mx-auto mb-2 h-8 w-8 opacity-50" />
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
                onChange={e => setNewName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                className="flex-1 rounded border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-gray-500"
                placeholder="VariableName (no spaces)"
                autoFocus
              />
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as PromptVariable['category'])}
                className="rounded border border-white/10 bg-black/50 px-2 py-2 text-sm text-white"
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
              onChange={e => setNewValue(e.target.value)}
              className="w-full resize-none rounded border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-gray-500"
              rows={3}
              placeholder="Enter the prompt snippet that will replace $VariableName..."
            />
            <input
              type="text"
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              className="w-full rounded border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-gray-500"
              placeholder="Optional description..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="flex flex-1 items-center justify-center gap-2 rounded bg-purple-600 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500"
              >
                <Check className="h-4 w-4" />
                Create Variable
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewName('');
                  setNewValue('');
                  setNewDescription('');
                }}
                className="rounded bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-purple-500/30 bg-purple-600/20 py-2.5 text-sm font-medium text-purple-300 transition-colors hover:bg-purple-600/30"
          >
            <Plus className="h-4 w-4" />
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
        className="h-[90vh] w-[400px] overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
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
          className="max-h-[85vh] w-[500px] overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {panelContent}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
