'use client';

import { StudioSidebar } from './StudioSidebar';

interface StudioLayoutProps {
  children: React.ReactNode;
  projectId?: string;
}

export function StudioLayout({ children, projectId }: StudioLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[var(--background)] font-sans text-[var(--foreground)]">
      <StudioSidebar projectId={projectId} />
      <main className="relative h-screen flex-1 overflow-x-hidden overflow-y-auto">
        {/* Cinematic Background Gradient Spotlights */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div
            className="absolute top-[-20%] left-[-10%] h-[50%] w-[50%] animate-pulse rounded-full bg-purple-900/10 mix-blend-screen blur-[120px]"
            style={{ animationDuration: '8s' }}
          />
          <div
            className="absolute right-[-10%] bottom-[-10%] h-[60%] w-[40%] animate-pulse rounded-full bg-indigo-900/10 mix-blend-screen blur-[120px]"
            style={{ animationDuration: '12s' }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-[1920px] p-6">{children}</div>
      </main>
    </div>
  );
}
