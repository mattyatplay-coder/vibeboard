'use client';

import React from 'react';
import clsx from 'clsx';

interface PageLayoutProps {
  children: React.ReactNode;
  /** Custom max-width class (defaults to max-w-7xl) */
  maxWidth?: string;
  /** Show the violet spotlight at top */
  spotlight?: boolean;
  /** Additional className for the content container */
  className?: string;
}

/**
 * PageLayout - Cinematic Page Container
 *
 * Wraps page content with:
 * - Atmospheric violet spotlight glow
 * - Subtle noise texture for film grain
 * - Proper z-indexing and overflow handling
 *
 * Use this on every page to maintain visual consistency.
 *
 * @example
 * <PageLayout>
 *   <header>...</header>
 *   <main>...</main>
 * </PageLayout>
 */
export const PageLayout = ({
  children,
  maxWidth = 'max-w-7xl',
  spotlight = true,
  className,
}: PageLayoutProps) => {
  return (
    <div className="min-h-screen bg-zinc-950 relative">
      {/* 1. Ambient Spotlight (Top Center) */}
      {spotlight && (
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-900/10 blur-[120px] rounded-full pointer-events-none z-0"
          aria-hidden="true"
        />
      )}

      {/* 2. Secondary glow (subtle bottom-right accent) */}
      <div
        className="fixed bottom-0 right-0 w-[400px] h-[300px] bg-cyan-900/5 blur-[80px] rounded-full pointer-events-none z-0"
        aria-hidden="true"
      />

      {/* 3. Noise Texture */}
      <div
        className="fixed inset-0 opacity-[0.012] pointer-events-none z-0 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className={clsx('relative z-10', maxWidth && `mx-auto ${maxWidth}`, className)}>
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
