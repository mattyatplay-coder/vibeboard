'use client';

import { useState, useEffect, useMemo } from 'react';
import { fetchAPI, Project } from '@/lib/api';
import { Loader2, Grid, List, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { GhostCard } from '@/components/dashboard/GhostCard';
import { CreateProjectModal } from '@/components/dashboard/CreateProjectModal';

type ViewMode = 'grid' | 'list';
type SortMode = 'recent' | 'name' | 'created';

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await fetchAPI('/projects');
      setProjects(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load projects', {
        description: 'Please check your connection and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;

    try {
      await fetchAPI(`/projects/${id}`, { method: 'DELETE' });
      toast.success('Project deleted');
      loadProjects();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete project');
    }
  };

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortMode) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'created':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'recent':
      default:
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
    }

    return result;
  }, [projects, searchQuery, sortMode]);

  // Format relative date
  const formatDate = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              <div className="absolute inset-0 h-8 w-8 animate-ping rounded-full bg-violet-500/20" />
            </div>
            <span className="text-xs text-zinc-600 font-mono uppercase tracking-wider">
              Loading projects...
            </span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardHeader
        onNewProject={() => setIsCreating(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="px-8 py-10 max-w-[1400px] mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-sm font-medium text-zinc-400">
            {searchQuery ? 'Search Results' : 'Recent Projects'}
          </h2>

          {/* View Controls */}
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <button
              onClick={() => setSortMode((prev) => (prev === 'recent' ? 'name' : prev === 'name' ? 'created' : 'recent'))}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium text-zinc-500 hover:text-zinc-300 bg-zinc-900/50 border border-white/5 rounded-lg transition-colors"
            >
              <SlidersHorizontal size={12} />
              <span className="capitalize">{sortMode}</span>
            </button>

            {/* View Toggle */}
            <div className="flex items-center bg-zinc-900/50 border border-white/5 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'text-violet-400 bg-violet-500/10'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Grid size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'text-violet-400 bg-violet-500/10'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Project Grid - Wider spacing for glow effects */}
        <motion.div
          layout
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'flex flex-col gap-3'
          }
        >
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <DashboardCard
                  id={project.id}
                  title={project.name}
                  description={project.description}
                  date={formatDate(project.updatedAt)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Ghost Card (always show if there's room) */}
          {filteredProjects.length < 8 && (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: filteredProjects.length * 0.05 }}
            >
              <GhostCard onClick={() => setIsCreating(true)} />
            </motion.div>
          )}
        </motion.div>

        {/* Empty State */}
        {filteredProjects.length === 0 && !searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-20 h-20 rounded-2xl bg-zinc-900/50 border border-white/5 flex items-center justify-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <span className="text-2xl">🎬</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No projects yet</h3>
            <p className="text-sm text-zinc-500 mb-6 text-center max-w-xs">
              Create your first project to start building AI-generated productions.
            </p>
            <motion.button
              onClick={() => setIsCreating(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all"
            >
              Create First Project
            </motion.button>
          </motion.div>
        )}

        {/* No search results */}
        {filteredProjects.length === 0 && searchQuery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <p className="text-sm text-zinc-500">
              No projects matching "{searchQuery}"
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              Clear search
            </button>
          </motion.div>
        )}
      </main>

      {/* Create Project Modal */}
      <AnimatePresence>
        {isCreating && (
          <CreateProjectModal
            onClose={() => setIsCreating(false)}
            onSuccess={() => {
              setIsCreating(false);
              loadProjects();
            }}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
