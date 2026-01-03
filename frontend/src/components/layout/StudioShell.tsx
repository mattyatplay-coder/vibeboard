'use client';

import React, { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useSidebarStore } from '@/lib/sidebarStore';
import clsx from 'clsx';

interface StudioShellProps {
  children: ReactNode;
  inspectorPanel?: ReactNode; // Optional right-side panel (Optics/Gaffer controls)
}

/**
 * StudioShell - The Elastic App Shell
 *
 * Manages the global responsive grid for VibeBoard.
 * Scales seamlessly from 10" iPad to 32" Pro Display.
 *
 * Breakpoint Behavior:
 * - Mobile (<768px): Sidebar hidden, full-width content
 * - Tablet (md: 768px+): Sidebar Icon-only (w-20), 44px+ touch targets
 * - Laptop (xl: 1280px+): Sidebar expanded (w-64), standard layout
 * - Workstation (3xl: 1920px+): Right Inspector permanently docked, Timeline taller
 */
export const StudioShell = ({ children, inspectorPanel }: StudioShellProps) => {
  const { isCollapsed } = useSidebarStore();

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden text-zinc-100"
      style={{ background: 'var(--background)' }}
    >
      {/* 1. SIDEBAR: Fixed position, responsive behavior
          - Mobile (<768px): Hidden
          - Tablet (md): Visible, auto-collapsed by useEffect in Sidebar
          - Laptop (xl+): Visible, respects user toggle
      */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* 2. MAIN CONTENT: Offset by sidebar width */}
      <main
        className={clsx(
          'flex min-h-screen flex-col transition-all duration-300 ease-in-out',
          // No margin on mobile (sidebar hidden)
          // On tablet+, account for sidebar width
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        )}
      >
        {/* The Stage (Canvas) */}
        <div className="relative flex flex-1 flex-row">
          {/* Center Stage - Primary Content Area */}
          <div className="relative flex min-w-0 flex-1 flex-col">{children}</div>

          {/* 3. RIGHT INSPECTOR: The "Workstation" Logic
              - Tablet/Laptop (<1920px): Hidden (User toggles as Drawer/Modal)
              - Ultrawide (1920px+): Permanently visible, docked to right
          */}
          {inspectorPanel && (
            <aside className="3xl:flex hidden w-80 shrink-0 flex-col overflow-y-auto border-l border-white/5 bg-zinc-950/50 backdrop-blur-sm">
              {inspectorPanel}
            </aside>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudioShell;
