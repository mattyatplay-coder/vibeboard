'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

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
  initialName = '',
  initialType = 'character',
  isBatch = false,
  title,
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
      console.error('Failed to save element:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm duration-200">
      <div className="animate-in zoom-in-95 relative w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl duration-200">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h3 className="text-sm font-bold text-white">
            {title || (isBatch ? 'Save Elements' : 'Save as Element')}
          </h3>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {/* Name Input - Only show if single item */}
          {!isBatch && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Element Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. My Avatar"
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                autoFocus
              />
            </div>
          )}

          {/* Type Selector (Customizable) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              Element Type (or Custom)
            </label>
            <div className="relative">
              <input
                list="element-types"
                type="text"
                value={type}
                onChange={e => setType(e.target.value)}
                placeholder="Select or type custom..."
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <datalist id="element-types">
                {STANDARD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </datalist>
            </div>
            <p className="mt-1 text-[10px] text-gray-500">
              Type anything to create a new category (e.g. "Face Reference")
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || (!isBatch && !name.trim()) || !type.trim()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isBatch ? 'Save All' : 'Save Element'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
