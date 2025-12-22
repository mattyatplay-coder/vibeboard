'use client';

import { X, Check } from 'lucide-react';
import { Element } from '@/lib/store';
import { clsx } from 'clsx';

interface ElementPickerProps {
  isOpen: boolean;
  onClose: () => void;
  elements: Element[];
  selectedElementIds: string[];
  onToggleElement: (element: Element) => void;
}

export function ElementPicker({
  isOpen,
  onClose,
  elements,
  selectedElementIds,
  onToggleElement,
}: ElementPickerProps) {
  console.log('ElementPicker elements:', elements);
  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in zoom-in-95 absolute right-0 bottom-full z-50 mb-4 flex max-h-[500px] w-96 flex-col rounded-xl border border-white/20 bg-[#1a1a1a] shadow-2xl duration-200">
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <h3 className="text-sm font-bold tracking-wider text-white uppercase">Select Elements</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-2">
        {elements.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No elements found. Upload some in the Elements tab!
          </div>
        ) : (
          Object.entries(
            elements.reduce(
              (acc, el) => {
                const sessionName = el.session?.name || 'Global / Unassigned';
                if (!acc[sessionName]) acc[sessionName] = [];
                acc[sessionName].push(el);
                return acc;
              },
              {} as Record<string, Element[]>
            )
          ).map(([sessionName, sessionElements]) => (
            <div key={sessionName}>
              <h4 className="mb-2 px-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
                {sessionName}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {sessionElements.map(el => {
                  const isSelected = selectedElementIds.includes(el.id);
                  return (
                    <button
                      key={el.id}
                      onClick={() => onToggleElement(el)}
                      className={clsx(
                        'group relative aspect-square overflow-hidden rounded-lg border-2 transition-all',
                        isSelected ? 'border-blue-500' : 'border-transparent hover:border-white/20'
                      )}
                    >
                      {el.type === 'video' ? (
                        <video src={el.url} className="h-full w-full object-cover" />
                      ) : (
                        <img src={el.url} className="h-full w-full object-cover" />
                      )}

                      <div
                        className={clsx(
                          'absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity',
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        )}
                      >
                        {isSelected && <Check className="h-6 w-6 text-blue-500" />}
                      </div>

                      <div className="absolute right-0 bottom-0 left-0 truncate bg-black/60 p-1 text-[10px] text-white">
                        {el.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
