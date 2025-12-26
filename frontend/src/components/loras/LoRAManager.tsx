import { useState, useEffect, useMemo } from "react";
import { fetchAPI } from "@/lib/api";
import { Plus, Trash2, Link as LinkIcon, Upload, Check, Box, Layers, ChevronDown, ChevronRight, Pencil, Filter, Image, Video, X } from "lucide-react";
import { clsx } from "clsx";

// Helper to extract base name and version from LoRA name
function parseLoRAName(name: string): { baseName: string; version: string | null } {
    // Common version patterns: v1, v2, V1.5, -High, -Low, _v2, etc.
    const versionPatterns = [
        /^(.+?)\s*[-_]?\s*(v\d+(?:\.\d+)?(?:\.\d+)?)$/i,  // name v1, name-v1.5
        /^(.+?)\s*[-_]\s*(High|Low|Medium|Lite|Full|Pro|Standard)$/i,  // name-High, name_Low
        /^(.+?)\s+(High|Low|Medium|Lite|Full|Pro|Standard)\s*(?:version|ver|v)?$/i,  // name High version
        /^(.+?)\s*[-_]?\s*(\d+(?:\.\d+)?(?:\.\d+)?)$/,  // name 1.0, name-2
    ];

    for (const pattern of versionPatterns) {
        const match = name.match(pattern);
        if (match) {
            return { baseName: match[1].trim(), version: match[2] };
        }
    }

    return { baseName: name, version: null };
}

// Group LoRAs by base name
interface LoRAGroup {
    baseName: string;
    items: LoRA[];
    hasMultipleVersions: boolean;
}

function groupLoRAs(loras: LoRA[]): LoRAGroup[] {
    const groups = new Map<string, LoRA[]>();

    for (const lora of loras) {
        const { baseName } = parseLoRAName(lora.name);
        if (!groups.has(baseName)) {
            groups.set(baseName, []);
        }
        groups.get(baseName)!.push(lora);
    }

    return Array.from(groups.entries()).map(([baseName, items]) => ({
        baseName,
        items,
        hasMultipleVersions: items.length > 1
    }));
}

// Categories for filtering
const CATEGORY_ICONS: Record<string, string> = {
    all: "🌎",
    character: "👤",
    style: "🎨",
    concept: "💡",
    clothing: "👕",
    pose: "🧘",
    background: "🌄",
    effect: "✨",
    checkpoint: "📦",
    embedding: "📝",
    other: "📁",
    vehicle: "🚗",
    object: "📦",
    animal: "🐾",
    building: "🏢",
};

const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'character', label: 'Characters' },
    { id: 'style', label: 'Styles' },
    { id: 'concept', label: 'Concepts' },
    { id: 'clothing', label: 'Clothing' },
    { id: 'pose', label: 'Poses' },
    { id: 'background', label: 'Backgrounds' },
    { id: 'effect', label: 'Effects' },
    { id: 'checkpoint', label: 'Checkpoints' },
    { id: 'embedding', label: 'Embeddings' },
    { id: 'other', label: 'Other' }
];

// Base model options that match CivitAI's format
const BASE_MODEL_OPTIONS = [
    { value: 'SDXL 1.0', label: 'SDXL 1.0' },
    { value: 'SD 1.5', label: 'SD 1.5' },
    { value: 'SD 3', label: 'SD 3' },
    { value: 'SD 3.5 Large', label: 'SD 3.5 Large' },
    { value: 'Flux.1 D', label: 'Flux.1 Dev' },
    { value: 'Flux.1 S', label: 'Flux.1 Schnell' },
    { value: 'Pony', label: 'Pony' },
    { value: 'Illustrious', label: 'Illustrious' },
    { value: 'Wan Video 2.2 I2V-A14B', label: 'Wan 2.2 I2V-A14B' },
    { value: 'Wan Video 2.2 T2V-A14B', label: 'Wan 2.2 T2V-A14B' },
    { value: 'Wan Video', label: 'Wan Video' },
    { value: 'Hunyuan Video', label: 'Hunyuan Video' },
    { value: 'SVD', label: 'SVD' },
    { value: 'Other', label: 'Other' },
];

