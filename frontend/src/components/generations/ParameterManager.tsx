import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { Plus, Trash2, Check, Settings2 } from "lucide-react";
import { clsx } from "clsx";

interface ModelParameter {
    id: string;
    type: 'sampler' | 'scheduler';
    name: string;
    value: string;
}

interface ParameterManagerProps {
    projectId: string;
    type: 'sampler' | 'scheduler';
    isOpen: boolean;
    onClose: () => void;
    selectedId?: string;
    onSelect?: (parameter: ModelParameter | null) => void;
    embedded?: boolean;
}

export function ParameterManager({ projectId, type, isOpen, onClose, selectedId, onSelect, embedded = false }: ParameterManagerProps) {
    const [parameters, setParameters] = useState<ModelParameter[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [value, setValue] = useState("");

    const COMMON_PRESETS = {
        sampler: [
            { name: "Euler a", value: "euler_a" },
            { name: "Euler", value: "euler" },
            { name: "DPM++ 2M Karras", value: "dpmpp_2m_karras" },
            { name: "DPM++ SDE Karras", value: "dpmpp_sde_karras" },
            { name: "DDIM", value: "ddim" },
            { name: "Flow Match Euler", value: "flow_match_euler" },
        ],
        scheduler: [
            { name: "Simple", value: "simple" },
            { name: "Karras", value: "karras" },
            { name: "SGM Uniform", value: "sgm_uniform" },
            { name: "Beta", value: "beta" },
            { name: "Linear", value: "linear" },
        ]
    };

    useEffect(() => {
        if (isOpen) {
            loadParameters();
        }
    }, [isOpen, projectId, type]);

    const loadParameters = async () => {
        try {
            const data = await fetchAPI(`/projects/${projectId}/parameters?type=${type}`);
            setParameters(data);
        } catch (err) {
            console.error("Failed to load parameters", err);
        }
    };

    const handleAdd = async (presetName?: string, presetValue?: string) => {
        const nameToSend = presetName || name;
        const valueToSend = presetValue || value;

        if (!nameToSend || !valueToSend) return;

        try {
            await fetchAPI(`/projects/${projectId}/parameters`, {
                method: 'POST',
                body: JSON.stringify({
                    type,
                    name: nameToSend,
                    value: valueToSend
                })
            });
            setName("");
            setValue("");
            setIsAdding(false);
            loadParameters();
        } catch (err: any) {
            console.error("Failed to create parameter", err);
            setError(err.message || `Failed to add ${type}`);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Are you sure you want to remove this ${type}?`)) return;
        try {
            await fetchAPI(`/projects/${projectId}/parameters/${id}`, {
                method: "DELETE"
            });
            loadParameters();
            if (selectedId === id && onSelect) {
                onSelect(null);
            }
        } catch (err) {
            console.error(`Failed to delete ${type}`, err);
        }
    };

    if (!isOpen) return null;

    const content = (
        <div className={clsx(
            "bg-[#1a1a1a] border border-white/10 rounded-xl flex flex-col shadow-2xl overflow-hidden",
            embedded ? "w-full h-full" : "w-full max-w-md max-h-[80vh]"
        )}>
            <div className="flex justify-between items-center p-4 border-b border-white/10">
                <h2 className="text-lg font-bold text-white capitalize">{type}s</h2>
                {!embedded && <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {isAdding ? (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
                        <h3 className="font-medium text-white text-sm">Add New {type === 'sampler' ? 'Sampler' : 'Scheduler'}</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={type === 'sampler' ? "e.g. DPM++ 2M Karras" : "e.g. Karras"}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">API Value</label>
                                <input
                                    type="text"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    placeholder={type === 'sampler' ? "e.g. dpmpp_2m_karras" : "e.g. karras"}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none font-mono"
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
                                onClick={() => handleAdd()}
                                disabled={!name || !value}
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
                            Add New {type === 'sampler' ? 'Sampler' : 'Scheduler'}
                        </button>

                        {/* Quick Add Presets */}
                        <div className="pb-4 mb-4 border-b border-white/10">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Quick Add Popular</p>
                            <div className="flex flex-wrap gap-2">
                                {COMMON_PRESETS[type].map(preset => {
                                    const isAdded = parameters.some(p => p.value === preset.value);
                                    return (
                                        <button
                                            key={preset.value}
                                            onClick={() => !isAdded && handleAdd(preset.name, preset.value)}
                                            disabled={isAdded}
                                            className={clsx(
                                                "px-2 py-1 border rounded text-xs transition-colors",
                                                isAdded
                                                    ? "bg-blue-500/20 border-blue-500/50 text-blue-300 cursor-default"
                                                    : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white"
                                            )}
                                        >
                                            {isAdded ? "✓ " : "+ "}{preset.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            {parameters.map((param, index) => {
                                const isSelected = selectedId === param.id;
                                return (
                                    <div
                                        key={param.id || `param-${index}`}
                                        className={clsx(
                                            "flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer",
                                            isSelected
                                                ? "bg-blue-500/10 border-blue-500/50"
                                                : "bg-white/5 border-white/5 hover:border-white/10"
                                        )}
                                        onClick={() => onSelect && onSelect(isSelected ? null : param)}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={clsx(
                                                "w-8 h-8 rounded flex-shrink-0 flex items-center justify-center border",
                                                isSelected ? "bg-blue-500 border-blue-400 text-white" : "bg-white/5 border-white/10 text-gray-500"
                                            )}>
                                                {isSelected ? <Check className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className={clsx("font-medium text-sm truncate", isSelected ? "text-blue-200" : "text-white")}>{param.name}</h4>
                                                <div className="text-[10px] text-gray-500 font-mono truncate">
                                                    {param.value}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(param.id, e)}
                                            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                );
                            })}
                            {parameters.length === 0 && !isLoading && (
                                <p className="text-center text-gray-500 text-xs py-4">No {type}s added yet.</p>
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
