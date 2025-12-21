"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Command, Film, Plus, Settings, Home, ArrowRight, Video, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Project, fetchAPI } from "@/lib/api";
import { clsx } from "clsx";

interface CommandItem {
    id: string;
    type: 'action' | 'project' | 'navigation';
    title: string;
    subtitle?: string;
    icon: React.ElementType;
    shortcut?: string;
    action: () => void;
}

export function CommandDeck() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Fetch projects when opened
    useEffect(() => {
        if (isOpen) {
            fetchAPI('/projects')
                .then((data) => setProjects(data))
                .catch(console.error);
        }
    }, [isOpen]);

    // Define Actions
    const actions: CommandItem[] = [
        {
            id: 'new-prod',
            type: 'action',
            title: 'New Production',
            subtitle: 'Start a new film project',
            icon: Plus,
            shortcut: 'N',
            action: () => {
                // Trigger the create modal - for now we'll route to home with a query param or just close and let user click
                // Ideally this would trigger a global create modal. 
                // For this demo, let's navigate to dashboard which has the button.
                router.push('/?action=new');
                setIsOpen(false);
            }
        },
        {
            id: 'go-home',
            type: 'navigation',
            title: 'Go to Studio',
            subtitle: 'Return to dashboard',
            icon: Home,
            shortcut: 'H',
            action: () => {
                router.push('/');
                setIsOpen(false);
            }
        },
    ];

    // Filter Items
    const filteredProjects: CommandItem[] = projects
        .filter(p => !query || p.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
        .map(p => ({
            id: p.id,
            type: 'project',
            title: p.name,
            subtitle: `${new Date(p.updatedAt).toLocaleDateString()} • ${p.generations?.length || 0} Assets`,
            icon: Film,
            action: () => {
                router.push(`/projects/${p.id}/generate`);
                setIsOpen(false);
            }
        }));

    const filteredActions = actions.filter(a =>
        !query || a.title.toLowerCase().includes(query.toLowerCase())
    );

    const allItems = [...filteredActions, ...filteredProjects];

    // Keyboard Listeners
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }

            if (!isOpen) return;

            if (e.key === "Escape") {
                setIsOpen(false);
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % allItems.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
            } else if (e.key === "Enter") {
                e.preventDefault();
                allItems[selectedIndex]?.action();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, allItems, selectedIndex]);

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 10);
        } else {
            setQuery("");
        }
    }, [isOpen]);

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current && isOpen) {
            const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedIndex, isOpen]);


    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Command Palette */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.1 }}
                        className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl shadow-indigo-500/10 overflow-hidden flex flex-col"
                    >
                        {/* Header / Input */}
                        <div className="flex items-center px-4 py-4 border-b border-white/5 gap-3">
                            <Command className="w-5 h-5 text-gray-400" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Type a command or search productions..."
                                className="flex-1 bg-transparent border-none outline-none text-lg text-white placeholder-gray-500 font-medium"
                            />
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-1 rounded">ESC</span>
                            </div>
                        </div>

                        {/* List */}
                        <div
                            ref={listRef}
                            className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide"
                        >
                            {/* Empty State */}
                            {allItems.length === 0 && (
                                <div className="py-12 text-center text-gray-500">
                                    <p>No results found.</p>
                                </div>
                            )}

                            {/* Render Items */}
                            {allItems.map((item, index) => {
                                const isSelected = index === selectedIndex;
                                return (
                                    <button
                                        key={`${item.type}-${item.id}`}
                                        onClick={item.action}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={clsx(
                                            "w-full flex items-center gap-4 px-4 py-3 rounded-lg text-left transition-colors duration-100",
                                            isSelected ? "bg-indigo-600/20" : "hover:bg-white/5"
                                        )}
                                    >
                                        <div className={clsx(
                                            "p-2 rounded-md flex items-center justify-center transition-colors",
                                            isSelected ? "bg-indigo-500 text-white" : "bg-white/5 text-gray-400"
                                        )}>
                                            <item.icon className="w-5 h-5" />
                                        </div>

                                        <div className="flex-1">
                                            <div className={clsx("font-medium", isSelected ? "text-white" : "text-gray-200")}>
                                                {item.title}
                                            </div>
                                            {item.subtitle && (
                                                <div className={clsx("text-xs", isSelected ? "text-indigo-200" : "text-gray-500")}>
                                                    {item.subtitle}
                                                </div>
                                            )}
                                        </div>

                                        {isSelected && (
                                            <ArrowRight className="w-4 h-4 text-indigo-400" />
                                        )}

                                        {item.shortcut && !isSelected && (
                                            <span className="text-[10px] font-bold text-gray-600 bg-white/5 px-2 py-1 rounded border border-white/5">
                                                {item.shortcut}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2 border-t border-white/5 bg-white/[0.02] flex justify-between items-center text-[10px] text-gray-500 font-medium">
                            <span>Press ↵ to select</span>
                            <div className="flex gap-4">
                                <span>Navigate with ↑↓</span>
                                <span>VibeBoard Studio v0.1</span>
                            </div>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