// Grouped filter options for the title bar dropdown
const BASE_MODEL_FILTER_GROUPS = [
    {
        label: 'Image Models',
        icon: 'image',
        options: [
            { value: 'Flux.1 D', label: 'Flux Dev' },
            { value: 'Flux.1 S', label: 'Flux Schnell' },
            { value: 'SDXL 1.0', label: 'SDXL 1.0' },
            { value: 'SD 3.5 Large', label: 'SD 3.5 Large' },
            { value: 'SD 3', label: 'SD 3' },
            { value: 'SD 1.5', label: 'SD 1.5' },
            { value: 'Pony', label: 'Pony' },
            { value: 'Illustrious', label: 'Illustrious' },
        ]
    },
    {
        label: 'Video Models',
        icon: 'video',
        options: [
            { value: 'Wan Video', label: 'Wan Video (All)' },
            { value: 'Wan Video 2.2 T2V-A14B', label: 'Wan T2V-A14B' },
            { value: 'Wan Video 2.2 I2V-A14B', label: 'Wan I2V-A14B' },
            { value: 'Hunyuan Video', label: 'Hunyuan Video' },
            { value: 'SVD', label: 'SVD' },
        ]
    }
];

// Map generation model IDs to their compatible LoRA base models
function getBaseModelFromModelId(modelId: string | undefined): string | null {
    if (!modelId) return null;
    const lower = modelId.toLowerCase();

    // Flux models
    if (lower.includes('flux') && lower.includes('dev')) return 'Flux.1 D';
    if (lower.includes('flux') && lower.includes('schnell')) return 'Flux.1 S';
    if (lower.includes('flux')) return 'Flux.1 D'; // Default Flux to Dev

    // Wan Video models
    if (lower.includes('wan') && lower.includes('t2v')) return 'Wan Video 2.2 T2V-A14B';
    if (lower.includes('wan') && lower.includes('i2v')) return 'Wan Video 2.2 I2V-A14B';
    if (lower.includes('wan')) return 'Wan Video';

    // Hunyuan
    if (lower.includes('hunyuan')) return 'Hunyuan Video';

    // SVD / Stable Video Diffusion
    if (lower.includes('svd') || lower.includes('stable-video')) return 'SVD';

    // SDXL
    if (lower.includes('sdxl') || lower.includes('sd-xl')) return 'SDXL 1.0';

    // SD 3.5
    if (lower.includes('sd3.5') || lower.includes('sd-3.5')) return 'SD 3.5 Large';

    // SD 3
    if (lower.includes('sd3') || lower.includes('sd-3')) return 'SD 3';

    // SD 1.5
    if (lower.includes('sd1.5') || lower.includes('sd-1.5') || lower.includes('stable-diffusion-v1')) return 'SD 1.5';

    // Pony
    if (lower.includes('pony')) return 'Pony';

    // Illustrious
    if (lower.includes('illustrious')) return 'Illustrious';

    return null;
}

// Normalize CivitAI base model to our standard format
function normalizeCivitaiBaseModel(civitaiBase: string): string {
    if (!civitaiBase) return 'Other';

    // Check if it matches one of our options directly
    if (BASE_MODEL_OPTIONS.some(opt => opt.value === civitaiBase)) {
        return civitaiBase;
    }

    const lower = civitaiBase.toLowerCase();

    // Flux variants
    if (lower.includes('flux')) {
        if (lower.includes('dev') || lower === 'flux.1 d') return 'Flux.1 D';
        if (lower.includes('schnell') || lower === 'flux.1 s') return 'Flux.1 S';
        return 'Flux.1 D'; // Default to Dev
    }

    // Wan variants
    if (lower.includes('wan')) {
        if (lower.includes('i2v') && lower.includes('14b')) return 'Wan Video 2.2 I2V-A14B';
        if (lower.includes('t2v') && lower.includes('14b')) return 'Wan Video 2.2 T2V-A14B';
        return 'Wan Video';
    }

    // SDXL
    if (lower.includes('sdxl') || lower === 'xl') return 'SDXL 1.0';

    // SD 1.5
    if (lower.includes('sd 1.5') || lower.includes('sd1.5')) return 'SD 1.5';

    // SD 3
    if (lower.includes('sd 3.5')) return 'SD 3.5 Large';
    if (lower.includes('sd 3') || lower.includes('sd3')) return 'SD 3';

    // Pony
    if (lower.includes('pony')) return 'Pony';

    // Illustrious
    if (lower.includes('illustrious')) return 'Illustrious';

    // Hunyuan
    if (lower.includes('hunyuan')) return 'Hunyuan Video';

    // SVD
    if (lower.includes('svd')) return 'SVD';

    // If not matched, return the original value so it can be displayed
    return civitaiBase;
}

export interface LoRA {
    id: string;
    name: string;
    triggerWord?: string;
    triggerWords?: string[];
    aliasPatterns?: string[]; // Custom aliases for prompt detection (e.g., ["sarah", "sara"])
    fileUrl: string;
    baseModel: string;
    type: 'lora' | 'checkpoint' | 'embedding';
    category?: string;
    strength: number;
    imageUrl?: string;
    settings?: any;
}

