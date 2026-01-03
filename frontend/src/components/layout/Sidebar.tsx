'use client';

import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { Wand2, Clapperboard, Settings, FileText, Paintbrush, Film, MessageSquare, Aperture, Users, Layers, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

import { useSession } from '@/context/SessionContext';
import { Plus, Folder, ChevronDown, ChevronRight, Trash2, ChevronLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Tooltip } from '@/components/ui/Tooltip';
import { DeleteConfirmationModal } from '@/components/ui/DeleteConfirmationModal';
import { useSidebarStore } from '@/lib/sidebarStore';
import { useStoryGenerationStore } from '@/lib/storyGenerationStore';
import { SpendingWidget } from '@/components/sidebar/SpendingWidget';
import { ProducerWidget } from '@/components/ui/ProducerWidget';

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter(); // UX-002: For keyboard navigation
  const projectId = params.id as string;
  const { sessions, selectedSessionId, selectSession, createSession, deleteSession } = useSession();
  const [isSessionsExpanded, setIsSessionsExpanded] = useState(true);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  // UX-003: Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<{ id: string; name: string } | null>(null);
  // Accordion state for producer widgets - only one can be expanded at a time
  const [expandedWidget, setExpandedWidget] = useState<'cost' | 'spending' | null>(null);
  const { isCollapsed, toggleSidebar, setCollapsed } = useSidebarStore();

  // Elastic Studio: Auto-collapse on smaller screens
  // Auto-collapse when viewport < 1600px, but only on mount or when crossing threshold
  // User can still manually expand/collapse at any time
  useEffect(() => {
    // Only auto-collapse on initial mount if below threshold
    if (window.innerWidth < 1600) {
      setCollapsed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Track if story generation is running in the background
  const storyGeneration = useStoryGenerationStore();
  const isStoryGenerating = storyGeneration.isRunning && storyGeneration.activeProjectId === projectId;

  if (!projectId) return null;

  // Studio Spine - The Canonical Workflow ("The Spine")
  // Group 1: Development (Story-first)
  // Group 2: Production (Shot creation)
  // Group 3: Post-Production (Polish & Delivery)
  interface StudioSpineItem {
    id: string;
    icon: LucideIcon;
    label: string;
    href: string;
    group: 1 | 2 | 3;
  }

  const STUDIO_SPINE: StudioSpineItem[] = [
    // Group 1: Development
    { id: 'script-lab', icon: FileText, label: 'Script Lab', href: `/projects/${projectId}/story-editor`, group: 1 },
    { id: 'storyboard', icon: Clapperboard, label: 'Storyboard', href: `/projects/${projectId}/storyboard`, group: 1 },
    { id: 'asset-bin', icon: Layers, label: 'Asset Bin', href: `/projects/${projectId}/elements`, group: 1 },
    { id: 'foundry', icon: Users, label: 'Character Foundry', href: `/projects/${projectId}/train`, group: 1 },
    // Group 2: Production
    { id: 'optics', icon: Aperture, label: 'Optics Engine', href: `/projects/${projectId}/optics-engine`, group: 2 },
    { id: 'shot-studio', icon: Wand2, label: 'Shot Studio', href: `/projects/${projectId}/generate`, group: 2 },
    // Group 3: Post-Production
    { id: 'vfx-suite', icon: Paintbrush, label: 'VFX Suite', href: `/projects/${projectId}/process`, group: 3 },
    { id: 'sequencer', icon: Film, label: 'Sequencer', href: `/projects/${projectId}/timeline`, group: 3 },
    { id: 'dailies', icon: MessageSquare, label: 'Dailies Review', href: `/projects/${projectId}/dailies`, group: 3 },
  ];

  const GROUP_LABELS: Record<1 | 2 | 3, string> = {
    1: 'Development',
    2: 'Production',
    3: 'Post',
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    await createSession(newSessionName);
    setNewSessionName('');
    setIsCreatingSession(false);
  };

  // Group the spine items by their group number
  const groupedSpine = STUDIO_SPINE.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<1 | 2 | 3, StudioSpineItem[]>);

  return (
    <aside
      className={clsx(
        'fixed top-0 left-0 z-50 flex h-screen flex-col text-white transition-all duration-300 ease-in-out',
        // Dramatic glass effect with visible border glow
        'bg-black/80 backdrop-blur-2xl',
        'border-r border-violet-500/20',
        // Subtle inner glow
        'shadow-[inset_-1px_0_20px_rgba(139,92,246,0.1)]',
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
          <Link href="/" className="block overflow-hidden whitespace-nowrap group">
            <h1 className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-2xl font-bold tracking-tighter text-transparent drop-shadow-[0_0_10px_rgba(139,92,246,0.5)] group-hover:drop-shadow-[0_0_20px_rgba(139,92,246,0.8)] transition-all">
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
                  <Tooltip content="Delete Session" side="right">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        // UX-003: Open delete confirmation modal
                        setSessionToDelete({ id: session.id, name: session.name });
                        setDeleteModalOpen(true);
                      }}
                      className="rounded p-1 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Tooltip>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-4">
        {([1, 2, 3] as const).map((groupNum, groupIdx) => (
          <div key={groupNum}>
            {/* Group separator with label */}
            {!isCollapsed && (
              <div className={clsx('mb-1 flex items-center gap-2 px-2', groupIdx > 0 && 'mt-4')}>
                <span className="text-label">
                  {GROUP_LABELS[groupNum]}
                </span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
            )}
            {isCollapsed && groupIdx > 0 && (
              <div className="my-3 h-px bg-white/10" />
            )}

            {/* Group items */}
            <div className="space-y-1" role="menu" aria-label={GROUP_LABELS[groupNum]}>
              {groupedSpine[groupNum]?.map(item => {
                const isActive = pathname.startsWith(item.href);
                // Show generation indicator for Script Lab when running
                const showGeneratingIndicator = item.id === 'script-lab' && isStoryGenerating;

                // UX-001 & UX-002: Navigation link with keyboard support
                const NavLink = (
                  <Link
                    key={item.id}
                    href={item.href}
                    role="menuitem"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      // UX-002: Keyboard activation with Enter or Space
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(item.href);
                      }
                    }}
                    className={clsx(
                      'group relative flex items-center gap-3 rounded-xl py-2.5 transition-colors outline-none',
                      'focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                      isCollapsed ? 'justify-center px-2' : 'px-4',
                      isActive ? 'text-white' : 'text-gray-400 hover:text-white',
                      showGeneratingIndicator && !isActive && 'text-blue-400'
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600/20 to-fuchsia-600/10 border border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      >
                        {/* Neon violet glow bar */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-violet-400 to-fuchsia-500 rounded-r shadow-[0_0_15px_rgba(139,92,246,0.8),0_0_30px_rgba(139,92,246,0.4)]" />
                      </motion.div>
                    )}
                    {/* Show spinner for Script Lab when generating */}
                    {showGeneratingIndicator ? (
                      <Loader2 className="relative z-10 h-5 w-5 flex-shrink-0 animate-spin text-blue-400" />
                    ) : (
                      <item.icon className="relative z-10 h-5 w-5 flex-shrink-0" />
                    )}
                    {!isCollapsed && (
                      <span className="relative z-10 overflow-hidden text-sm font-medium whitespace-nowrap">
                        {item.label}
                        {showGeneratingIndicator && (
                          <span className="ml-2 text-xs text-blue-400">(generating...)</span>
                        )}
                      </span>
                    )}
                  </Link>
                );

                // UX-001: Wrap in Tooltip when sidebar is collapsed
                return isCollapsed ? (
                  <Tooltip key={item.id} content={showGeneratingIndicator ? `${item.label} (generating...)` : item.label} side="right">
                    {NavLink}
                  </Tooltip>
                ) : (
                  <div key={item.id}>{NavLink}</div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Producer Widget - Est. Job Cost */}
      <div className={clsx('px-4 pb-2', isCollapsed && 'px-2')}>
        <ProducerWidget
          collapsed={isCollapsed}
          isExpanded={expandedWidget === 'cost'}
          onToggle={() => setExpandedWidget(expandedWidget === 'cost' ? null : 'cost')}
        />
      </div>

      {/* Spending Widget - Total Spending */}
      <div className={clsx('px-4 pb-2', isCollapsed && 'px-2')}>
        <SpendingWidget
          collapsed={isCollapsed}
          isExpanded={expandedWidget === 'spending'}
          onToggle={() => setExpandedWidget(expandedWidget === 'spending' ? null : 'spending')}
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

      {/* UX-003: Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSessionToDelete(null);
        }}
        onConfirm={() => {
          if (sessionToDelete) {
            deleteSession(sessionToDelete.id);
          }
        }}
        title="Delete Session"
        itemName={sessionToDelete?.name}
        description="This will permanently delete all generations, elements, and scenes within this session. This action cannot be undone."
        confirmLabel="Delete Session"
      />
    </aside>
  );
}
