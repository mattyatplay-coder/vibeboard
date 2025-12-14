"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import Link from "next/link";
import { Plus, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
}

export default function ProjectSelector() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await fetchAPI("/projects");
      setProjects(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load projects", {
        description: "Please check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchAPI("/projects", {
        method: "POST",
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      toast.success("Project created!", {
        description: `"${newName}" is ready to use.`,
      });
      setNewName("");
      setNewDesc("");
      setIsCreating(false);
      loadProjects();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create project", {
        description: "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              VibeBoard
            </h1>
            <p className="text-gray-400 mt-2">Select a project to start creating.</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </header>

        {isCreating && (
          <div className="mb-8 p-6 bg-white/5 border border-white/10 rounded-xl animate-in fade-in slide-in-from-top-4">
            <form onSubmit={handleCreate} className="space-y-4" aria-label="Create new project">
              <div>
                <label htmlFor="project-name" className="block text-sm font-medium text-gray-400 mb-1">
                  Project Name <span className="text-red-400" aria-label="required">*</span>
                </label>
                <input
                  id="project-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="My Awesome Movie"
                  autoFocus
                  required
                  aria-required="true"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="project-desc" className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                <input
                  id="project-desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="A sci-fi thriller about..."
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim() || isSubmitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-black flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}/elements`}
              className="group block p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all"
            >
              <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">
                {project.name}
              </h3>
              <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                {project.description || "No description"}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
              </div>
            </Link>
          ))}
        </div>

        {projects.length === 0 && !isCreating && (
          <div className="text-center py-20 text-gray-500">
            <p>No projects yet. Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
