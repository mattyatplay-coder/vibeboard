'use client';

import React from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * DashboardLayout - Cinematic Stage Container
 *
 * Provides the atmospheric backdrop for the dashboard:
 * - "Stage Light" violet glow from top center
 * - Subtle noise texture for film grain effect
 * - Proper z-indexing for content layers
 */
export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-zinc-950 relative selection:bg-violet-500/30">
      {/* 1. Ambient Background Glow (Top Center "Stage Light") */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-violet-500/10 blur-[120px] rounded-full pointer-events-none"
        aria-hidden="true"
      />

      {/* 2. Secondary glow (bottom right, subtle) */}
      <div
        className="fixed bottom-0 right-0 w-[600px] h-[300px] bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none"
        aria-hidden="true"
      />

      {/* 3. Subtle Noise Texture (Film Grain) */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      {/* Content Layer */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;
