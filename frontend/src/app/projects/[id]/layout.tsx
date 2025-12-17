"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { SessionProvider } from "@/context/SessionContext";
import { useSidebarStore } from "@/lib/sidebarStore";
import { clsx } from "clsx";

export default function ProjectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isCollapsed } = useSidebarStore();

    return (
        <SessionProvider>
            <div className="min-h-screen bg-black">
                <Sidebar />
                <main className={clsx(
                    "transition-all duration-300 ease-in-out",
                    isCollapsed ? "ml-20" : "ml-64"
                )}>
                    {children}
                </main>
            </div>
        </SessionProvider>
    );
}
