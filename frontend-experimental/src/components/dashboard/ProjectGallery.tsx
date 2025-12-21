"use client";

import { Project } from "@/lib/api";
import { motion } from "framer-motion";
import { Plus, Search, Clapperboard, MonitorPlay } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ProductionCard } from "./ProductionCard";

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

    const activeSlate = sortedProjects[0];
    const archive = sortedProjects.slice(1);

    return (
        <div className="space-y-12">
            {/* Studio Header */}
            <div className="flex items-end justify-between border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 tracking-tight">
                        STUDIO
                    </h1>
                    <p className="text-gray-400 mt-2 font-medium tracking-wide">
                        {projects.length} ACTIVE PRODUCTIONS
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button className="p-3 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                        <Search className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onCreateClick}
                        className="glass-button px-6 py-3 rounded-xl text-white font-bold flex items-center gap-2 hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all shadow-lg shadow-indigo-500/10"
                    >
                        <Clapperboard className="w-4 h-4" />
                        New Production
                    </button>
                </div>
            </div>

            {/* Active Slate (Hero) */}
            {activeSlate && (
                <section>
                    <div className="flex items-center gap-2 mb-6 text-indigo-400 font-bold tracking-widest text-xs uppercase">
                        <MonitorPlay className="w-4 h-4" />
                        On Set Now
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Large Hero Card */}
                        <div className="lg:col-span-2">
                            <ProductionCard project={activeSlate} onDelete={onDelete} index={0} />
                        </div>

                        {/* Hero Stats / Quick info */}
                        <div className="glass-panel rounded-xl p-8 flex flex-col justify-center space-y-8 border border-white/5">
                            <div>
                                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Production Status</h3>
                                <div className="text-3xl font-bold text-white">Active Filming</div>
                                <div className="w-full bg-gray-800 h-1.5 mt-4 rounded-full overflow-hidden">
                                    <div className="w-[65%] h-full bg-indigo-500 rounded-full" />
                                </div>
                                <div className="flex justify-between mt-2 text-xs text-gray-500 font-medium">
                                    <span>Script</span>
                                    <span className="text-indigo-400">Production</span>
                                    <span>Post</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                                    <div className="text-2xl font-bold text-white">124</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Total Assets</div>
                                </div>
                                <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                                    <div className="text-2xl font-bold text-white">42</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Scenes</div>
                                </div>
                            </div>

                            <Link
                                href={`/projects/${activeSlate.id}/generate`}
                                className="w-full py-4 rounded-lg bg-white text-black font-bold text-center hover:bg-gray-200 transition-colors uppercase tracking-wide text-sm"
                            >
                                Open Production
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* Archive Grid */}
            <section>
                <div className="flex items-center gap-2 mb-6 text-gray-500 font-bold tracking-widest text-xs uppercase border-t border-white/5 pt-8">
                    Production Archive
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {archive.map((project, i) => (
                        <ProductionCard key={project.id} project={project} onDelete={onDelete} index={i + 1} />
                    ))}

                    {archive.length === 0 && !activeSlate && (
                        <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 rounded-2xl">
                            <p className="text-gray-500 font-medium">No productions found.</p>
                            <button onClick={onCreateClick} className="text-indigo-400 hover:text-indigo-300 mt-2 font-bold">Start one now</button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
