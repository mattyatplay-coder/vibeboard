'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore, Element } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function PromptInput({ value, onChange }: PromptInputProps) {
  const { elements } = useAppStore();
  const [showMentions, setShowMentions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newCursorPosition = e.target.selectionStart;
    onChange(newValue);
    setCursorPosition(newCursorPosition);

    // Check if the last character typed was '@'
    const lastChar = newValue.slice(newCursorPosition - 1, newCursorPosition);
    if (lastChar === '@') {
      setShowMentions(true);
    } else if (lastChar === ' ' || newValue.length === 0) {
      setShowMentions(false);
    }
  };

  const insertElement = (element: Element) => {
    const before = value.slice(0, cursorPosition);
    const after = value.slice(cursorPosition);
    // Replace the '@' if it exists right before cursor, or just append
    const newText = before + element.name + ' ' + after;
    onChange(newText);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        placeholder="Describe your scene... Type @ to reference an element"
        className="h-32 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
      />

      <AnimatePresence>
        {showMentions && elements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-black/90 shadow-2xl backdrop-blur-xl"
          >
            <div className="p-2 text-xs font-medium tracking-wider text-gray-400 uppercase">
              Reference Element
            </div>
            <div className="max-h-48 overflow-y-auto">
              {elements.map(element => (
                <button
                  key={element.id}
                  onClick={() => insertElement(element)}
                  className="flex w-full items-center gap-3 p-2 text-left transition-colors hover:bg-white/10"
                >
                  <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded bg-white/10">
                    {element.type === 'video' ? (
                      <video src={element.url} className="h-full w-full object-cover" />
                    ) : (
                      <img
                        src={element.url}
                        alt={element.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <span className="truncate text-sm">{element.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
