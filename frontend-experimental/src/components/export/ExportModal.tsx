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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1A1A1A] border border-white/10 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-medium text-white">Export Project</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-300">Video Stitching</h3>
                        <p className="text-sm text-gray-500">
                            Combine all generated video clips from your scenes into a single video file.
                            Scenes will be ordered by their creation time.
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {exportUrl && (
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-3">
                            <div className="flex items-center gap-2 text-green-400 font-medium">
                                <CheckCircle className="w-5 h-5" />
                                Export Complete!
                            </div>
                            <a
                                href={exportUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium"
                            >
                                <Download className="w-4 h-4" />
                                Download Video
                            </a>
                        </div>
                    )}

                    {!exportUrl && (
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Stitching Videos...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" />
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
