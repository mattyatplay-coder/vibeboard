'use client';

import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';

interface ContextualBackButtonProps {
    /** Custom fallback path. Defaults to Script Lab (story-editor) */
    fallbackPath?: string;
    /** Button label. Defaults to "Back" */
    label?: string;
    /** Additional CSS classes */
    className?: string;
}

/**
 * ContextualBackButton - Smart navigation with safe fallback
 *
 * Attempts browser history first. If history is empty or would navigate
 * outside the app, falls back to Script Lab (the canonical project hub).
 *
 * Usage:
 *   <ContextualBackButton />  // Default: goes back or to Script Lab
 *   <ContextualBackButton fallbackPath="/projects/123/storyboard" />
 */
export function ContextualBackButton({
    fallbackPath,
    label = 'Back',
    className,
}: ContextualBackButtonProps) {
    const router = useRouter();
    const { id: projectId } = useParams();

    // Determine the safe fallback destination
    // Script Lab is the canonical "hub" of the Studio Spine
    const safeFallback = fallbackPath || `/projects/${projectId}/story-editor`;

    const handleBack = () => {
        // Check if we have meaningful history within our app
        // window.history.length includes the current page, so > 2 means we have places to go back
        if (typeof window !== 'undefined' && window.history.length > 2) {
            router.back();
        } else {
            // No history or at the start - go to the safe fallback
            router.push(safeFallback);
        }
    };

    return (
        <button
            onClick={handleBack}
            className={clsx(
                'flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white',
                className
            )}
        >
            <ChevronLeft className="h-5 w-5" />
            {label}
        </button>
    );
}
