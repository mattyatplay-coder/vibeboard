"use client";

import { Project } from "@/lib/api";
import { motion } from "framer-motion";
import { Plus, MoreVertical, Play, Clock, Calendar, Film } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { clsx } from "clsx";

interface ProjectGalleryProps {
    projects: Project[];
    onDelete: (id: string) => void;
    onCreateClick: () => void;
}

export function ProjectGallery({ projects, onDelete, onCreateClick }: ProjectGalleryProps) {
    // Sort by recent
    const sortedProjects = [...projects].sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    const featuredProject = sortedProjects[0];
    const gridProjects = sortedProjects.slice(1);

    return (
        <div className="space-y-10">
            {/* Header / Hero */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Studio Dashboard
                    </h1>
                    <p className="text-gray-400 mt-2">Manage your productions and cinematic universe.</p>
                </div>
                <button
                    onClick={onCreateClick}
                    className="glass-button px-6 py-3 rounded-full text-white font-medium flex items-center gap-2 hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    New Production
                </button>
            </div>

            {/* Featured Project (First in list) */}
            {featuredProject && (
                <section>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Jump Back In</h2>
                    <Link href={`/projects/${featuredProject.id}/generate`}>
                        <div className="group relative w-full h-[400px] rounded-2xl overflow-hidden glass-panel hover:border-[var(--glass-border-hover)] transition-all">
                            {/* Background Image Placeholder (To be replaced with dynamic poster) */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
                            <div className="absolute inset-0 bg-gray-900 group-hover:scale-105 transition-transform duration-1000">
                                {/* If we had a cover image, it would go here. For now, a generated pattern. */}
                                <div className="w-full h-full opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-cover" />
                                <div className="absolute inset-0 bg-indigo-900/20 mix-blend-overlay" />
                            </div>

                            <div className="absolute bottom-0 left-0 p-10 z-20 max-w-2xl">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="px-3 py-1 rounded-full bg-indigo-500/80 backdrop-blur-md text-xs font-bold text-white uppercase tracking-wide">
                                        Active Production
                                    </span>
                                    <span className="text-gray-300 text-sm flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Last edited {new Date(featuredProject.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <h2 className="text-5xl font-bold text-white mb-4 leading-tight group-hover:text-indigo-200 transition-colors">
                                    {featuredProject.name}
                                </h2>
                                <p className="text-lg text-gray-300 line-clamp-2 max-w-xl">
                                    {featuredProject.description || "No specific treatment defined for this production."}
                                </p>

                                <div className="mt-6 flex items-center gap-4 opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                    <span className="flex items-center gap-2 text-white font-medium">
                                        <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center">
                                            <Play className="w-4 h-4 fill-current ml-0.5" />
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
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6">Recent Productions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gridProjects.map((project, i) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <Link href={`/projects/${project.id}/generate`} className="group block h-full">
                                <div className="h-full glass-panel rounded-xl p-6 relative hover:bg-white/5 transition-all flex flex-col justify-between min-h-[220px]">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-800 to-black border border-white/5 flex items-center justify-center group-hover:border-indigo-500/30 transition-colors">
                                                <Film className="w-6 h-6 text-gray-600 group-hover:text-indigo-400" />
                                            </div>
                                            <button
                                                onClick={(e) => { e.preventDefault(); onDelete(project.id); }}
                                                className="p-2 rounded-full hover:bg-red-500/10 hover:text-red-400 text-gray-500 transition-colors"
                                                title="Delete Project"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">{project.name}</h3>
                                        <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                                            {project.description || "Untitled Production"}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-white/5 pt-4">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {new Date(project.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}

                    {/* Empty State placeholder if few projects */}
                    {gridProjects.length === 0 && !featuredProject && (
                        <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-2xl">
                            <p className="text-gray-500">No productions found. Start your first masterpiece.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
