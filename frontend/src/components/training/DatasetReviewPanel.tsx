import React, { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import { Loader2, Trash2, AlertCircle, Check, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface DatasetImage {
    filename: string;
    url: string;
}

interface Props {
    jobId: string;
    onComplete: () => void;
    datasetPath?: string; // Passed from parent if known, or we derive logic
}

export function DatasetReviewPanel({ jobId, onComplete, datasetPath }: Props) {
    const [images, setImages] = useState<DatasetImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [previewImage, setPreviewImage] = useState<DatasetImage | null>(null);

    useEffect(() => {
        loadImages();
    }, [jobId]);

    const loadImages = async () => {
        try {
            const data = await fetchAPI(`/training/jobs/${jobId}/dataset`);
            setImages(data.images || []);
        } catch (err) {
            console.error("Failed to load dataset images", err);
            toast.error("Failed to load images");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (filename: string) => {
        if (!confirm("Delete this image? This cannot be undone.")) return;

        setDeleting(filename);
        try {
            await fetchAPI(`/training/jobs/${jobId}/dataset/${filename}`, {
                method: 'DELETE'
            });
            setImages(prev => prev.filter(img => img.filename !== filename));
            toast.success("Image deleted");
        } catch (err) {
            console.error("Failed to delete image", err);
            toast.error("Failed to delete image");
        } finally {
            setDeleting(null);
        }
    };

    const handleStartTraining = async () => {
        if (images.length < 5) {
            if (!confirm("You have very few images (< 5). Training might be poor. Continue?")) return;
        }

        setIsConfirming(true);
        try {
            // We call the parent's completion handler or directly trigger training here?
            // The parent page likely has the logic to call 'startJob'.
            // However, the parent page requires `datasetPath` to be passed to `startJob`.
            // The `generateDataset` flow saved `datasetUrl` (absolute path) to the job in DB.
            // So we can technically just call the start endpoint using the path we know or the backend fetches it?

            // Actually, the `startJob` endpoint expects `datasetPath` in the body. 
            // If the job already has it (saved during generation), we might need to fetch the job details again 
            // or pass it down. 

            // For now, let's assume we trigger the parent's "onComplete" which will switch the UI 
            // or we make the call here.

            // Let's delegate to parent to keep Page logic centralized if possible, 
            // BUT looking at the Page, it's a bit complex. 
            // Let's try to just call the start endpoint here if we have the path.

            // IF we don't have the path in props, we might be stuck. 
            // The `images` endpoint doesn't return the absolute path.

            // So: The best bet is for this component to just be the "Reviewer". 
            // When user clicks "Start Training", we call `onComplete`.

            onComplete();

        } catch (err) {
            // Error handling
        } finally {
            setIsConfirming(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-purple-400" />
                <p>Loading generated dataset...</p>
            </div>
        );
    }

    if (images.length === 0) {
        return (
            <div className="text-center p-8 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-red-300">No images found in this dataset.</p>
                <p className="text-sm text-red-200/50 mt-1">Generation might have failed or folder is empty.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-5 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-purple-400" />
                        Review Dataset ({images.length} images)
                    </h3>
                    <p className="text-sm text-purple-200/60 mt-1">
                        Delete any images that don't match your character style.
                        <br />
                        <span className="text-yellow-400/80">Tip:</span> Be aggressive! Quality is better than quantity.
                    </p>
                </div>
                <div>
                    <button
                        onClick={handleStartTraining}
                        disabled={isConfirming || images.length === 0}
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium shadow-lg shadow-green-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isConfirming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                        Confirm & Start Training
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((img) => (
                    <div
                        key={img.filename}
                        onClick={() => setPreviewImage(img)}
                        className="group relative aspect-[9/16] bg-black/40 rounded-lg overflow-hidden border border-white/10 hover:border-purple-500/50 transition-colors cursor-pointer"
                    >
                        {/* Image - Use local backend proxy URL */}
                        <img
                            src={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}${img.url}`}
                            alt={img.filename}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                                onClick={() => handleDelete(img.filename)}
                                disabled={deleting === img.filename}
                                className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full transform scale-90 group-hover:scale-100 transition-all shadow-xl"
                                title="Delete Image"
                            >
                                {deleting === img.filename ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <Trash2 className="w-6 h-6" />
                                )}
                            </button>
                        </div>

                        {/* Filename Tag */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-2 py-1 text-[10px] text-gray-300 truncate">
                            {img.filename}
                        </div>
                    </div>
                ))}
            </div>
            {/* Lightbox Modal */}
            {previewImage && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
                    <button className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                        <Trash2 className="w-8 h-8" />
                    </button>
                    <img
                        src={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}${previewImage.url}`}
                        className="max-w-full max-h-full rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
