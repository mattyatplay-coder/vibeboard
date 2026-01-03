'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * Project Root Page - Redirects to Script Lab
 *
 * The Studio Spine workflow starts with Script Lab (story-editor).
 * This page serves as the canonical project hub entry point.
 *
 * According to the Product Bible:
 * "Script Lab is the Gravitational Center, not a Gate"
 */
export default function ProjectRootPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  useEffect(() => {
    if (projectId) {
      // Redirect to Script Lab - the canonical starting point
      router.replace(`/projects/${projectId}/story-editor`);
    }
  }, [projectId, router]);

  // Show minimal loading state during redirect
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        <p className="text-sm text-gray-500">Loading project...</p>
      </div>
    </div>
  );
}
