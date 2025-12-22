"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, ArrowUp, ArrowDown, Command } from "lucide-react";
import { clsx } from "clsx";

interface WeightHintTooltipProps {
    /** Whether the hint should be visible */
    isVisible: boolean;
    /** Optional position offset from bottom */
    bottomOffset?: number;
}

/**
 * Weight-to-Repetition Mapping for T5-based models (Flux, SD3.5)
 * These models don't support traditional CLIP weights, so we convert
 * weights to repeated emphasis phrases.
 */
const WEIGHT_MAPPING = [
    { range: "1.0-1.1", repetitions: "0", note: "(just removes syntax)" },
    { range: "1.2-1.3", repetitions: "1", note: "" },
    { range: "1.4-1.5", repetitions: "2", note: "" },
    { range: "1.6+", repetitions: "3", note: "" },
];

export function WeightHintTooltip({ isVisible, bottomOffset = 180 }: WeightHintTooltipProps) {
    const [isMac, setIsMac] = useState(true);

    useEffect(() => {
        setIsMac(navigator.platform?.toLowerCase().includes("mac") ?? true);
    }, []);

    const modKey = isMac ? "⌘" : "Ctrl";

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="fixed z-[100] pointer-events-none"
                    style={{ bottom: bottomOffset, left: 'calc(256px + 2rem)' }}
                >
                    <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-4 w-72">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                            <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <Info className="w-3.5 h-3.5 text-blue-400" />
                            </div>
                            <span className="text-sm font-semibold text-white">Prompt Weighting</span>
                        </div>

                        {/* Keyboard Shortcuts */}
                        <div className="mb-4 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400">Increase weight:</span>
                                <div className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-[10px] font-mono text-gray-300">
                                        {modKey}
                                    </kbd>
                                    <span className="text-gray-500">+</span>
                                    <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-[10px] font-mono text-gray-300 flex items-center">
                                        <ArrowUp className="w-2.5 h-2.5" />
                                    </kbd>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400">Decrease weight:</span>
                                <div className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-[10px] font-mono text-gray-300">
                                        {modKey}
                                    </kbd>
                                    <span className="text-gray-500">+</span>
                                    <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-[10px] font-mono text-gray-300 flex items-center">
                                        <ArrowDown className="w-2.5 h-2.5" />
                                    </kbd>
                                </div>
                            </div>
                        </div>

                        {/* Weight Mapping Table */}
                        <div className="space-y-1.5">
                            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-2">
                                Weight-to-Repetition Mapping
                            </div>
                            <div className="bg-black/30 rounded-lg overflow-hidden border border-white/5">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-white/10">
                                            <th className="px-3 py-1.5 text-left text-gray-400 font-medium">Weight</th>
                                            <th className="px-3 py-1.5 text-left text-gray-400 font-medium">Extra Reps</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {WEIGHT_MAPPING.map((row, idx) => (
                                            <tr
                                                key={row.range}
                                                className={clsx(
                                                    idx % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"
                                                )}
                                            >
                                                <td className="px-3 py-1.5 font-mono text-blue-300">{row.range}</td>
                                                <td className="px-3 py-1.5">
                                                    <span className="text-white">{row.repetitions}</span>
                                                    {row.note && (
                                                        <span className="text-gray-500 ml-1 text-[10px]">{row.note}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Example */}
                        <div className="mt-3 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                            <div className="text-[10px] text-purple-300 font-medium mb-1">Example:</div>
                            <div className="text-xs text-gray-300">
                                <code className="bg-black/30 px-1 rounded text-purple-200">(sunset:1.4)</code>
                                <span className="text-gray-500 mx-1">→</span>
                                <span className="text-gray-400 italic">"sunset, sunset emphasis, sunset focus"</span>
                            </div>
                        </div>

                        {/* Tip */}
                        <div className="mt-3 text-[10px] text-gray-500 leading-relaxed">
                            T5-based models (Flux, SD3.5) use text repetition instead of CLIP weights for emphasis.
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
