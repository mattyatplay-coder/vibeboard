'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ArrowUp, ArrowDown, Highlighter } from 'lucide-react';
import { clsx } from 'clsx';

interface WeightHintTooltipProps {
  /** Whether the hint should be visible */
  isVisible: boolean;
  /** The currently selected text (if any) */
  selectedText?: string;
  /** Reference to the prompt container for positioning */
  promptContainerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Weight-to-Repetition Mapping for T5-based models (Flux, SD3.5)
 * These models don't support traditional CLIP weights, so we convert
 * weights to repeated emphasis phrases.
 */
const WEIGHT_MAPPING = [
  { range: '1.0-1.1', repetitions: '0', note: '(just removes syntax)' },
  { range: '1.2-1.3', repetitions: '1', note: '' },
  { range: '1.4-1.5', repetitions: '2', note: '' },
  { range: '1.6+', repetitions: '3', note: '' },
];

export function WeightHintTooltip({
  isVisible,
  selectedText,
  promptContainerRef,
}: WeightHintTooltipProps) {
  const [isMac, setIsMac] = useState(true);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setIsMac(navigator.platform?.toLowerCase().includes('mac') ?? true);
  }, []);

  // Position the tooltip above the prompt container, aligned to left edge
  useEffect(() => {
    if (isVisible && promptContainerRef?.current) {
      const rect = promptContainerRef.current.getBoundingClientRect();
      // Position above the prompt box, aligned to left edge
      setPosition({
        top: rect.top - 10, // 10px gap above the prompt box
        left: rect.left,
      });
    }
  }, [isVisible, promptContainerRef]);

  const modKey = isMac ? '⌘' : 'Ctrl';
  const displayText =
    selectedText && selectedText.length > 25 ? selectedText.slice(0, 25) + '...' : selectedText;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none fixed z-[100] -translate-y-full"
          style={{ top: position.top, left: position.left }}
        >
          <div className="w-72 rounded-xl border border-white/10 bg-[#1a1a1a]/95 p-4 shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20">
                <Info className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <span className="text-sm font-semibold text-white">Prompt Weighting</span>
            </div>

            {/* Selected text indicator */}
            {selectedText && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-1.5">
                <Highlighter className="h-3.5 w-3.5 text-blue-400" />
                <code className="truncate text-xs text-blue-300">{displayText}</code>
              </div>
            )}

            {/* Keyboard Shortcuts */}
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Increase weight:</span>
                <div className="flex items-center gap-1">
                  <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-gray-300">
                    {modKey}
                  </kbd>
                  <span className="text-gray-500">+</span>
                  <kbd className="flex items-center rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-gray-300">
                    <ArrowUp className="h-2.5 w-2.5" />
                  </kbd>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Decrease weight:</span>
                <div className="flex items-center gap-1">
                  <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-gray-300">
                    {modKey}
                  </kbd>
                  <span className="text-gray-500">+</span>
                  <kbd className="flex items-center rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-gray-300">
                    <ArrowDown className="h-2.5 w-2.5" />
                  </kbd>
                </div>
              </div>
            </div>

            {/* Weight Mapping Table */}
            <div className="space-y-1.5">
              <div className="mb-2 text-[10px] font-medium tracking-wider text-gray-500 uppercase">
                Weight-to-Repetition Mapping
              </div>
              <div className="overflow-hidden rounded-lg border border-white/5 bg-black/30">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-3 py-1.5 text-left font-medium text-gray-400">Weight</th>
                      <th className="px-3 py-1.5 text-left font-medium text-gray-400">
                        Extra Reps
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {WEIGHT_MAPPING.map((row, idx) => (
                      <tr
                        key={row.range}
                        className={clsx(idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]')}
                      >
                        <td className="px-3 py-1.5 font-mono text-blue-300">{row.range}</td>
                        <td className="px-3 py-1.5">
                          <span className="text-white">{row.repetitions}</span>
                          {row.note && (
                            <span className="ml-1 text-[10px] text-gray-500">{row.note}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Example */}
            <div className="mt-3 rounded-lg border border-purple-500/20 bg-purple-500/10 p-2">
              <div className="mb-1 text-[10px] font-medium text-purple-300">Example:</div>
              <div className="text-xs text-gray-300">
                <code className="rounded bg-black/30 px-1 text-purple-200">(sunset:1.4)</code>
                <span className="mx-1 text-gray-500">→</span>
                <span className="text-gray-400 italic">
                  "sunset, sunset emphasis, sunset focus"
                </span>
              </div>
            </div>

            {/* Tip */}
            <div className="mt-3 text-[10px] leading-relaxed text-gray-500">
              T5-based models (Flux, SD3.5) use text repetition instead of CLIP weights for
              emphasis.
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
