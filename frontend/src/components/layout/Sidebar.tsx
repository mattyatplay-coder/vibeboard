"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { LayoutGrid, Wand2, Clapperboard, Settings, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { clsx } from "clsx";



import { useSession } from "@/context/SessionContext";
import { Plus, Folder, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useState } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params.id as string;
  const { sessions, selectedSessionId, selectSession, createSession, deleteSession } = useSession();
  const [isSessionsExpanded, setIsSessionsExpanded] = useState(true);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");

  if (!projectId) return null;

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    await createSession(newSessionName);
    setNewSessionName("");
    setIsCreatingSession(false);
  };

  const navItems = [
    { name: "Elements", href: `/projects/${projectId}/elements`, icon: LayoutGrid },
    { name: "Generate", href: `/projects/${projectId}/generate`, icon: Wand2 },
    { name: "Story Editor", href: `/projects/${projectId}/story-editor`, icon: FileText },
    { name: "Storyboard", href: `/projects/${projectId}/storyboard`, icon: Clapperboard },
    { name: "Training", href: `/projects/${projectId}/train`, icon: Wand2 },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-white/10 bg-black/90 backdrop-blur-xl text-white z-50 flex flex-col">
      <div className="p-6">
        <Link href="/" className="block">
          <h1 className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            VibeBoard
          </h1>
        </Link>
      </div>

      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-2 px-2">
          <button
            onClick={() => setIsSessionsExpanded(!isSessionsExpanded)}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-white transition-colors"
          >
            {isSessionsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Sessions
          </button>
          <button
            onClick={() => setIsCreatingSession(true)}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {isSessionsExpanded && (
          <div className="space-y-1">
            <button
              onClick={() => selectSession(null)}
              className={clsx(
                "w-full px-3 py-2 rounded-lg text-left text-sm font-medium transition-colors flex items-center gap-2",
                selectedSessionId === null
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Folder className="w-4 h-4" />
              All Sessions
            </button>

            {isCreatingSession && (
              <form onSubmit={handleCreateSession} className="px-1 py-1">
                <input
                  autoFocus
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="Name..."
                  className="w-full bg-black/30 border border-blue-500/50 rounded px-2 py-1 text-xs text-white focus:outline-none"
                  onBlur={() => !newSessionName && setIsCreatingSession(false)}
                />
              </form>
            )}

            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => selectSession(session.id)}
                className={clsx(
                  "w-full px-3 py-2 rounded-lg text-left text-sm font-medium transition-colors flex items-center justify-between group cursor-pointer",
                  selectedSessionId === session.id
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="truncate">{session.name}</span>
                  {session._count?.generations ? (
                    <span className="text-xs opacity-50 flex-shrink-0">{session._count.generations}</span>
                  ) : null}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Are you sure you want to delete this session? This will delete all generations, elements, and scenes within it.")) {
                      deleteSession(session.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-all"
                  title="Delete Session"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group",
                isActive ? "text-white" : "text-gray-400 hover:text-white"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-white/10 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className="w-5 h-5 relative z-10" />
              <span className="font-medium relative z-10">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white transition-colors w-full rounded-xl hover:bg-white/5">
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </button>
      </div>
    </aside>
  );
}
