import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { Plus, Trash2, Link as LinkIcon, Upload, Check } from "lucide-react";
import { clsx } from "clsx";

interface LoRA {
    id: string;
    name: string;
    triggerWord?: string;
    fileUrl: string;
    baseModel: string;
    strength: number;
    imageUrl?: string;
}

interface LoRAManagerProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    selectedIds?: string[];
    onToggle?: (lora: LoRA) => void;
    embedded?: boolean;
}

export function LoRAManager({ projectId, isOpen, onClose, selectedIds = [], onToggle, embedded = false }: LoRAManagerProps) {
    const [loras, setLoras] = useState<LoRA[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [newName, setNewName] = useState("");
    const [newTrigger, setNewTrigger] = useState("");
    const [newUrl, setNewUrl] = useState("");
    const [newBaseModel, setNewBaseModel] = useState("SDXL");
    const [newStrength, setNewStrength] = useState(1.0);

    useEffect(() => {
        if (isOpen) {
            loadLoRAs();
        }
    }, [isOpen]);

    const loadLoRAs = async () => {
        setIsLoading(true);
        try {
            const data = await fetchAPI(`/projects/${projectId}/loras`);
            setLoras(data);
        } catch (err) {
            console.error("Failed to load LoRAs", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddLoRA = async () => {
        if (!newName || !newUrl) return;
        setError(null);

        try {
            await fetchAPI(`/projects/${projectId}/loras`, {
                method: "POST",
                body: JSON.stringify({
                    name: newName,
                    triggerWord: newTrigger,
                    fileUrl: newUrl,
                    baseModel: newBaseModel,
                    strength: newStrength
                })
            });
            setIsAdding(false);
            resetForm();
            loadLoRAs();
        } catch (err: any) {
            console.error("Failed to add LoRA", err);
            setError(err.message || "Failed to add LoRA");
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to remove this LoRA?")) return;
        try {
            await fetchAPI(`/projects/${projectId}/loras/${id}`, {
                method: "DELETE"
            });
            loadLoRAs();
        } catch (err) {
            console.error("Failed to delete LoRA", err);
        }
    };

    const resetForm = () => {
        setNewName("");
        setNewTrigger("");
        setNewUrl("");
        setNewBaseModel("SDXL");
        setNewStrength(1.0);
    };

    if (!isOpen) return null;

    const content = (
        <div className={clsx(
            "bg-[#1a1a1a] border border-white/10 rounded-xl flex flex-col shadow-2xl overflow-hidden",
            embedded ? "w-80 h-[600px]" : "w-full max-w-2xl max-h-[80vh]"
        )}>
            <div className="flex justify-between items-center p-4 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">LoRA Manager</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {isAdding ? (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
                        <h3 className="font-medium text-white text-sm">Add New LoRA</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. Cyberpunk Style"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Trigger Word</label>
                                <input
                                    type="text"
                                    value={newTrigger}
                                    onChange={(e) => setNewTrigger(e.target.value)}
                                    placeholder="e.g. cbrpnk"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 mb-1">File Path or URL</label>
                            <input
                                type="text"
                                value={newUrl}
                                onChange={(e) => setNewUrl(e.target.value)}
                                placeholder="Path or URL"
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none font-mono"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Base Model</label>
                                <select
                                    value={newBaseModel}
                                    onChange={(e) => setNewBaseModel(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                >
                                    <option value="SDXL">SDXL</option>
                                    <option value="Flux">Flux.1</option>
                                    <option value="Wan 2.2 I2V-A14B">Wan 2.2 I2V-A14B</option>
                                    <option value="SVD">SVD</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Strength</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="2"
                                    value={newStrength}
                                    onChange={(e) => setNewStrength(parseFloat(e.target.value))}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-400 text-xs px-1">{error}</div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setIsAdding(false)}
                                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddLoRA}
                                disabled={!newName || !newUrl}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <button
                            onClick={() => setIsAdding(true)}
                            className="w-full py-2 border border-dashed border-white/20 rounded-lg text-gray-400 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add New LoRA
                        </button>

                        <div className="space-y-2">
                            {loras.map((lora, index) => {
                                const isSelected = selectedIds.includes(lora.id);
                                return (
                                    <div
                                        key={lora.id || `lora-${index}`}
                                        className={clsx(
                                            "flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer",
                                            isSelected
                                                ? "bg-blue-500/10 border-blue-500/50"
                                                : "bg-white/5 border-white/5 hover:border-white/10"
                                        )}
                                        onClick={() => onToggle && onToggle(lora)}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={clsx(
                                                "w-8 h-8 rounded flex-shrink-0 flex items-center justify-center border",
                                                isSelected ? "bg-blue-500 border-blue-400 text-white" : "bg-white/5 border-white/10 text-gray-500"
                                            )}>
                                                {isSelected ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className={clsx("font-medium text-sm truncate", isSelected ? "text-blue-200" : "text-white")}>{lora.name}</h4>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                    <span className="bg-white/10 px-1 py-0.5 rounded">{lora.baseModel}</span>
                                                    {lora.triggerWord && <span className="truncate">Trigger: {lora.triggerWord}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(lora.id, e)}
                                            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                );
                            })}
                            {loras.length === 0 && !isLoading && (
                                <p className="text-center text-gray-500 text-xs py-4">No LoRAs added yet.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    if (embedded) {
        return content;
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            {content}
        </div>
    );
}
