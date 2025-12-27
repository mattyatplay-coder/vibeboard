'use client';

import { useState, useEffect } from 'react';
import { fetchAPI, Project } from '@/lib/api';
import Link from 'next/link';
import { Plus, ArrowRight, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip } from '@/components/ui/Tooltip';

export default function ProjectSelector() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Project name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchAPI('/projects', {
        method: 'POST',
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      toast.success('Project created!', {
        description: `"${newName}" is ready to use.`,
      });
      setNewName('');
      setNewDesc('');
      setIsCreating(false);
      loadProjects();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create project', {
        description: 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // Prevent Link navigation
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

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-4xl font-bold text-transparent">
              VibeBoard
            </h1>
            <p className="mt-2 text-gray-400">Select a project to start creating.</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 font-medium text-black transition-colors hover:bg-gray-200"
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </header>

        {isCreating && (
          <div className="animate-in fade-in slide-in-from-top-4 mb-8 rounded-xl border border-white/10 bg-white/5 p-6">
            <form onSubmit={handleCreate} className="space-y-4" aria-label="Create new project">
              <div>
                <label
                  htmlFor="project-name"
                  className="mb-1 block text-sm font-medium text-gray-400"
                >
                  Project Name{' '}
                  <span className="text-red-400" aria-label="required">
                    *
                  </span>
                </label>
                <input
                  id="project-name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="My Awesome Movie"
                  autoFocus
                  required
                  aria-required="true"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label
                  htmlFor="project-desc"
                  className="mb-1 block text-sm font-medium text-gray-400"
                >
                  Description
                </label>
                <input
                  id="project-desc"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="A sci-fi thriller about..."
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="rounded px-4 py-2 text-sm text-gray-400 hover:text-white focus:ring-2 focus:ring-white/50 focus:outline-none"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim() || isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-500 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-black focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <Link
              key={project.id}
              href={`/projects/${project.id}/elements`}
              className="group relative block rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-white/20 hover:bg-white/10"
            >
              <Tooltip content="Delete Project" side="top">
                <button
                  onClick={e => handleDelete(e, project.id)}
                  className="absolute top-4 right-4 rounded-full p-2 text-gray-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-white/10 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Tooltip>

              <h3 className="mb-2 pr-8 text-xl font-bold transition-colors group-hover:text-blue-400">
                {project.name}
              </h3>
              <p className="mb-4 line-clamp-2 text-sm text-gray-400">
                {project.description || 'No description'}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                <ArrowRight className="h-4 w-4 -translate-x-2 opacity-0 transition-opacity group-hover:translate-x-0 group-hover:opacity-100" />
              </div>
            </Link>
          ))}
        </div>

        {projects.length === 0 && !isCreating && (
          <div className="py-20 text-center text-gray-500">
            <p>No projects yet. Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
