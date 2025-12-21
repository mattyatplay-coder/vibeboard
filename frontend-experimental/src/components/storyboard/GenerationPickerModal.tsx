import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { X, Loader2, Play } from "lucide-react";
import { clsx } from "clsx";

interface GenerationPickerModalProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    onSelect: (generation: any) => void;
}

export function GenerationPickerModal({ projectId, isOpen, onClose, onSelect }: GenerationPickerModalProps) {
    const [generations, setGenerations] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadGenerations();
        }
    }, [isOpen]);

    const loadGenerations = async () => {
        setLoading(true);
        try {
            const data = await fetchAPI(`/projects/${projectId}/generations`);
            // Filter for only succeeded generations
            setGenerations(data.filter((g: any) => g.status === 'succeeded'));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-4xl bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Select a Shot</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : generations.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No generated shots found. Go to the Generate tab to create some!
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {generations.map((gen) => (
                                <button
                                    key={gen.id}
                                    onClick={() => onSelect(gen)}
                                    className="group relative aspect-video bg-black/50 rounded-lg overflow-hidden border border-white/10 hover:border-blue-500 hover:ring-2 hover:ring-blue-500/50 transition-all text-left"
                                >
                                    {gen.outputs?.[0] ? (
                                        <img src={gen.outputs[0].url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                                            No Image
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                        <p className="text-xs text-white line-clamp-2">{gen.inputPrompt}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
