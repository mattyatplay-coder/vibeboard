import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Shimmer intensity - 'high' for prominent elements, 'low' for subtle */
  intensity?: 'low' | 'high';
  /** Shape variant */
  variant?: 'default' | 'circular' | 'text' | 'title';
}

/**
 * Skeleton - High-Fidelity Loading Placeholder
 *
 * Matches the Midnight & Neon aesthetic with a scanning shimmer effect.
 * Use instead of spinners for perceived performance.
 *
 * @example
 * // Image placeholder
 * <Skeleton className="h-32 w-full" />
 *
 * // Avatar placeholder
 * <Skeleton variant="circular" className="h-10 w-10" />
 *
 * // Text placeholder
 * <Skeleton variant="text" className="w-24" />
 */
function Skeleton({
  className,
  intensity = 'low',
  variant = 'default',
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-zinc-900/50",
        // Shape variants
        variant === 'circular' && "rounded-full",
        variant === 'text' && "h-4 rounded",
        variant === 'title' && "h-6 rounded",
        variant === 'default' && "rounded-lg",
        className
      )}
      {...props}
    >
      {/* The Shimmer Effect - animated gradient sweep */}
      <div
        className={cn(
          "absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent",
          "animate-shimmer"
        )}
        style={{ opacity: intensity === 'high' ? 0.2 : 0.1 }}
      />
    </div>
  );
}

/**
 * SkeletonCard - Pre-composed loading state for generation cards
 */
function SkeletonCard() {
  return (
    <div className="p-3 border border-white/5 rounded-xl bg-zinc-950/50">
      <Skeleton className="h-32 w-full mb-3" intensity="high" />
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="h-8 w-8" />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" className="w-3/4" />
          <Skeleton variant="text" className="w-1/2" intensity="low" />
        </div>
      </div>
    </div>
  );
}

/**
 * SkeletonTimeline - Loading state for timeline tracks
 */
function SkeletonTimeline() {
  return (
    <div className="space-y-2 p-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-12 w-20 rounded" />
          <Skeleton className="h-8 flex-1 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonStage - Loading state for the main canvas area
 */
function SkeletonStage() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Skeleton
        className="w-full max-w-4xl aspect-video"
        intensity="high"
      />
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonTimeline, SkeletonStage };
