'use client';

import React from 'react';
import { Users, Package, Variable, Image, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import type { AutocompleteItem, TriggerType } from '@/hooks/usePromptAutocomplete';

interface AutocompletePopupProps {
  isOpen: boolean;
  items: AutocompleteItem[];
  query: string;
  triggerType: TriggerType | null;
  onSelect: (item: AutocompleteItem) => void;
  onClose: () => void;
  className?: string;
}

const TRIGGER_CONFIG: Record<
  TriggerType,
  { icon: LucideIcon; color: string; label: string; bgColor: string }
> = {
  '@': { icon: Users, color: 'text-blue-400', label: 'Elements', bgColor: 'bg-blue-500/20' },
  '#': { icon: Package, color: 'text-amber-400', label: 'Props', bgColor: 'bg-amber-500/20' },
  $: { icon: Variable, color: 'text-purple-400', label: 'Variables', bgColor: 'bg-purple-500/20' },
};

export function AutocompletePopup({
  isOpen,
  items,
  query,
  triggerType,
  onSelect,
  onClose,
  className,
}: AutocompletePopupProps) {
  if (!isOpen || !triggerType || items.length === 0) return null;

  const config = TRIGGER_CONFIG[triggerType as TriggerType];
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        'animate-in slide-in-from-bottom-2 fade-in absolute z-50 w-full rounded-xl border border-white/20 bg-[#1a1a1a] shadow-2xl duration-200',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-2">
        <div className="flex items-center gap-2">
          <Icon className={clsx('h-3 w-3', config.color)} />
          <span className="text-xs font-medium tracking-wider text-gray-300 uppercase">
            {config.label}
            {query && <span className="ml-1 text-gray-500">: "{query}"</span>}
          </span>
        </div>
        <span className="text-[10px] text-gray-500">
          {items.length} match{items.length !== 1 ? 'es' : ''} • Tab to select
        </span>
      </div>

      {/* Items - Horizontal scroll for elements with images, vertical list for text-only */}
      {triggerType === '@' ? (
        // Horizontal thumbnail layout for elements
        <div className="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent flex gap-2 overflow-x-auto p-2">
          {items.map(item => (
            <button
              key={item.id}
              onMouseDown={e => {
                e.preventDefault(); // Prevent textarea blur
                onSelect(item);
              }}
              className="group relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 transition-all hover:scale-105 hover:border-blue-500"
            >
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-800">
                  <Image className="h-6 w-6 text-gray-600" />
                </div>
              )}
              {/* Name overlay on hover */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="block truncate text-[10px] font-medium text-white">
                  {item.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        // Vertical list for props and variables
        <div className="max-h-48 overflow-y-auto p-1">
          {items.map(item => (
            <button
              key={item.id}
              onMouseDown={e => {
                e.preventDefault(); // Prevent textarea blur
                onSelect(item);
              }}
              className={clsx(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                'hover:bg-white/5'
              )}
            >
              {/* Icon or thumbnail */}
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="h-8 w-8 rounded object-cover" />
              ) : (
                <div
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded',
                    config.bgColor
                  )}
                >
                  <Icon className={clsx('h-4 w-4', config.color)} />
                </div>
              )}

              {/* Name and description */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{item.name}</span>
                  {item.category && (
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-400">
                      {item.category}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="truncate text-xs text-gray-500">
                    {item.description.slice(0, 60)}
                    {item.description.length > 60 ? '...' : ''}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
