import { useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { Download, Upload, AlertTriangle, Check, FileJson, Database } from 'lucide-react';
import { clsx } from 'clsx';

interface DataBackupModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DataBackupModal({ projectId, isOpen, onClose }: DataBackupModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(
    null
  );
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Trigger download
      // We can't use fetchAPI for file download easily because we need a blob
      // So we use standard fetch with the auth token if needed, or just window.open if auth is cookie based.
      // Since we use a mock token header, we need to fetch and create blob.

      const response = await fetch(
        `http://localhost:3001/api/projects/${projectId}/backup/export`,
        {
          headers: {
            Authorization: 'Bearer mock-token',
          },
        }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vibeboard-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (file: File) => {
    setIsImporting(true);
    setImportStatus(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const response = await fetchAPI(`/projects/${projectId}/backup/import`, {
        method: 'POST',
        body: JSON.stringify({ data: json.data || json }), // Handle wrapped or unwrapped
      });

      setImportStatus({
        success: true,
        message: `Successfully imported ${response.counts.loras} LoRAs, ${response.counts.workflows} Workflows, and ${response.counts.modelParameters} Parameters.`,
      });
    } catch (err: any) {
      console.error(err);
      setImportStatus({
        success: false,
        message: err.message || 'Failed to import data. Invalid file format.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImport(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Database className="h-5 w-5 text-blue-400" />
            Data Management
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-8 p-6">
          {/* Export Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium tracking-wider text-gray-300 uppercase">Backup</h3>
            <p className="text-xs text-gray-500">
              Download a JSON file containing all your LoRAs, Workflows, and Model Parameters.
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {isExporting ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isExporting ? 'Exporting...' : 'Export Data'}
            </button>
          </div>

          <div className="border-t border-white/10" />

          {/* Import Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium tracking-wider text-gray-300 uppercase">Restore</h3>
            <p className="text-xs text-gray-500">
              Drag and drop your backup JSON file here to restore your data.
            </p>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={clsx(
                'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors',
                dragActive
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/5',
                isImporting && 'pointer-events-none opacity-50'
              )}
            >
              <input
                type="file"
                accept=".json"
                className="hidden"
                id="backup-upload"
                onChange={e => e.target.files?.[0] && handleImport(e.target.files[0])}
              />
              <label
                htmlFor="backup-upload"
                className="flex cursor-pointer flex-col items-center gap-2"
              >
                <FileJson className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-300">
                  {isImporting ? 'Importing...' : 'Click to upload or drag file'}
                </span>
              </label>
            </div>

            {importStatus && (
              <div
                className={clsx(
                  'flex items-start gap-2 rounded-lg p-3 text-xs',
                  importStatus.success
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-red-500/10 text-red-400'
                )}
              >
                {importStatus.success ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                <span>{importStatus.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
