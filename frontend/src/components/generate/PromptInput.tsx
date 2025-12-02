"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore, Element } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

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
        if (lastChar === "@") {
            setShowMentions(true);
        } else if (lastChar === " " || newValue.length === 0) {
            setShowMentions(false);
        }
    };

    const insertElement = (element: Element) => {
        const before = value.slice(0, cursorPosition);
        const after = value.slice(cursorPosition);
        // Replace the '@' if it exists right before cursor, or just append
        const newText = before + element.name + " " + after;
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
                className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            />

            <AnimatePresence>
                {showMentions && elements.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 mt-2 w-64 bg-black/90 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 backdrop-blur-xl"
                    >
                        <div className="p-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Reference Element
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                            {elements.map((element) => (
                                <button
                                    key={element.id}
                                    onClick={() => insertElement(element)}
                                    className="w-full flex items-center gap-3 p-2 hover:bg-white/10 transition-colors text-left"
                                >
                                    <div className="w-8 h-8 rounded bg-white/10 overflow-hidden flex-shrink-0">
                                        {element.type === 'video' ? (
                                            <video src={element.url} className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={element.url} alt={element.name} className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                    <span className="text-sm truncate">{element.name}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
