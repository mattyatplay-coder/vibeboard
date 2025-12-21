"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutGrid,
    Film,
    Clapperboard,
    Wand2,
    Music,
    Layers,
    Settings,
    ChevronLeft,
    ChevronRight,
    Users
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";

interface SidebarItem {
    id: string;
    icon: React.ElementType;
    label: string;
    href: string;
    disabled?: boolean;
}

export function StudioSidebar({ projectId }: { projectId?: string }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();

    // Workaround for icon import (Type was not in import list, adding Text alias)
    const TypeIcon = ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" x2="15" y1="20" y2="20" /><line x1="12" x2="12" y1="4" y2="20" /></svg>
    );

    const menuItems: SidebarItem[] = projectId ? [
        { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard', href: '/' },
        { id: 'script', icon: TypeIcon, label: 'Script', href: `/projects/${projectId}/script` }, // To be created
        { id: 'storyboard', icon: Clapperboard, label: 'Storyboard', href: `/projects/${projectId}/storyboard` },
        { id: 'generate', icon: Wand2, label: 'Studio', href: `/projects/${projectId}/generate` },
        { id: 'timeline', icon: Film, label: 'Timeline', href: `/projects/${projectId}/timeline`, disabled: true },
        { id: 'audio', icon: Music, label: 'VibeSync', href: `/projects/${projectId}/audio`, disabled: true },
        { id: 'assets', icon: Layers, label: 'Assets', href: `/projects/${projectId}/assets`, disabled: true },
    ] : [
        { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard', href: '/' },
        { id: 'community', icon: Users, label: 'Community', href: '/community', disabled: true },
        { id: 'settings', icon: Settings, label: 'Settings', href: '/settings', disabled: true },
    ];



    return (
        <motion.div
            initial={{ width: 260 }}
            animate={{ width: isCollapsed ? 80 : 260 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-screen glass-panel border-r border-r-[var(--glass-border)] sticky top-0 left-0 z-50 flex flex-col justify-between py-6"
        >
            {/* Logo Area */}
            <div className={clsx("flex items-center px-6 mb-8", isCollapsed ? "justify-center" : "justify-between")}>
                {!isCollapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                    >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Film className="w-4 h-4 text-white fill-white/20" />
                        </div>
                        <span className="font-bold text-lg tracking-tight text-white">VibeBoard</span>
                    </motion.div>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                    {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 px-4 space-y-1">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.id}
                            href={item.disabled ? '#' : item.href}
                            className={clsx(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group",
                                item.disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white/5",
                                isActive && "bg-white/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                            )}
                        >
                            {/* Active Glow Bar */}
                            {isActive && (
                                <motion.div
                                    layoutId="active-nav"
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full"
                                />
                            )}

                            <item.icon className={clsx(
                                "w-5 h-5 transition-colors",
                                isActive ? "text-indigo-400" : "text-gray-400 group-hover:text-gray-200"
                            )} />

                            {!isCollapsed && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-sm font-medium text-gray-300 group-hover:text-white"
                                >
                                    {item.label}
                                </motion.span>
                            )}

                            {/* Tooltip for collapsed state */}
                            {isCollapsed && (
                                <div className="absolute left-full ml-4 px-2 py-1 bg-black/90 border border-white/10 rounded text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                                    {item.label}
                                </div>
                            )}
                        </Link>
                    )
                })}
            </div>

            {/* Footer / User */}
            <div className="px-4 border-t border-white/5 pt-4">
                <div className={clsx("flex items-center gap-3", isCollapsed ? "justify-center" : "")}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-r from-gray-700 to-gray-600 border border-white/10" />
                    {!isCollapsed && (
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">Director</p>
                            <p className="text-xs text-gray-500 truncate">Pro Studio</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
