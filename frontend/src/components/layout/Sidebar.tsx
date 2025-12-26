'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { LayoutGrid, Wand2, Clapperboard, Settings, FileText, Paintbrush } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

import { useSession } from '@/context/SessionContext';
import { Plus, Folder, ChevronDown, ChevronRight, Trash2, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { SpendingWidget } from '@/components/sidebar/SpendingWidget';
import { useSidebarStore } from '@/lib/sidebarStore';
import { useEngineConfigStore } from '@/lib/engineConfigStore';

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params.id as string;
  const { sessions, selectedSessionId, selectSession, createSession, deleteSession } = useSession();
  const [isSessionsExpanded, setIsSessionsExpanded] = useState(true);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const { currentModelId, currentDuration, isVideo } = useEngineConfigStore();

  if (!projectId) return null;

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    await createSession(newSessionName);
    setNewSessionName('');
    setIsCreatingSession(false);
  };

  const navItems = [
    { name: 'Elements', href: `/projects/${projectId}/elements`, icon: LayoutGrid },
    { name: 'Generate', href: `/projects/${projectId}/generate`, icon: Wand2 },
    { name: 'Roto & Paint', href: `/projects/${projectId}/process`, icon: Paintbrush },
    { name: 'Story Editor', href: `/projects/${projectId}/story-editor`, icon: FileText },
    { name: 'Storyboard', href: `/projects/${projectId}/storyboard`, icon: Clapperboard },
    { name: 'Training', href: `/projects/${projectId}/train`, icon: Wand2 },
  ];

  return (
    <aside
      className={clsx(
        'fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-white/10 bg-black/90 text-white backdrop-blur-xl transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <div
        className={clsx(
          'flex items-center p-6',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!isCollapsed && (
          <Link href="/" className="block overflow-hidden whitespace-nowrap">
            <h1 className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-2xl font-bold tracking-tighter text-transparent">
              VibeBoard
            </h1>
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className="text-gray-500 transition-colors hover:text-white"
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="mb-6 overflow-hidden px-4">
          <div className="mb-2 flex items-center justify-between px-2">
            <button
              onClick={() => setIsSessionsExpanded(!isSessionsExpanded)}
              className="flex items-center gap-1 text-xs font-bold tracking-wider text-gray-500 uppercase transition-colors hover:text-white"
            >
              {isSessionsExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Sessions
            </button>
            <button
              onClick={() => setIsCreatingSession(true)}
              className="text-gray-500 transition-colors hover:text-white"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {isSessionsExpanded && (
            <div className="space-y-1">
              <button
                onClick={() => selectSession(null)}
                className={clsx(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                  selectedSessionId === null
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <Folder className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">All Sessions</span>
              </button>

              {isCreatingSession && (
                <form onSubmit={handleCreateSession} className="px-1 py-1">
                  <input
                    autoFocus
                    type="text"
                    value={newSessionName}
                    onChange={e => setNewSessionName(e.target.value)}
                    placeholder="Name..."
                    className="w-full rounded border border-blue-500/50 bg-black/30 px-2 py-1 text-xs text-white focus:outline-none"
                    onBlur={() => !newSessionName && setIsCreatingSession(false)}
                  />
                </form>
              )}

              {sessions.map(session => (
                <div
                  key={session.id}
                  onClick={() => selectSession(session.id)}
                  className={clsx(
                    'group flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                    selectedSessionId === session.id
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="truncate">{session.name}</span>
                    {session._count?.generations ? (
                      <span className="flex-shrink-0 text-xs opacity-50">
                        {session._count.generations}
                      </span>
                    ) : null}
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (
                        confirm(
                          'Are you sure you want to delete this session? This will delete all generations, elements, and scenes within it.'
                        )
                      ) {
                        deleteSession(session.id);
                      }
                    }}
                    className="rounded p-1 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
                    title="Delete Session"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-2 px-4">
        {navItems.map(item => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              className={clsx(
                'group relative flex items-center gap-3 rounded-xl py-3 transition-colors',
                isCollapsed ? 'justify-center px-2' : 'px-4',
                isActive ? 'text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-xl bg-white/10"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className="relative z-10 h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="relative z-10 overflow-hidden font-medium whitespace-nowrap">
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Spending Widget */}
      <div className={clsx('px-4 pb-2', isCollapsed && 'px-2')}>
        <SpendingWidget
          collapsed={isCollapsed}
          currentModelId={currentModelId ?? undefined}
          currentDuration={currentDuration ?? undefined}
          isVideo={isVideo}
        />
      </div>

      <div className="border-t border-white/10 p-4">
        <button
          className={clsx(
            'flex w-full items-center gap-3 rounded-xl text-gray-400 transition-colors hover:bg-white/5 hover:text-white',
            isCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'
          )}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Settings</span>}
        </button>
      </div>
    </aside>
  );
}
