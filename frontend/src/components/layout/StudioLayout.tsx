"use client";

import { StudioSidebar } from "./StudioSidebar";

interface StudioLayoutProps {
    children: React.ReactNode;
    projectId?: string;
}

export function StudioLayout({ children, projectId }: StudioLayoutProps) {
    return (
        <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans">
            <StudioSidebar projectId={projectId} />
            <main className="flex-1 relative overflow-y-auto overflow-x-hidden h-screen">
                {/* Cinematic Background Gradient Spotlights */}
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[120px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-indigo-900/10 blur-[120px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
                </div>

                <div className="relative z-10 p-6 max-w-[1920px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
