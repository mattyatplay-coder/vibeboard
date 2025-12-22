import React, { useState } from 'react';
import { X, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export const ExportModal = ({ isOpen, onClose, projectId }: ExportModalProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setExportUrl(null);

    try {
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}/export`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to export project');
      }

      const data = await response.json();
      setExportUrl(data.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#1A1A1A] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="text-lg font-medium text-white">Export Project</h2>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Video Stitching</h3>
            <p className="text-sm text-gray-500">
              Combine all generated video clips from your scenes into a single video file. Scenes
              will be ordered by their creation time.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {exportUrl && (
            <div className="space-y-3 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
              <div className="flex items-center gap-2 font-medium text-green-400">
                <CheckCircle className="h-5 w-5" />
                Export Complete!
              </div>
              <a
                href={exportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2 font-medium text-white transition-colors hover:bg-green-500"
              >
                <Download className="h-4 w-4" />
                Download Video
              </a>
            </div>
          )}

          {!exportUrl && (
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-600/50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Stitching Videos...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Start Export
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
