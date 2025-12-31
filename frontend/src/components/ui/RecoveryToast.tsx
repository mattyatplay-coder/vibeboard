/**
 * Recovery Toast Component
 *
 * Displays a notification when a recoverable session is available.
 * Shows time since last save and offers Restore/Dismiss options.
 */

'use client';

import { AlertCircle, RotateCcw, X } from 'lucide-react';
import { formatTimeAgo, PageType } from '@/lib/pageSessionStore';
import { motion, AnimatePresence } from 'framer-motion';

interface RecoveryToastProps {
    isVisible: boolean;
    savedAt: number;
    pageType: PageType;
    onRestore: () => void;
    onDismiss: () => void;
}

const PAGE_LABELS: Record<PageType, string> = {
    generate: 'Generation',
    'story-editor': 'Story Editor',
    storyboard: 'Storyboard',
    timeline: 'Timeline',
    process: 'Processing',
    train: 'Training',
};

export function RecoveryToast({
    isVisible,
    savedAt,
    pageType,
    onRestore,
    onDismiss,
}: RecoveryToastProps) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="fixed bottom-24 left-1/2 z-[100] -translate-x-1/2"
                >
                    <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-zinc-900/95 px-4 py-3 shadow-2xl backdrop-blur-sm">
                        <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-white">
                                Unsaved {PAGE_LABELS[pageType]} session found
                            </span>
                            <span className="text-xs text-gray-400">
                                Saved {formatTimeAgo(savedAt)}
                            </span>
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                            <button
                                onClick={onDismiss}
                                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                            >
                                <X className="h-3.5 w-3.5" />
                                Dismiss
                            </button>
                            <button
                                onClick={onRestore}
                                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-amber-400"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Restore
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
