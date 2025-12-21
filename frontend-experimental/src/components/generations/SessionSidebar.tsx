"use client";

import { useState, useEffect } from "react";
import { Plus, Folder, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { clsx } from "clsx";
import { fetchAPI } from "@/lib/api";

interface Session {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    _count?: {
        generations: number;
    };
}

interface SessionSidebarProps {
    projectId: string;
    selectedSessionId: string | null;
    onSelectSession: (sessionId: string | null) => void;
}

export function SessionSidebar({ projectId, selectedSessionId, onSelectSession }: SessionSidebarProps) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newSessionName, setNewSessionName] = useState("");

    useEffect(() => {
        loadSessions();
    }, [projectId]);

    const loadSessions = async () => {
        try {
            const data = await fetchAPI(`/projects/${projectId}/sessions`);
            setSessions(data);
        } catch (error) {
            console.error("Failed to load sessions:", error);
        }
    };

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSessionName.trim()) return;

        try {
            const newSession = await fetchAPI(`/projects/${projectId}/sessions`, {
                method: "POST",
                body: JSON.stringify({ name: newSessionName }),
            });
            setSessions([newSession, ...sessions]);
            setNewSessionName("");
            setIsCreating(false);
            onSelectSession(newSession.id);
        } catch (error) {
            console.error("Failed to create session:", error);
        }
    };

    return (
        <div className="w-64 border-r border-white/10 bg-[#121212] flex flex-col h-full">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Sessions</h2>
                <button
                    onClick={() => setIsCreating(true)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <button
                    onClick={() => onSelectSession(null)}
                    className={clsx(
                        "w-full px-3 py-2 rounded-lg text-left text-sm font-medium transition-colors flex items-center gap-2",
                        selectedSessionId === null
                            ? "bg-blue-600/20 text-blue-400"
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                >
                    <Folder className="w-4 h-4" />
                    All Generations
                </button>

                {isCreating && (
                    <form onSubmit={handleCreateSession} className="px-2 py-1">
                        <input
                            autoFocus
                            type="text"
                            value={newSessionName}
                            onChange={(e) => setNewSessionName(e.target.value)}
                            placeholder="New Session Name..."
                            className="w-full bg-black/30 border border-blue-500/50 rounded px-2 py-1 text-sm text-white focus:outline-none"
                            onBlur={() => !newSessionName && setIsCreating(false)}
                        />
                    </form>
                )}

                {sessions.map((session) => (
                    <button
                        key={session.id}
                        onClick={() => onSelectSession(session.id)}
                        className={clsx(
                            "w-full px-3 py-2 rounded-lg text-left text-sm font-medium transition-colors flex items-center justify-between group",
                            selectedSessionId === session.id
                                ? "bg-blue-600/20 text-blue-400"
                                : "text-gray-400 hover:bg-white/5 hover:text-white"
                        )}
                    >
                        <span className="truncate">{session.name}</span>
                        {session._count?.generations ? (
                            <span className="text-xs opacity-50">{session._count.generations}</span>
                        ) : null}
                    </button>
                ))}
            </div>
        </div>
    );
}
