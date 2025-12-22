'use client';

import { Project } from '@/lib/api';
import { motion } from 'framer-motion';
import { Plus, MoreVertical, Play, Clock, Calendar, Film } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { clsx } from 'clsx';

interface ProjectGalleryProps {
  projects: Project[];
  onDelete: (id: string) => void;
  onCreateClick: () => void;
}

export function ProjectGallery({ projects, onDelete, onCreateClick }: ProjectGalleryProps) {
  // Sort by recent
  const sortedProjects = [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const featuredProject = sortedProjects[0];
  const gridProjects = sortedProjects.slice(1);

  return (
    <div className="space-y-10">
      {/* Header / Hero */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-4xl font-bold text-transparent">
            Studio Dashboard
          </h1>
          <p className="mt-2 text-gray-400">Manage your productions and cinematic universe.</p>
        </div>
        <button
          onClick={onCreateClick}
          className="glass-button flex items-center gap-2 rounded-full px-6 py-3 font-medium text-white transition-all hover:border-indigo-500/50 hover:bg-indigo-500/20"
        >
          <Plus className="h-5 w-5" />
          New Production
        </button>
      </div>

      {/* Featured Project (First in list) */}
      {featuredProject && (
        <section>
          <h2 className="mb-4 text-sm font-semibold tracking-wider text-gray-500 uppercase">
            Jump Back In
          </h2>
          <Link href={`/projects/${featuredProject.id}/generate`}>
            <div className="group glass-panel relative h-[400px] w-full overflow-hidden rounded-2xl transition-all hover:border-[var(--glass-border-hover)]">
              {/* Background Image Placeholder (To be replaced with dynamic poster) */}
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 bg-gray-900 transition-transform duration-1000 group-hover:scale-105">
                {/* If we had a cover image, it would go here. For now, a generated pattern. */}
                <div className="h-full w-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-cover opacity-30" />
                <div className="absolute inset-0 bg-indigo-900/20 mix-blend-overlay" />
              </div>

              <div className="absolute bottom-0 left-0 z-20 max-w-2xl p-10">
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-full bg-indigo-500/80 px-3 py-1 text-xs font-bold tracking-wide text-white uppercase backdrop-blur-md">
                    Active Production
                  </span>
                  <span className="flex items-center gap-1 text-sm text-gray-300">
                    <Clock className="h-3 w-3" /> Last edited{' '}
                    {new Date(featuredProject.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="mb-4 text-5xl leading-tight font-bold text-white transition-colors group-hover:text-indigo-200">
                  {featuredProject.name}
                </h2>
                <p className="line-clamp-2 max-w-xl text-lg text-gray-300">
                  {featuredProject.description ||
                    'No specific treatment defined for this production.'}
                </p>

                <div className="mt-6 flex translate-y-4 transform items-center gap-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <span className="flex items-center gap-2 font-medium text-white">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black">
                      <Play className="ml-0.5 h-4 w-4 fill-current" />
                    </div>
                    Open Studio
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Grid */}
      <section>
        <h2 className="mb-6 text-sm font-semibold tracking-wider text-gray-500 uppercase">
          Recent Productions
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {gridProjects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/projects/${project.id}/generate`} className="group block h-full">
                <div className="glass-panel relative flex h-full min-h-[220px] flex-col justify-between rounded-xl p-6 transition-all hover:bg-white/5">
                  <div>
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/5 bg-gradient-to-br from-gray-800 to-black transition-colors group-hover:border-indigo-500/30">
                        <Film className="h-6 w-6 text-gray-600 group-hover:text-indigo-400" />
                      </div>
                      <button
                        onClick={e => {
                          e.preventDefault();
                          onDelete(project.id);
                        }}
                        className="rounded-full p-2 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        title="Delete Project"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>

                    <h3 className="mb-2 text-xl font-bold text-white transition-colors group-hover:text-indigo-300">
                      {project.name}
                    </h3>
                    <p className="mb-4 line-clamp-2 text-sm text-gray-400">
                      {project.description || 'Untitled Production'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 border-t border-white/5 pt-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{' '}
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}

          {/* Empty State placeholder if few projects */}
          {gridProjects.length === 0 && !featuredProject && (
            <div className="col-span-full rounded-2xl border border-dashed border-white/10 py-20 text-center">
              <p className="text-gray-500">No productions found. Start your first masterpiece.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
