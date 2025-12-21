"use client";

import { useEffect, useState } from "react";
import { Project, fetchAPI } from "@/lib/api";
import { ProjectGallery } from "@/components/dashboard/ProjectGallery";
import { StudioLayout } from "@/components/layout/StudioLayout";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProjects = async () => {
    try {
      const data = await fetchAPI("/projects");
      setProjects(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this production? Steps cannot be recovered.")) return;
    try {
      await fetchAPI(`/projects/${id}`, { method: "DELETE" });
      toast.success("Production deleted");
      loadProjects();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete project");
    }
  };

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
      toast.success("Production initialized!");
      setNewName("");
      setNewDesc("");
      setIsCreating(false);
      loadProjects();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StudioLayout>
      {isLoading ? (
        <div className="flex items-center justify-center h-[80vh]">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : (
        <ProjectGallery
          projects={projects}
          onDelete={handleDelete}
          onCreateClick={() => setIsCreating(true)}
        />
      )}

      {/* Create Project Modal (Glassmorphic) */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-6">
              New Production
            </h2>

            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Title</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g. Blade Runner 2099"
                  autoFocus
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Logline (Description)</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                  placeholder="A brief summary of the film..."
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim() || isSubmitting}
                  className="glass-button px-6 py-2 rounded-lg text-white font-medium flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Production
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StudioLayout>
  );
}
