import { useState } from "react";
import { fetchAPI } from "@/lib/api";
import { Download, Upload, AlertTriangle, Check, FileJson, Database } from "lucide-react";
import { clsx } from "clsx";

interface DataBackupModalProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function DataBackupModal({ projectId, isOpen, onClose }: DataBackupModalProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
    const [dragActive, setDragActive] = useState(false);

    if (!isOpen) return null;

    const handleExport = async () => {
        setIsExporting(true);
        try {
            // Trigger download
            // We can't use fetchAPI for file download easily because we need a blob
            // So we use standard fetch with the auth token if needed, or just window.open if auth is cookie based.
            // Since we use a mock token header, we need to fetch and create blob.

            const response = await fetch(`http://localhost:3001/api/projects/${projectId}/backup/export`, {
                headers: {
                    'Authorization': 'Bearer mock-token'
                }
            });

            if (!response.ok) throw new Error("Export failed");

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
            alert("Failed to export data");
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
                body: JSON.stringify({ data: json.data || json }) // Handle wrapped or unwrapped
            });

            setImportStatus({
                success: true,
                message: `Successfully imported ${response.counts.loras} LoRAs, ${response.counts.workflows} Workflows, and ${response.counts.modelParameters} Parameters.`
            });

        } catch (err: any) {
            console.error(err);
            setImportStatus({
                success: false,
                message: err.message || "Failed to import data. Invalid file format."
            });
        } finally {
            setIsImporting(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-white/10">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-400" />
                        Data Management
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Export Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Backup</h3>
                        <p className="text-xs text-gray-500">
                            Download a JSON file containing all your LoRAs, Workflows, and Model Parameters.
                        </p>
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {isExporting ? (
                                <span className="animate-spin">⏳</span>
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            {isExporting ? "Exporting..." : "Export Data"}
                        </button>
                    </div>

                    <div className="border-t border-white/10" />

                    {/* Import Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Restore</h3>
                        <p className="text-xs text-gray-500">
                            Drag and drop your backup JSON file here to restore your data.
                        </p>

                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            className={clsx(
                                "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                                dragActive ? "border-blue-500 bg-blue-500/10" : "border-white/10 hover:border-white/20 hover:bg-white/5",
                                isImporting && "opacity-50 pointer-events-none"
                            )}
                        >
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                id="backup-upload"
                                onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
                            />
                            <label htmlFor="backup-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                <FileJson className="w-8 h-8 text-gray-400" />
                                <span className="text-sm text-gray-300">
                                    {isImporting ? "Importing..." : "Click to upload or drag file"}
                                </span>
                            </label>
                        </div>

                        {importStatus && (
                            <div className={clsx(
                                "p-3 rounded-lg text-xs flex items-start gap-2",
                                importStatus.success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                            )}>
                                {importStatus.success ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                                <span>{importStatus.message}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
