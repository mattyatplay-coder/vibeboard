
import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { Plus, Trash2, Upload, FileJson, Check, X, Settings2 } from "lucide-react";
import { clsx } from "clsx";
import { useDropzone } from "react-dropzone";

interface Workflow {
    id: string;
    name: string;
    description?: string;
    json: any;
    inputMap?: {
        positive?: { nodeId: string; inputId?: string };
        negative?: { nodeId: string; inputId?: string };
        image?: { nodeId: string; inputId?: string };
        seed?: { nodeId: string; inputId?: string };
        steps?: { nodeId: string; inputId?: string };
        cfg?: { nodeId: string; inputId?: string };
    };
}

interface WorkflowManagerProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    onSelect?: (workflow: Workflow) => void;
    selectedId?: string;
    embedded?: boolean;
}

export function WorkflowManager({ projectId, isOpen, onClose, onSelect, selectedId, embedded = false }: WorkflowManagerProps) {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importedJson, setImportedJson] = useState<any>(null);
    const [mapping, setMapping] = useState<any>({});
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (isOpen) loadWorkflows();
    }, [isOpen]);

    const loadWorkflows = async () => {
        try {
            const response = await fetchAPI(`/projects/${projectId}/workflows`);
            const workflowsData = Array.isArray(response) ? response : (response.data || []);
            setWorkflows(workflowsData);
        } catch (err) {
            console.error("Failed to load workflows", err);
        }
    };

    const handleFileUpload = (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                setImportedJson(json);
                setName(file.name.replace(".json", ""));
                // Auto-detect mapping
                detectMapping(json);
            } catch (err) {
                alert("Invalid JSON file");
            }
        };
        reader.readAsText(file);
    };

    const detectMapping = (json: any) => {
        const newMapping: any = {};
        // Simple heuristic detection
        // Look for nodes with specific types
        // ComfyUI workflow format: { nodes: [...], ... } or { "1": { inputs: ... }, ... } (API format)

        // We assume API format (object with node IDs as keys) or UI format (nodes array)
        // The adapter expects API format usually, but UI format is what users download.
        // If UI format, we need to convert or just store it and let adapter handle (Adapter expects API format usually?)
        // Actually ComfyUIAdapter.ts uses `workflow[nodeId]`, which implies API format.
        // But downloadable workflows are usually UI format.
        // We might need to convert UI format to API format.
        // For now, let's assume the user provides API format or we just store what they give.
        // Wait, Coyotte's workflow was UI format (had "nodes" array).
        // My ComfyUIAdapter seems to expect API format (object keyed by ID).
        // I should probably convert UI format to API format if possible, or support UI format in Adapter.
        // Converting UI to API format is complex (links, widgets).
        // Let's assume for now we just store it and try to map.

        // If it has "nodes" array, it's UI format.
        if (json.nodes && Array.isArray(json.nodes)) {
            json.nodes.forEach((node: any) => {
                if (node.type === "LoadImage") newMapping.image = { nodeId: node.id, inputId: "image" };
                if (node.type === "CLIPTextEncode") {
                    if (node.title?.toLowerCase().includes("positive") || node.color === "#233") newMapping.positive = { nodeId: node.id, inputId: "text" };
                    else if (node.title?.toLowerCase().includes("negative") || node.color === "#333") newMapping.negative = { nodeId: node.id, inputId: "text" };
                }
                if (node.type === "KSampler") {
                    newMapping.seed = { nodeId: node.id, inputId: "seed" };
                    newMapping.steps = { nodeId: node.id, inputId: "steps" };
                    newMapping.cfg = { nodeId: node.id, inputId: "cfg" };
                }
            });
        } else {
            // Assume API format (object keyed by IDs)
            Object.keys(json).forEach(key => {
                const node = json[key];
                if (node.class_type === "LoadImage") newMapping.image = { nodeId: key, inputId: "image" };
                if (node.class_type === "CLIPTextEncode") {
                    const title = node._meta?.title?.toLowerCase() || "";
                    if (title.includes("positive")) newMapping.positive = { nodeId: key, inputId: "text" };
                    else if (title.includes("negative")) newMapping.negative = { nodeId: key, inputId: "text" };
                }
                if (node.class_type === "KSampler") {
                    newMapping.seed = { nodeId: key, inputId: "seed" };
                    newMapping.steps = { nodeId: key, inputId: "steps" };
                    newMapping.cfg = { nodeId: key, inputId: "cfg" };
                }
            });
        }
        setMapping(newMapping);
    };

    const handleSave = async () => {
        try {
            // If UI format, we might need to warn user that Adapter expects API format?
            // Or we assume Adapter can handle it? 
            // The Adapter code I wrote: `workflow[map.positive.nodeId].inputs[...]`
            // This access pattern `workflow[id]` works for API format.
            // For UI format, `workflow` is an object with `nodes` array. `workflow[id]` would be undefined.
            // So Adapter needs to handle UI format or we convert here.
            // Converting here is safer.
            // But converting UI to API format requires logic (resolving links).
            // Maybe I should just save it and update Adapter to handle UI format?
            // Actually, `ComfyUIAdapter` sends `prompt: workflow` to `/prompt` endpoint.
            // The `/prompt` endpoint EXPECTS API format.
            // So we MUST convert UI format to API format.
            // This is non-trivial.
            // However, Civitai workflows are often UI format.
            // Maybe I can use a library or simple logic?
            // Or I can ask the user to export as API format (Enable Dev Mode -> Save (API Format)).

            // For now, I'll save it as is, but add a warning if it looks like UI format.

            await fetchAPI(`/projects/${projectId}/workflows`, {
                method: "POST",
                body: JSON.stringify({
                    name,
                    description,
                    json: importedJson,
                    inputMap: mapping
                })
            });
            setIsImporting(false);
            setImportedJson(null);
            loadWorkflows();
        } catch (err) {
            console.error("Failed to save workflow", err);
        }
    };

    const { getRootProps, getInputProps } = useDropzone({ onDrop: handleFileUpload, accept: { 'application/json': ['.json'] } });

    if (!isOpen) return null;

    return (
        <div className={clsx(
            "bg-[#1a1a1a] border border-white/10 rounded-xl flex flex-col shadow-2xl overflow-hidden",
            embedded ? "w-full h-full" : "fixed inset-0 z-[100] m-auto w-full max-w-4xl h-[80vh]"
        )}>
            <div className="flex justify-between items-center p-4 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">Workflow Manager</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* List */}
                <div className="w-1/3 border-r border-white/10 overflow-y-auto p-4 space-y-2">
                    <button
                        onClick={() => setIsImporting(true)}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-medium mb-4"
                    >
                        <Upload className="w-4 h-4" /> Import Workflow
                    </button>

                    {workflows.map(wf => (
                        <div
                            key={wf.id}
                            onClick={() => onSelect?.(wf)}
                            className={clsx(
                                "p-3 rounded-lg border cursor-pointer transition-colors",
                                selectedId === wf.id ? "bg-blue-500/20 border-blue-500" : "bg-white/5 border-white/10 hover:bg-white/10"
                            )}
                        >
                            <div className="flex justify-between items-start">
                                <h3 className="font-medium text-white text-sm">{wf.name}</h3>
                                <button className="text-gray-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                            </div>
                            {wf.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{wf.description}</p>}
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isImporting ? (
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium text-white">Import Workflow</h3>

                            {!importedJson ? (
                                <div {...getRootProps()} className="border-2 border-dashed border-white/20 rounded-xl p-12 flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-400 cursor-pointer transition-colors">
                                    <input {...getInputProps()} />
                                    <FileJson className="w-12 h-12 mb-4" />
                                    <p>Drag & drop workflow JSON here, or click to select</p>
                                    <p className="text-xs mt-2 text-gray-500">Supports ComfyUI API Format</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                        />
                                    </div>

                                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg text-xs text-yellow-200">
                                        <strong>Important:</strong> Ensure your JSON is in <u>API Format</u> (Save (API Format) in ComfyUI). Standard workflow files might not work directly.
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium text-white mb-2">Input Mapping</h4>
                                        <p className="text-xs text-gray-500 mb-4">Map your workflow nodes to our app's inputs.</p>

                                        <div className="grid grid-cols-2 gap-4">
                                            {['positive', 'negative', 'image', 'seed', 'steps', 'cfg'].map(key => (
                                                <div key={key} className="bg-white/5 p-3 rounded-lg border border-white/10">
                                                    <label className="block text-xs font-bold text-gray-300 mb-2 capitalize">{key}</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Node ID"
                                                            value={mapping[key]?.nodeId || ""}
                                                            onChange={e => setMapping({ ...mapping, [key]: { ...mapping[key], nodeId: e.target.value } })}
                                                            className="w-20 bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Input ID"
                                                            value={mapping[key]?.inputId || ""}
                                                            onChange={e => setMapping({ ...mapping, [key]: { ...mapping[key], inputId: e.target.value } })}
                                                            className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button onClick={() => { setIsImporting(false); setImportedJson(null); }} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                                        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg">Save Workflow</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Settings2 className="w-12 h-12 mb-4 opacity-20" />
                            <p>Select a workflow to view details or import a new one.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