interface LoRAManagerProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    selectedIds?: string[];
    onToggle?: (lora: LoRA) => void;
    embedded?: boolean;
    filterBaseModel?: string;
    currentModelId?: string; // Current generation model ID for auto-filtering
}

export function LoRAManager({ projectId, isOpen, onClose, selectedIds = [], onToggle, embedded = false, filterBaseModel, currentModelId }: LoRAManagerProps) {
    const [loras, setLoras] = useState<LoRA[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState('all');
    const [isAdding, setIsAdding] = useState(false);
    const [editingLora, setEditingLora] = useState<LoRA | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    // localBaseModelFilter: null = use auto-detection, '' = explicitly cleared, string = user selection
    const [localBaseModelFilter, setLocalBaseModelFilter] = useState<string | null>(null);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    // Auto-detect base model from currentModelId
    const autoDetectedBaseModel = useMemo(() => getBaseModelFromModelId(currentModelId), [currentModelId]);

    // Priority: prop filter > local filter (if explicitly set) > auto-detected
    // Empty string '' means user explicitly cleared the filter
    const activeBaseModelFilter = filterBaseModel || (localBaseModelFilter !== null ? (localBaseModelFilter || null) : autoDetectedBaseModel);

    // LoRAs filtered by base model only (for category counts)
    const baseModelFilteredLoras = useMemo(() => {
        if (!activeBaseModelFilter) return loras;
        return loras.filter(lora => {
            if (activeBaseModelFilter === 'Wan Video') {
                return lora.baseModel.includes('Wan');
            }
            return lora.baseModel === activeBaseModelFilter || lora.baseModel === 'Other';
        });
    }, [loras, activeBaseModelFilter]);

    // Filter LoRAs based on category AND baseModel
    const filteredLoras = useMemo(() => {
        return baseModelFilteredLoras.filter(lora => {
            // Category Filter
            if (activeCategory === 'all') return true;
            if (activeCategory === 'checkpoint') return lora.type === 'checkpoint';
            if (activeCategory === 'embedding') return lora.type === 'embedding';

            // For standard categories, check the category field
            return (lora.category || 'other').toLowerCase() === activeCategory;
        });
    }, [baseModelFilteredLoras, activeCategory]);

    // Group filtered LoRAs by base name for version grouping
    const groupedLoras = useMemo(() => groupLoRAs(filteredLoras), [filteredLoras]);

    // All unique categories (for edit/add dropdowns) - combines predefined + dynamic from LoRA data
    const allCategoryOptions = useMemo(() => {
        const predefinedIds = new Set(CATEGORIES.map(c => c.id));
        const dynamicCategories = new Set<string>();

        // Collect categories from all LoRAs (not just filtered)
        loras.forEach(l => {
            const cat = (l.category || 'other').toLowerCase();
            if (!predefinedIds.has(cat) && cat !== 'all') {
                dynamicCategories.add(cat);
            }
        });

        // Combine predefined (except 'all') with dynamic categories
        const options = CATEGORIES.filter(c => c.id !== 'all').map(c => ({
            id: c.id,
            label: c.label
        }));

        // Add dynamic categories
        dynamicCategories.forEach(cat => {
            options.push({
                id: cat,
                label: cat.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
            });
        });

        // Sort alphabetically by label
        return options.sort((a, b) => a.label.localeCompare(b.label));
    }, [loras]);

    const toggleGroupExpanded = (baseName: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(baseName)) {
                next.delete(baseName);
            } else {
                next.add(baseName);
            }
            return next;
        });
    };

    // Form State (for adding new)
    const [newName, setNewName] = useState("");
    const [newTrigger, setNewTrigger] = useState("");
    const [newUrl, setNewUrl] = useState("");
    const [newBaseModel, setNewBaseModel] = useState("SDXL 1.0");
    const [newType, setNewType] = useState<'lora' | 'checkpoint' | 'embedding'>('lora');
    const [newStrength, setNewStrength] = useState(1.0);
    const [newImageUrl, setNewImageUrl] = useState("");
    const [newCategory, setNewCategory] = useState("other");
    const [editCategory, setEditCategory] = useState("other");
    const [editName, setEditName] = useState("");
    const [editTrigger, setEditTrigger] = useState("");
    const [editAliases, setEditAliases] = useState(""); // Comma-separated aliases
    const [editBaseModel, setEditBaseModel] = useState("SDXL");
    const [editStrength, setEditStrength] = useState(1.0);
    const [newSettings, setNewSettings] = useState<any>(null);
    const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
    const [fetchSuccess, setFetchSuccess] = useState<string | null>(null);
    useEffect(() => {
        if (isOpen) {
            loadLoRAs();
        }
    }, [isOpen]);

    const loadLoRAs = async () => {
        setIsLoading(true);
        try {
            const response = await fetchAPI(`/projects/${projectId}/loras`);
            const lorasData = Array.isArray(response) ? response : (response.data || []);
            setLoras(lorasData);
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
                    type: newType,
                    category: newCategory,
                    strength: newStrength,
                    imageUrl: newImageUrl,
                    settings: newSettings
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
        if (!confirm("Are you sure you want to remove this item?")) return;
        try {
            await fetchAPI(`/projects/${projectId}/loras/${id}`, {
                method: "DELETE"
            });
            loadLoRAs();
        } catch (err) {
            console.error("Failed to delete item", err);
        }
    };

    const resetForm = () => {
        setNewName("");
        setNewTrigger("");
        setNewUrl("");
        setNewBaseModel("SDXL 1.0");
        setNewType("lora");
        setNewStrength(1.0);
        setNewImageUrl("");
        setNewCategory("other");
        setNewSettings(null);
        setFetchSuccess(null);
    };

    const startEditing = (lora: LoRA, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingLora(lora);
        setEditName(lora.name);
        setEditTrigger(lora.triggerWord || "");
        setEditAliases(lora.aliasPatterns?.join(", ") || "");
        setEditBaseModel(lora.baseModel);
        setEditCategory(lora.category || "other");
        setEditStrength(lora.strength);
        setError(null);
    };

    const cancelEditing = () => {
        setEditingLora(null);
        setEditName("");
        setEditTrigger("");
        setEditAliases("");
        setEditBaseModel("");
        setEditCategory("other");
        setEditStrength(1.0);
        setError(null);
    };

    const handleUpdateLoRA = async () => {
        if (!editingLora || !editName) return;
        setError(null);

        // Parse comma-separated aliases into array
        const aliasPatterns = editAliases
            .split(",")
            .map(a => a.trim().toLowerCase())
            .filter(a => a.length > 0);

        try {
            await fetchAPI(`/projects/${projectId}/loras/${editingLora.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    name: editName,
                    triggerWord: editTrigger,
                    aliasPatterns: aliasPatterns.length > 0 ? aliasPatterns : undefined,
                    baseModel: editBaseModel,
                    category: editCategory,
                    strength: editStrength
                })
            });
            cancelEditing();
            loadLoRAs();
        } catch (err: any) {
            console.error("Failed to update LoRA", err);
            setError(err.message || "Failed to update LoRA");
        }
    };

    const handleFetchMetadata = async () => {
        if (!newUrl) return;
        setIsFetchingMetadata(true);
        setError(null);
        setFetchSuccess(null);

        try {
            // Dynamic import to avoid SSR issues if any, though this is client side
            const { fetchCivitaiModelVersion, extractVersionIdFromUrl, extractRecommendedSettings } = await import("@/lib/civitai");

            // 1. Try Civitai first
            const versionId = extractVersionIdFromUrl(newUrl);
            let metadata = null;

            if (versionId) {
                metadata = await fetchCivitaiModelVersion(versionId);
            }

            if (metadata) {
                // Set name
                setNewName(metadata.model.name + " " + metadata.name);

                // Set base model (normalize CivitAI format to our format)
                const normalizedBase = normalizeCivitaiBaseModel(metadata.baseModel);
                setNewBaseModel(normalizedBase);

                // Set type
                if (metadata.model.type === "Checkpoint") setNewType("checkpoint");
                else if (metadata.model.type === "TextualInversion") setNewType("embedding");
                else setNewType("lora");

                // Set image
                if (metadata.images && metadata.images.length > 0) {
                    setNewImageUrl(metadata.images[0].url);
                }

                // Set trigger word(s) from trainedWords
                if (metadata.trainedWords && metadata.trainedWords.length > 0) {
                    // Use the first trained word as the primary trigger
                    setNewTrigger(metadata.trainedWords[0]);
                }

                // Extract recommended settings including strength
                if (metadata.description || metadata.trainedWords) {
                    const settings = extractRecommendedSettings(metadata.description, metadata.trainedWords);
                    setNewSettings(settings);

                    // Auto-set strength if found in description
                    if (settings.strength && settings.strength >= 0.1 && settings.strength <= 2.0) {
                        setNewStrength(settings.strength);
                    }
                }

                // Show success with what was found
                const foundFields: string[] = [];
                if (metadata.baseModel) foundFields.push("Base Model");
                if (metadata.trainedWords?.length) foundFields.push(`${metadata.trainedWords.length} Trigger Word${metadata.trainedWords.length > 1 ? 's' : ''}`);
                if (metadata.images?.length) foundFields.push("Thumbnail");
                const settings = extractRecommendedSettings(metadata.description, metadata.trainedWords);
                if (settings.strength) foundFields.push(`Strength (${settings.strength})`);

                if (foundFields.length > 0) {
                    setFetchSuccess(`Found: ${foundFields.join(", ")}`);
                }
            } else {
                // 2. Fallback: Parse URL for clues (HuggingFace, generic file)
                console.log("Not a Civitai URL or metadata fetch failed. Attempting manual parse.");

                // HuggingFace: https://huggingface.co/User/Repo/blob/main/file.safetensors
                if (newUrl.includes("huggingface.co")) {
                    const parts = newUrl.split('/');
                    const lastPart = parts[parts.length - 1];
                    const possibleName = lastPart.replace(/\.(safetensors|ckpt|pt|bin)$/i, "").replace(/[_-]/g, " ");
                    setNewName(possibleName || "HuggingFace Model");
                } else {
                    // Generic file URL
                    const parts = newUrl.split('/');
                    const lastPart = parts[parts.length - 1];
                    const possibleName = lastPart.replace(/\.(safetensors|ckpt|pt|bin)$/i, "").replace(/[_-]/g, " ");
                    if (possibleName) {
                        setNewName(possibleName);
                    }
                }

                setError("Metadata not found automatically. Please fill in details manually.");
            }
        } catch (err) {
            console.error(err);
            // Don't block user, just warn
            setError("Failed to fetch metadata. Please enter details manually.");
        } finally {
            setIsFetchingMetadata(false);
        }
    };

    if (!isOpen) return null;

    const content = (
        <div className={clsx(
            "bg-[#1a1a1a] border border-white/10 rounded-xl flex flex-col shadow-2xl",
            embedded ? "w-full min-w-[400px] max-w-[700px] h-full max-h-full overflow-y-auto scrollbar-none" : "w-full max-w-2xl max-h-[80vh] overflow-hidden"
        )}>
            <div className="flex justify-between items-center p-4 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">Models & LoRAs</h2>
                <div className="flex items-center gap-2">
                    {/* Base Model Filter Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                            className={clsx(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                                activeBaseModelFilter
                                    ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                            )}
                        >
                            <Filter className="w-3.5 h-3.5" />
                            {activeBaseModelFilter ? (
                                <>
                                    <span className="max-w-[100px] truncate">{activeBaseModelFilter}</span>
                                    {!filterBaseModel && (
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setLocalBaseModelFilter('');
                                                setShowFilterDropdown(false);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.stopPropagation();
                                                    setLocalBaseModelFilter('');
                                                    setShowFilterDropdown(false);
                                                }
                                            }}
                                            className="ml-1 p-0.5 hover:bg-white/10 rounded cursor-pointer"
                                        >
                                            <X className="w-3 h-3" />
                                        </span>
                                    )}
                                </>
                            ) : (
                                <span>Base Model</span>
                            )}
                            <ChevronDown className={clsx("w-3 h-3 transition-transform", showFilterDropdown && "rotate-180")} />
                        </button>

                        {/* Dropdown Menu */}
                        {showFilterDropdown && (
                            <div className="absolute right-0 top-full mt-1 w-56 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                                {/* Clear Filter Option */}
                                {activeBaseModelFilter && !filterBaseModel && (
                                    <button
                                        onClick={() => {
                                            setLocalBaseModelFilter('');
                                            setShowFilterDropdown(false);
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs text-gray-400 hover:bg-white/5 hover:text-white border-b border-white/10 flex items-center gap-2"
                                    >
                                        <X className="w-3 h-3" />
                                        Clear Filter
                                    </button>
                                )}

                                {/* Grouped Options */}
                                {BASE_MODEL_FILTER_GROUPS.map((group) => (
                                    <div key={group.label}>
                                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-white/5 flex items-center gap-2">
                                            {group.icon === 'image' ? <Image className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                                            {group.label}
                                        </div>
                                        {group.options.map((opt) => {
                                            const count = loras.filter(l => {
                                                if (opt.value === 'Wan Video') return l.baseModel.includes('Wan');
                                                return l.baseModel === opt.value;
                                            }).length;

                                            return (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => {
                                                        setLocalBaseModelFilter(opt.value);
                                                        setShowFilterDropdown(false);
                                                    }}
                                                    className={clsx(
                                                        "w-full px-3 py-1.5 text-left text-xs hover:bg-white/5 flex items-center justify-between",
                                                        activeBaseModelFilter === opt.value
                                                            ? "text-blue-400 bg-blue-500/10"
                                                            : "text-gray-300"
                                                    )}
                                                >
                                                    <span>{opt.label}</span>
                                                    <span className={clsx(
                                                        "text-[10px] px-1.5 py-0.5 rounded",
                                                        count > 0 ? "bg-white/10 text-gray-400" : "text-gray-600"
                                                    )}>
                                                        {count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className={clsx("flex-1 p-4", embedded ? "overflow-hidden" : "overflow-y-auto")} onClick={() => setShowFilterDropdown(false)}>
                {/* Filter Status */}
                {activeBaseModelFilter && (
                    <div className={clsx(
                        "mb-4 p-2 rounded text-xs flex items-center justify-between",
                        filterBaseModel
                            ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-200"
                            : "bg-blue-500/10 border border-blue-500/20 text-blue-200"
                    )}>
                        <div className="flex items-center gap-2">
                            <Filter className="w-3 h-3" />
                            <span>Showing LoRAs for <span className="font-bold">{activeBaseModelFilter}</span></span>
                            <span className="text-white/50">({filteredLoras.length} of {loras.length})</span>
                        </div>
                        {!filterBaseModel && (
                            <button
                                onClick={() => setLocalBaseModelFilter('')}
                                className="text-blue-300 hover:text-white flex items-center gap-1"
                            >
                                <X className="w-3 h-3" />
                                Clear
                            </button>
                        )}
                    </div>
                )}

                {editingLora ? (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
                        <h3 className="font-medium text-white text-sm">Edit {editingLora.type === 'checkpoint' ? 'Checkpoint' : 'LoRA'}</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Trigger Word</label>
                                <input
                                    type="text"
                                    value={editTrigger}
                                    onChange={(e) => setEditTrigger(e.target.value)}
                                    placeholder="e.g. cbrpnk"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">
                                    Aliases <span className="text-gray-600">(comma-separated, for prompt detection)</span>
                                </label>
                                <input
                                    type="text"
                                    value={editAliases}
                                    onChange={(e) => setEditAliases(e.target.value)}
                                    placeholder="e.g. sarah, sara, sari"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">
                                    When these words appear in your prompt, the trigger word will be automatically added.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Base Model</label>
                                    <select
                                        value={editBaseModel}
                                        onChange={(e) => setEditBaseModel(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                    >
                                        {BASE_MODEL_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Category</label>
                                    <select
                                        value={editCategory}
                                        onChange={(e) => setEditCategory(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                    >
                                        {allCategoryOptions.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-400 text-xs px-1">{error}</div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={cancelEditing}
                                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateLoRA}
                                disabled={!editName}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                ) : isAdding ? (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
                        <h3 className="font-medium text-white text-sm">Add New Resource</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Type</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setNewType('lora')}
                                        className={clsx(
                                            "flex-1 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center justify-center gap-2",
                                            newType === 'lora' ? "bg-blue-600 border-blue-500 text-white" : "bg-black/50 border-white/10 text-gray-400 hover:bg-white/5"
                                        )}
                                    >
                                        <Layers className="w-3 h-3" /> LoRA
                                    </button>
                                    <button
                                        onClick={() => setNewType('checkpoint')}
                                        className={clsx(
                                            "flex-1 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center justify-center gap-2",
                                            newType === 'checkpoint' ? "bg-purple-600 border-purple-500 text-white" : "bg-black/50 border-white/10 text-gray-400 hover:bg-white/5"
                                        )}
                                    >
                                        <Box className="w-3 h-3" /> Checkpoint
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder={newType === 'lora' ? "e.g. Cyberpunk Style" : "e.g. Pony Diffusion V6"}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Trigger Word (Optional)</label>
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
                            <label className="block text-xs text-gray-400 mb-1">File Path or URL (Civitai, HuggingFace, or Direct Link)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newUrl}
                                    onChange={(e) => setNewUrl(e.target.value)}
                                    placeholder="https://civitai.com/models/..."
                                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                                <button
                                    onClick={handleFetchMetadata}
                                    disabled={isFetchingMetadata || !newUrl}
                                    className="px-3 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs hover:bg-blue-600/30 disabled:opacity-50"
                                >
                                    {isFetchingMetadata ? "..." : "Fetch"}
                                </button>
                            </div>
                            {fetchSuccess && (
                                <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-[10px] text-green-400 flex items-center gap-2">
                                    <Check className="w-3 h-3" />
                                    {fetchSuccess}
                                </div>
                            )}
                            {newSettings && Object.keys(newSettings).length > 0 && (
                                <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] text-blue-400">
                                    Settings: {Object.keys(newSettings).filter(k => newSettings[k] !== undefined && newSettings[k] !== null && (Array.isArray(newSettings[k]) ? newSettings[k].length > 0 : true)).join(", ")}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Base Model</label>
                                <select
                                    value={newBaseModel}
                                    onChange={(e) => setNewBaseModel(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                >
                                    {BASE_MODEL_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Category</label>
                                <select
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                >
                                    {allCategoryOptions.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Default Strength</label>
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
                                Add Resource
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {/* All Button */}
                            <button
                                onClick={() => setActiveCategory('all')}
                                className={clsx(
                                    "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors flex items-center gap-1.5",
                                    activeCategory === 'all'
                                        ? "bg-blue-600 border-blue-500 text-white"
                                        : "bg-[#2a2a2a] border-white/5 text-gray-400 hover:text-white hover:border-white/20"
                                )}
                            >
                                <span>{CATEGORY_ICONS['all']}</span>
                                All <span className="opacity-50">({baseModelFilteredLoras.length})</span>
                            </button>

                            {/* Dynamic Categories - based on base model filtered LoRAs */}
                            {Array.from(new Set(baseModelFilteredLoras.map(l => {
                                if (l.type === 'checkpoint') return 'checkpoint';
                                if (l.type === 'embedding') return 'embedding';
                                return (l.category || 'other').toLowerCase();
                            }))).sort().map(catId => {
                                if (catId === 'all') return null; // Already handled
                                const count = baseModelFilteredLoras.filter(l => {
                                    if (catId === 'checkpoint') return l.type === 'checkpoint';
                                    if (catId === 'embedding') return l.type === 'embedding';
                                    return (l.category || 'other').toLowerCase() === catId;
                                }).length;

                                const label = CATEGORIES.find(c => c.id === catId)?.label || catId.charAt(0).toUpperCase() + catId.slice(1);
                                const icon = CATEGORY_ICONS[catId] || "🏷️";

                                return (
                                    <button
                                        key={catId}
                                        onClick={() => setActiveCategory(catId)}
                                        className={clsx(
                                            "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors flex items-center gap-1.5",
                                            activeCategory === catId
                                                ? "bg-[#d4b067] border-[#d4b067] text-black"
                                                : "bg-[#2a2a2a] border-white/5 text-gray-400 hover:text-white hover:border-white/20"
                                        )}
                                    >
                                        <span>{icon}</span>
                                        {label} <span className={clsx("opacity-50", activeCategory === catId ? "text-black/60" : "")}>({count})</span>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setIsAdding(true)}
                            className="w-full py-2 border border-dashed border-white/20 rounded-lg text-gray-400 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Model or LoRA
                        </button>

                        <div className="space-y-2">
                            {groupedLoras.map((group) => {
                                const isExpanded = expandedGroups.has(group.baseName);
                                const hasMultipleVersions = group.hasMultipleVersions;
                                const selectedInGroup = group.items.filter(l => selectedIds.includes(l.id));
                                const hasSelectedItems = selectedInGroup.length > 0;

                                // For single-item groups, render normally
                                if (!hasMultipleVersions) {
                                    const lora = group.items[0];
                                    const isSelected = selectedIds.includes(lora.id);
                                    const isCheckpoint = lora.type === 'checkpoint';
                                    const isEmbedding = lora.type === 'embedding';

                                    return (
                                        <div
                                            key={lora.id}
                                            className={clsx(
                                                "flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer",
                                                isSelected
                                                    ? (isCheckpoint ? "bg-purple-500/10 border-purple-500/50" : "bg-blue-500/10 border-blue-500/50")
                                                    : "bg-white/5 border-white/5 hover:border-white/10"
                                            )}
                                            onClick={() => onToggle && onToggle(lora)}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className={clsx(
                                                    "w-8 h-8 rounded flex-shrink-0 flex items-center justify-center border",
                                                    isSelected
                                                        ? (isCheckpoint ? "bg-purple-500 border-purple-400 text-white" : "bg-blue-500 border-blue-400 text-white")
                                                        : "bg-white/5 border-white/10 text-gray-500"
                                                )}>
                                                    {isSelected ? <Check className="w-4 h-4" /> : (isCheckpoint ? <Box className="w-4 h-4" /> : <Layers className="w-4 h-4" />)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={clsx("font-medium text-sm truncate", isSelected ? (isCheckpoint ? "text-purple-200" : "text-blue-200") : "text-white")}>
                                                            {lora.name}
                                                        </h4>
                                                        {isCheckpoint ? (
                                                            <span className="text-[10px] bg-purple-500 text-white px-1.5 py-0.5 rounded font-bold">CKPT</span>
                                                        ) : isEmbedding ? (
                                                            <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded font-bold">EMB</span>
                                                        ) : (
                                                            <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-bold">LORA</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                        <span className="bg-white/10 px-1 py-0.5 rounded">{lora.baseModel}</span>
                                                        {(lora.triggerWords?.[0] || lora.triggerWord) && <span className="truncate">Trigger: {lora.triggerWords?.[0] || lora.triggerWord}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={(e) => startEditing(lora, e)}
                                                    className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(lora.id, e)}
                                                    className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                // For multi-version groups, render collapsible
                                const firstItem = group.items[0];
                                const isCheckpoint = firstItem.type === 'checkpoint';
                                const isEmbedding = firstItem.type === 'embedding';

                                return (
                                    <div key={group.baseName} className="space-y-1">
                                        {/* Group Header */}
                                        <div
                                            className={clsx(
                                                "flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer",
                                                hasSelectedItems
                                                    ? (isCheckpoint ? "bg-purple-500/10 border-purple-500/50" : "bg-blue-500/10 border-blue-500/50")
                                                    : "bg-white/5 border-white/5 hover:border-white/10"
                                            )}
                                            onClick={() => toggleGroupExpanded(group.baseName)}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className={clsx(
                                                    "w-8 h-8 rounded flex-shrink-0 flex items-center justify-center border",
                                                    hasSelectedItems
                                                        ? (isCheckpoint ? "bg-purple-500 border-purple-400 text-white" : "bg-blue-500 border-blue-400 text-white")
                                                        : "bg-white/5 border-white/10 text-gray-500"
                                                )}>
                                                    {hasSelectedItems ? <Check className="w-4 h-4" /> : (isCheckpoint ? <Box className="w-4 h-4" /> : <Layers className="w-4 h-4" />)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={clsx("font-medium text-sm truncate", hasSelectedItems ? (isCheckpoint ? "text-purple-200" : "text-blue-200") : "text-white")}>
                                                            {group.baseName}
                                                        </h4>
                                                        {isCheckpoint ? (
                                                            <span className="text-[10px] bg-purple-500 text-white px-1.5 py-0.5 rounded font-bold">CKPT</span>
                                                        ) : isEmbedding ? (
                                                            <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded font-bold">EMB</span>
                                                        ) : (
                                                            <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-bold">LORA</span>
                                                        )}
                                                        <span className="text-[10px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded">
                                                            {group.items.length} versions
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                        <span className="bg-white/10 px-1 py-0.5 rounded">{firstItem.baseModel}</span>
                                                        {(firstItem.triggerWords?.[0] || firstItem.triggerWord) && <span className="truncate">Trigger: {firstItem.triggerWords?.[0] || firstItem.triggerWord}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {hasSelectedItems && (
                                                    <span className="text-[10px] text-blue-400">{selectedInGroup.length} selected</span>
                                                )}
                                                {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded Version List */}
                                        {isExpanded && (
                                            <div className="ml-4 space-y-1 border-l border-white/10 pl-3">
                                                {group.items.map((lora) => {
                                                    const isSelected = selectedIds.includes(lora.id);
                                                    const { version } = parseLoRAName(lora.name);

                                                    return (
                                                        <div
                                                            key={lora.id}
                                                            className={clsx(
                                                                "flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer",
                                                                isSelected
                                                                    ? (isCheckpoint ? "bg-purple-500/10 border-purple-500/50" : "bg-blue-500/10 border-blue-500/50")
                                                                    : "bg-white/5 border-white/5 hover:border-white/10"
                                                            )}
                                                            onClick={() => onToggle && onToggle(lora)}
                                                        >
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <div className={clsx(
                                                                    "w-6 h-6 rounded flex-shrink-0 flex items-center justify-center border",
                                                                    isSelected
                                                                        ? (isCheckpoint ? "bg-purple-500 border-purple-400 text-white" : "bg-blue-500 border-blue-400 text-white")
                                                                        : "bg-white/5 border-white/10 text-gray-500"
                                                                )}>
                                                                    {isSelected ? <Check className="w-3 h-3" /> : null}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <span className={clsx("text-xs font-medium", isSelected ? "text-blue-200" : "text-white")}>
                                                                        {version || lora.name}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={(e) => startEditing(lora, e)}
                                                                    className="p-1 text-gray-500 hover:text-blue-400 transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <Pencil className="w-3 h-3" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleDelete(lora.id, e)}
                                                                    className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {loras.length === 0 && !isLoading && (
                                <p className="text-center text-gray-500 text-xs py-4">No models added yet.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div >
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
