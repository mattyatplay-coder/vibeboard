import React, { useState } from 'react';
import { X, Download, Loader2, CheckCircle, AlertCircle, Film, Info } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export const ExportModal = ({ isOpen, onClose, projectId }: ExportModalProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Technical Strip (Burn-In Metadata)
  const [includeTechStrip, setIncludeTechStrip] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setExportUrl(null);

    try {
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeTechStrip,
        }),
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

          {/* Technical Strip (Burn-In) Toggle */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <label className="flex cursor-pointer items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20">
                  <Film className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">Technical Burn-In</span>
                    <Tooltip content="Adds professional metadata overlay: Timecode, Frame #, Scene/Shot, Model Used, Date. Standard for dailies and review copies.">
                      <Info className="h-3.5 w-3.5 text-gray-500 hover:text-gray-400" />
                    </Tooltip>
                  </div>
                  <p className="text-xs text-gray-500">Add metadata strip for dailies</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={includeTechStrip}
                  onChange={e => setIncludeTechStrip(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-zinc-700 transition-colors peer-checked:bg-amber-500" />
                <div className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
            {includeTechStrip && (
              <div className="mt-3 rounded border border-amber-500/20 bg-amber-500/10 p-2">
                <p className="text-xs text-amber-300">
                  Burn-in includes: Timecode • Frame # • Scene/Shot ID • Model • Export Date
                </p>
              </div>
            )}
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
