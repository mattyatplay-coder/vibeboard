'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { toast } from 'sonner';
import {
    Loader2, Upload, Play, Check, AlertCircle,
    FileImage, Plus, Download, X,
    Sparkles, User, Palette, Settings2, Info, Clock, Zap, Trash2, Edit3, Save
} from 'lucide-react';
import { clsx } from 'clsx';
import { DatasetReviewPanel } from '@/components/training/DatasetReviewPanel';

interface TrainingJob {
    id: string;
    name: string;
    triggerWord: string;
    status: 'uploading' | 'training' | 'completed' | 'failed' | 'completed_curation' | 'processing_dataset' | 'generated_dataset';
    loraUrl?: string;
    datasetUrl?: string;
    error?: string;
    steps?: number;
    learningRate?: number;
    isStyle?: boolean;
    createdAt: string;
    updatedAt?: string;
}

interface PosePreset {
    key: string;
    id?: string;
    name: string;
    description: string;
    stylePrefix?: string;
    poses?: string[];
    isBuiltIn?: boolean;
    projectId?: string;
}

export default function TrainingPage() {
    const params = useParams();
    const projectId = params.id as string;

    const [jobs, setJobs] = useState<TrainingJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // New Job State
    const [provider, setProvider] = useState<'fal' | 'replicate'>('fal');
    const [baseModel, setBaseModel] = useState<'fast' | 'dev' | 'wan-video'>('fast'); // New State

    const [newJobName, setNewJobName] = useState("");
    const [triggerWord, setTriggerWord] = useState("");

    // Dataset State
    const [datasetPath, setDatasetPath] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    // Curation State
    const [useSmartCuration, setUseSmartCuration] = useState(false);
    const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
    const [previewUrlsRef, setPreviewUrlsRef] = useState<string[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [trainingType, setTrainingType] = useState<'style' | 'character'>('style');
    const [steps, setSteps] = useState(1000);

    const [learningRate, setLearningRate] = useState(0.0001);

    // Foundry State
    const [isFoundryMode, setIsFoundryMode] = useState(false);
    const [foundrySourceFile, setFoundrySourceFile] = useState<File | null>(null);
    const [foundryPreviewUrl, setFoundryPreviewUrl] = useState<string | null>(null);
    const [foundryPrompt, setFoundryPrompt] = useState("");
    const foundryInputRef = useRef<HTMLInputElement>(null);

    // Pose Presets
    const [posePresets, setPosePresets] = useState<PosePreset[]>([]);
    const [selectedPreset, setSelectedPreset] = useState('universal');

    // Custom Preset Editor
    const [isPresetEditorOpen, setIsPresetEditorOpen] = useState(false);
    const [editingPreset, setEditingPreset] = useState<PosePreset | null>(null);
    const [presetName, setPresetName] = useState('');
    const [presetDescription, setPresetDescription] = useState('');
    const [presetStylePrefix, setPresetStylePrefix] = useState('');
    const [presetPoses, setPresetPoses] = useState<string[]>([]);
    const [newPose, setNewPose] = useState('');


    useEffect(() => {
        loadJobs();
        loadPosePresets();
        const interval = setInterval(loadJobs, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [projectId]);

    const loadPosePresets = async () => {
        try {
            const data = await fetchAPI(`/training/pose-presets?projectId=${projectId}`);
            if (data.presets) {
                setPosePresets(data.presets);
            }
        } catch (err) {
            console.error("Failed to load pose presets", err);
            // Fallback presets if API fails
            setPosePresets([
                { key: 'universal', name: 'Universal', description: 'Works with any character type', isBuiltIn: true },
                { key: 'swimwear', name: 'Swimwear / Minimal', description: 'Bikinis, underwear - no pocket poses', isBuiltIn: true },
                { key: 'casual', name: 'Casual Clothing', description: 'T-shirts, jeans - includes pockets', isBuiltIn: true },
                { key: 'formal', name: 'Formal / Business', description: 'Suits, professional attire', isBuiltIn: true },
                { key: 'fantasy', name: 'Fantasy / Armor', description: 'Knights, warriors, heroic poses', isBuiltIn: true },
                { key: 'anime', name: 'Anime Character', description: '2D anime style poses', isBuiltIn: true },
                { key: 'cartoon', name: 'Cartoon / Mascot', description: 'Chibi, mascots, simple poses', isBuiltIn: true }
            ]);
        }
    };

    // Custom Preset CRUD
    const openPresetEditor = (preset?: PosePreset) => {
        if (preset && !preset.isBuiltIn) {
            // Edit existing custom preset
            setEditingPreset(preset);
            setPresetName(preset.name);
            setPresetDescription(preset.description || '');
            setPresetStylePrefix(preset.stylePrefix || '');
            setPresetPoses(preset.poses || []);
        } else {
            // New preset
            setEditingPreset(null);
            setPresetName('');
            setPresetDescription('');
            setPresetStylePrefix('');
            setPresetPoses([]);
        }
        setNewPose('');
        setIsPresetEditorOpen(true);
    };

    const closePresetEditor = () => {
        setIsPresetEditorOpen(false);
        setEditingPreset(null);
        setPresetName('');
        setPresetDescription('');
        setPresetStylePrefix('');
        setPresetPoses([]);
        setNewPose('');
    };

    const addPoseToList = () => {
        if (newPose.trim()) {
            setPresetPoses(prev => [...prev, newPose.trim()]);
            setNewPose('');
        }
    };

    const removePoseFromList = (index: number) => {
        setPresetPoses(prev => prev.filter((_, i) => i !== index));
    };

    const saveCustomPreset = async () => {
        if (!presetName.trim() || presetPoses.length === 0) {
            toast.error('Please provide a name and at least one pose');
            return;
        }

        try {
            const payload = {
                projectId,
                name: presetName.trim(),
                description: presetDescription.trim() || null,
                stylePrefix: presetStylePrefix.trim() || null,
                poses: presetPoses
            };

            if (editingPreset?.id) {
                // Update existing
                await fetchAPI(`/training/pose-presets/${editingPreset.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                toast.success('Preset updated!');
            } else {
                // Create new
                await fetchAPI('/training/pose-presets', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                toast.success('Custom preset created!');
            }

            closePresetEditor();
            loadPosePresets();
        } catch (err) {
            console.error('Failed to save preset', err);
            toast.error('Failed to save preset');
        }
    };

    const deleteCustomPreset = async (presetId: string) => {
        if (!confirm('Are you sure you want to delete this preset?')) return;

        try {
            await fetchAPI(`/training/pose-presets/${presetId}`, {
                method: 'DELETE'
            });
            toast.success('Preset deleted');
            if (selectedPreset === `custom_${presetId}`) {
                setSelectedPreset('universal');
            }
            loadPosePresets();
        } catch (err) {
            console.error('Failed to delete preset', err);
            toast.error('Failed to delete preset');
        }
    };

    // Cleanup preview URLs on unmount
    useEffect(() => {
        return () => {
            previewUrls.forEach(url => URL.revokeObjectURL(url));
            previewUrlsRef.forEach(url => URL.revokeObjectURL(url));
        };
    }, [previewUrls, previewUrlsRef]);

    const loadJobs = async () => {
        try {
            const data = await fetchAPI(`/training/jobs?projectId=${projectId}`);
            setJobs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load jobs", err);
            setJobs([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setSelectedFiles(prev => [...prev, ...files]);

            // Create preview URLs
            const newUrls = files.map(file => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...newUrls]);
        }
    };

    const handleReferenceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            setReferenceFiles(prev => [...prev, ...files]);
            const newUrls = files.map(file => URL.createObjectURL(file));
            setPreviewUrlsRef(prev => [...prev, ...newUrls]);

            // Reset input so the same file can be selected again if needed
            e.target.value = '';
        }
    };

    const removeFile = (index: number) => {
        URL.revokeObjectURL(previewUrls[index]);
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleCreateJob = async () => {
        // Validation handled by button state mostly, but safety check:
        if (!newJobName && !useSmartCuration) {
            toast.error("Model Name is required");
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Create Job Entry
            const job = await fetchAPI('/training/jobs', {
                method: 'POST',
                body: JSON.stringify({
                    projectId,
                    name: newJobName || `Curation Job ${new Date().toLocaleTimeString()}`,
                    triggerWord: triggerWord || "TOK",
                    steps,
                    learningRate,
                    isStyle: trainingType === 'style',
                    provider
                })
            });

            // 2. STAGE 1: CURATION
            if (useSmartCuration) {
                const formData = new FormData();
                selectedFiles.forEach(file => formData.append('images', file));
                referenceFiles.forEach(file => formData.append('reference_images', file));
                formData.append('datasetPath', datasetPath);

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/training/jobs/${job.id}/curate`, {
                    method: 'POST',
                    body: formData
                });

                if (!res.ok) throw new Error("Curation failed");
                const result = await res.json();

                toast.success(`Curation complete! Found ${result.count} frames.`);
                setDatasetPath(result.curatedPath); // Auto-fill for next step
                // Ideally, show success state in UI

            } else {
                // 3. STAGE 2: START TRAINING
                await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/training/jobs/${job.id}/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        baseModel,
                        datasetPath // This is now required
                    })
                });

                toast.success("Job started! Check the list for progress.");
                resetForm();
            }

            loadJobs();
        } catch (err) {
            console.error("Operation failed", err);
            toast.error("Operation failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFoundryGenerate = async () => {
        if (!foundrySourceFile || !newJobName || !triggerWord) {
            toast.error("Please fill in all fields (Image, Name, Trigger Word)");
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Create Job Entry
            const job = await fetchAPI('/training/jobs', {
                method: 'POST',
                body: JSON.stringify({
                    projectId,
                    name: newJobName,
                    triggerWord: triggerWord,
                    steps: 2500, // Default for character
                    learningRate: 0.0003, // Default for character
                    isStyle: false,
                    provider: 'fal'
                })
            });

            // 2. Upload Source & Start Generation
            const formData = new FormData();
            formData.append('source_image', foundrySourceFile);
            formData.append('projectId', projectId);
            formData.append('triggerWord', triggerWord);
            if (foundryPrompt) formData.append('characterDescription', foundryPrompt);
            formData.append('prompt', "person"); // Default class identifier
            formData.append('posePreset', selectedPreset); // Pose preset for generation

            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/training/jobs/${job.id}/generate-dataset`, {
                method: 'POST',
                body: formData
            });

            toast.success("Generating synthetic dataset... This takes ~3 minutes.");
            setIsCreating(false); // Close modal
            resetForm();
            loadJobs(); // Refresh list to show 'processing_dataset' status

        } catch (err: any) {
            console.error('Failed to start training job:', err);
            console.error('Error details:', err.response?.data || err.message);
            toast.error(err.message || "Failed to start training job");
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleOpenFolder = async (path: string) => {
        try {
            await fetchAPI('/system/open-folder', {
                method: 'POST',
                body: JSON.stringify({ path })
            });
        } catch (e) {
            toast.error("Failed to open folder");
        }
    };

    const handleDeleteJob = async (jobId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this training job?')) return;

        try {
            await fetchAPI(`/training/jobs/${jobId}`, {
                method: 'DELETE'
            });
            toast.success("Job deleted");
            setJobs(prev => prev.filter(j => j.id !== jobId));
        } catch (err) {
            console.error("Failed to delete job", err);
            toast.error("Failed to delete job");
        }
    };

    const handleStartTrainingFromReview = async (jobId: string, datasetUrl: string) => {
        try {
            toast.info("Zipping and uploading dataset...", { duration: 5000 });
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/training/jobs/${jobId}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    baseModel: 'fast', // Default
                    datasetPath: datasetUrl
                })
            });
            toast.success("Training started successfully!");
            loadJobs();
        } catch (err) {
            console.error("Start training failed", err);
            toast.error("Failed to start training");
        }
    };

    const resetForm = () => {
        setIsCreating(false);
        setNewJobName("");
        setTriggerWord("");
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        setSelectedFiles([]);
        setPreviewUrls([]);
        setSteps(1000);
        setLearningRate(0.0001);
        setTrainingType('style');
        setTrainingType('style');
        setProvider('fal');

        // Reset Foundry
        setIsFoundryMode(false);
        setFoundrySourceFile(null);
        if (foundryPreviewUrl) URL.revokeObjectURL(foundryPreviewUrl);
        setFoundryPreviewUrl(null);
        setFoundryPrompt("");
        setSelectedPreset('universal');
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'training': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'processing_dataset': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'generated_dataset': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
            case 'completed_curation': return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
            default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        }
    };

    return (
        <div className="flex-1 flex flex-col h-screen bg-[#0a0a0a] text-white overflow-hidden">
            {/* Header */}
            <div className="p-8 border-b border-white/10 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <Sparkles className="w-6 h-6 text-purple-400" />
                        Model Training
                    </h1>
                    <p className="text-gray-400 mt-1">Train custom LoRA models using your own images</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-purple-600/20"
                >
                    <Plus className="w-4 h-4" /> New Training Job
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                {/* Create New Job Form */}
                {isCreating && (
                    <div className="mb-8 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden animate-in slide-in-from-top-4">
                        {/* Form Header */}
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-purple-500/5">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Zap className="w-5 h-5 text-purple-400" />
                                Create New Training Job
                            </h2>
                            <button onClick={resetForm} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">

                            {/* Mode Selection */}
                            <div className="flex gap-4 p-1 bg-white/5 rounded-lg mb-6">
                                <button
                                    onClick={() => { setIsFoundryMode(false); setUseSmartCuration(false); }}
                                    className={clsx(
                                        "flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2",
                                        !isFoundryMode ? "bg-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                                    )}
                                >
                                    <Upload className="w-4 h-4" /> Standard Training
                                </button>
                                <button
                                    onClick={() => setIsFoundryMode(true)}
                                    className={clsx(
                                        "flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2",
                                        isFoundryMode ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                                    )}
                                >
                                    <Sparkles className="w-4 h-4" /> Character Foundry ✨
                                </button>
                            </div>

                            {/* --- FOUNDRY MODE --- */}
                            {isFoundryMode && (
                                <div className="space-y-6 animate-in slide-in-from-left-4">
                                    <div className="bg-gradient-to-r from-pink-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg p-5">
                                        <h3 className="text-purple-300 font-medium flex items-center gap-2 mb-2">
                                            <Sparkles className="w-4 h-4" /> The Character Foundry
                                        </h3>
                                        <p className="text-sm text-gray-300 leading-relaxed">
                                            Create a consistent character ("Franchise Quality") from a <strong>single image</strong>.
                                            We will generate 20+ variations (angles, lighting, distances) to train a robust LoRA model automatically.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Left Col: Inputs */}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-300 mb-1 block">Character Name</label>
                                                <input
                                                    type="text"
                                                    value={newJobName}
                                                    onChange={(e) => setNewJobName(e.target.value)}
                                                    placeholder="e.g. Cyberpunk Alice"
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-purple-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-300 mb-1 block">Trigger Word</label>
                                                <input
                                                    type="text"
                                                    value={triggerWord}
                                                    onChange={(e) => setTriggerWord(e.target.value)}
                                                    placeholder="e.g. ohwx_alice"
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-purple-500 font-mono"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">Unique identifier (e.g. ohwx_name)</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-300 mb-1 block">Character Description (Optional)</label>
                                                <textarea
                                                    value={foundryPrompt}
                                                    onChange={(e) => setFoundryPrompt(e.target.value)}
                                                    placeholder="e.g. a woman with blue hair, leather jacket, scar on left cheek..."
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-purple-500 h-24 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-300 mb-1 block">Pose Preset</label>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={selectedPreset}
                                                        onChange={(e) => setSelectedPreset(e.target.value)}
                                                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-purple-500 text-sm"
                                                    >
                                                        <optgroup label="Built-in Presets">
                                                            {posePresets.filter(p => p.isBuiltIn !== false).map(preset => (
                                                                <option key={preset.key} value={preset.key}>
                                                                    {preset.name}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                        {posePresets.some(p => p.isBuiltIn === false) && (
                                                            <optgroup label="Custom Presets">
                                                                {posePresets.filter(p => p.isBuiltIn === false).map(preset => (
                                                                    <option key={preset.key} value={preset.key}>
                                                                        {preset.name}
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        )}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => openPresetEditor()}
                                                        className="p-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-purple-400 transition-colors"
                                                        title="Create custom preset"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                    {/* Edit button for custom presets */}
                                                    {!posePresets.find(p => p.key === selectedPreset)?.isBuiltIn && selectedPreset.startsWith('custom_') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const preset = posePresets.find(p => p.key === selectedPreset);
                                                                if (preset) openPresetEditor(preset);
                                                            }}
                                                            className="p-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 transition-colors"
                                                            title="Edit preset"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {posePresets.find(p => p.key === selectedPreset)?.description || 'Select poses appropriate for the character'}
                                                    {posePresets.find(p => p.key === selectedPreset)?.poses && (
                                                        <span className="ml-2 text-purple-400">
                                                            ({posePresets.find(p => p.key === selectedPreset)?.poses?.length} poses)
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right Col: Image Upload */}
                                        <div>
                                            <label className="text-sm font-medium text-gray-300 mb-2 block">Source Image (The "Golden Record")</label>
                                            {/* Hidden file input - triggered programmatically for Electron compatibility */}
                                            <input
                                                ref={foundryInputRef}
                                                type="file"
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                onChange={(e) => {
                                                    if (e.target.files?.[0]) {
                                                        const file = e.target.files[0];
                                                        if (foundryPreviewUrl) URL.revokeObjectURL(foundryPreviewUrl);
                                                        setFoundrySourceFile(file);
                                                        setFoundryPreviewUrl(URL.createObjectURL(file));
                                                        e.target.value = ''; // Reset for re-selection
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => foundryInputRef.current?.click()}
                                                className="w-full border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center min-h-[200px] relative hover:bg-white/5 transition-colors cursor-pointer group"
                                            >
                                                {foundryPreviewUrl ? (
                                                    <div className="relative w-full h-full flex flex-col items-center">
                                                        <img src={foundryPreviewUrl} className="max-h-[250px] rounded-lg shadow-lg mb-4 object-contain" />
                                                        <div
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (foundryPreviewUrl) URL.revokeObjectURL(foundryPreviewUrl);
                                                                setFoundrySourceFile(null);
                                                                setFoundryPreviewUrl(null);
                                                            }}
                                                            className="absolute top-2 right-2 p-1 bg-red-500/80 rounded-full hover:bg-red-500 text-white z-30 cursor-pointer"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </div>
                                                        <p className="text-xs text-green-400 flex items-center gap-1">
                                                            <Check className="w-3 h-3" /> Ready for Analysis
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3 group-hover:text-purple-400 transition-colors" />
                                                        <p className="text-sm text-gray-300 font-medium">Upload Source Image</p>
                                                        <p className="text-xs text-gray-500 mt-1">Best quality, neutral lighting preferred</p>
                                                    </div>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/10 flex justify-end gap-3">
                                        <button onClick={resetForm} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                                        <button
                                            onClick={handleFoundryGenerate}
                                            disabled={isSubmitting || !foundrySourceFile || !newJobName}
                                            className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50 font-medium"
                                        >
                                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                            Generate Training Data
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* --- STANDARD MODE (Original Form) --- */}
                            {!isFoundryMode && (
                                <div className="space-y-6">
                                    {/* Provider Selection */}
                                    <div>
                                        <label className="text-sm font-medium text-gray-300 mb-3 block">Training Provider</label>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <button
                                                onClick={() => setProvider('fal')}
                                                className={clsx(
                                                    "p-3 rounded-lg border transition-all text-left flex items-center justify-between",
                                                    provider === 'fal'
                                                        ? "border-purple-500 bg-purple-500/10"
                                                        : "border-white/10 hover:border-white/30"
                                                )}
                                            >
                                                <span className="font-medium">Fal.ai</span>
                                                {provider === 'fal' && <Check className="w-4 h-4 text-purple-400" />}
                                            </button>
                                            <button
                                                onClick={() => setProvider('replicate')}
                                                className={clsx(
                                                    "p-3 rounded-lg border transition-all text-left flex items-center justify-between",
                                                    provider === 'replicate'
                                                        ? "border-purple-500 bg-purple-500/10"
                                                        : "border-white/10 hover:border-white/30"
                                                )}
                                            >
                                                <span className="font-medium">Replicate</span>
                                                {provider === 'replicate' && <Check className="w-4 h-4 text-purple-400" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Base Model Selection (Adapter) */}
                                    {provider === 'fal' && (
                                        <div className="mb-4 animate-in slide-in-from-top-2">
                                            <label className="text-xs font-medium text-gray-400 mb-2 block">Base Model Strategy</label>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                <button
                                                    onClick={() => setBaseModel('fast')}
                                                    className={clsx(
                                                        "p-2.5 rounded-lg border text-sm text-left transition-all",
                                                        baseModel === 'fast' ? "border-purple-500 bg-purple-500/10 text-white" : "border-white/10 text-gray-400 hover:text-gray-300"
                                                    )}
                                                >
                                                    <div className="font-medium">Flux Schnell (Fast)</div>
                                                    <div className="text-[10px] opacity-70">Lower cost, faster training</div>
                                                </button>
                                                <button
                                                    onClick={() => setBaseModel('dev')}
                                                    className={clsx(
                                                        "p-2.5 rounded-lg border text-sm text-left transition-all",
                                                        baseModel === 'dev' ? "border-purple-500 bg-purple-500/10 text-white" : "border-white/10 text-gray-400 hover:text-gray-300"
                                                    )}
                                                >
                                                    <div className="font-medium">Flux Dev (Quality)</div>
                                                    <div className="text-[10px] opacity-70">Higher quality, commercial restrictions</div>
                                                </button>
                                                {/* NEW: Wan Video Trainer */}
                                                <button
                                                    // @ts-ignore
                                                    onClick={() => setBaseModel('wan-video')}
                                                    className={clsx(
                                                        "p-2.5 rounded-lg border text-sm text-left transition-all",
                                                        // @ts-ignore
                                                        baseModel === 'wan-video' ? "border-pink-500 bg-pink-500/10 text-white" : "border-white/10 text-gray-400 hover:text-gray-300"
                                                    )}
                                                >
                                                    <div className="font-medium flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                                                        Wan Video (Beta)
                                                    </div>
                                                    <div className="text-[10px] opacity-70">Train for consistent video characters</div>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {provider === 'replicate' && (
                                        <p className="text-xs text-gray-500 mt-2 bg-white/5 p-2 rounded border border-white/5">
                                            Using <code>ostris/flux-dev-lora-trainer</code> (High Quality)
                                        </p>
                                    )}

                                    {/* Training Type Selection */}
                                    <div>
                                        <label className="text-sm font-medium text-gray-300 mb-3 block">Training Type</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setTrainingType('style')}
                                                className={clsx(
                                                    "p-4 rounded-xl border-2 transition-all text-left",
                                                    trainingType === 'style'
                                                        ? "border-purple-500 bg-purple-500/10"
                                                        : "border-white/10 hover:border-white/30"
                                                )}
                                            >
                                                <Palette className={clsx("w-6 h-6 mb-2", trainingType === 'style' ? "text-purple-400" : "text-gray-400")} />
                                                <div className="font-medium">Style LoRA</div>
                                                <p className="text-xs text-gray-500 mt-1">Train artistic styles, aesthetics, color grading</p>
                                            </button>
                                            <button
                                                onClick={() => setTrainingType('character')}
                                                className={clsx(
                                                    "p-4 rounded-xl border-2 transition-all text-left",
                                                    trainingType === 'character'
                                                        ? "border-purple-500 bg-purple-500/10"
                                                        : "border-white/10 hover:border-white/30"
                                                )}
                                            >
                                                <User className={clsx("w-6 h-6 mb-2", trainingType === 'character' ? "text-purple-400" : "text-gray-400")} />
                                                <div className="font-medium">Character LoRA</div>
                                                <p className="text-xs text-gray-500 mt-1">Train consistent faces, characters, objects</p>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Steps Indicator */}
                                    <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                                        <button
                                            onClick={() => setUseSmartCuration(true)}
                                            className={clsx("flex items-center gap-2 text-sm font-medium transition-colors", useSmartCuration ? "text-purple-400" : "text-gray-500")}
                                        >
                                            <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-xs border", useSmartCuration ? "border-purple-500 bg-purple-500/20" : "border-gray-700 bg-gray-800")}>1</div>
                                            Dataset Curation
                                        </button>
                                        <div className="h-px bg-white/10 w-8" />
                                        <button
                                            onClick={() => setUseSmartCuration(false)}
                                            className={clsx("flex items-center gap-2 text-sm font-medium transition-colors", !useSmartCuration ? "text-purple-400" : "text-gray-500")}
                                        >
                                            <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-xs border", !useSmartCuration ? "border-purple-500 bg-purple-500/20" : "border-gray-700 bg-gray-800")}>2</div>
                                            Training Config
                                        </button>
                                    </div>

                                    {/* STAGE 1: CURATION */}
                                    {useSmartCuration && (
                                        <div className="space-y-6 animate-in slide-in-from-left-4">
                                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                                <h3 className="text-blue-300 font-medium flex items-center gap-2 mb-1">
                                                    <Sparkles className="w-4 h-4" /> Smart Curation
                                                </h3>
                                                <p className="text-sm text-blue-200/70">
                                                    Upload reference photos of your subject (the "Identity") and a bulk folder of media.
                                                    We will auto-crop, caption, and filter the best images into a <strong>local curated folder</strong> for you to review.
                                                </p>
                                            </div>

                                            {/* Reference Images */}
                                            <div>
                                                <label className="text-sm font-medium text-gray-300 block mb-2">
                                                    1. Reference Identity (3-5 Close-ups)
                                                </label>
                                                <div className="flex gap-2 mb-2">
                                                    {previewUrlsRef.map((url, i) => (
                                                        <img key={i} src={url} className="w-12 h-12 rounded object-cover border border-white/20" />
                                                    ))}
                                                </div>
                                                <div className="border border-dashed border-white/10 rounded-lg p-4 text-center hover:bg-white/5 transition-colors relative cursor-pointer">
                                                    <input
                                                        type="file"
                                                        multiple
                                                        accept="image/*"
                                                        onChange={handleReferenceFileSelect}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />
                                                    <p className="text-xs text-gray-400">Click to upload reference faces</p>
                                                </div>
                                            </div>

                                            {/* Bulk Data */}
                                            <div>
                                                <label className="text-sm font-medium text-gray-300 block mb-2">
                                                    2. Bulk Data Source
                                                </label>

                                                {/* Local Path Input */}
                                                <div className="mb-3">
                                                    <input
                                                        type="text"
                                                        value={datasetPath}
                                                        onChange={(e) => setDatasetPath(e.target.value)}
                                                        placeholder="/Users/username/photos/raw-footage"
                                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 focus:border-purple-500 outline-none font-mono text-sm"
                                                    />
                                                    <p className="text-[10px] text-gray-500 mt-1">Found server-side folder path</p>
                                                </div>

                                                <p className="text-center text-xs text-gray-500 my-2">- OR -</p>

                                                {/* Folder Upload Button */}
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        multiple
                                                        // @ts-ignore
                                                        webkitdirectory=""
                                                        directory=""
                                                        onChange={handleFileSelect}
                                                        className="hidden"
                                                        id="folder-upload-curate"
                                                    />
                                                    <label
                                                        htmlFor="folder-upload-curate"
                                                        className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 py-3 rounded-lg cursor-pointer transition-colors"
                                                    >
                                                        <FileImage className="w-4 h-4" />
                                                        Select Folder from Computer
                                                    </label>
                                                    {selectedFiles.length > 0 && (
                                                        <p className="text-center text-xs text-green-400 mt-2">{selectedFiles.length} files staged for upload</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Curation Action */}
                                            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                                                <p className="text-xs text-gray-500">
                                                    Result will be saved to <code>datasets/job_[id]_curated</code>
                                                </p>
                                                <button
                                                    onClick={handleCreateJob}
                                                    disabled={isSubmitting || (selectedFiles.length === 0 && !datasetPath)}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                                                >
                                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                                    Run Smart Curation
                                                </button>
                                            </div>

                                            {/* Folder Link (After Curation) */}
                                            {jobs.length > 0 && jobs[0].status === 'completed_curation' && (
                                                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg mt-4 animate-in slide-in-from-top-2">
                                                    <p className="text-green-400 font-medium mb-2">Curation Complete!</p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleOpenFolder(jobs[0].datasetUrl || datasetPath)}
                                                            className="bg-green-600/20 hover:bg-green-600/30 text-green-300 px-3 py-1.5 rounded text-sm border border-green-500/30 flex items-center gap-2 transition-colors"
                                                        >
                                                            <FileImage className="w-4 h-4" />
                                                            Open Folder
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (jobs[0].datasetUrl) setDatasetPath(jobs[0].datasetUrl);
                                                                setUseSmartCuration(false);
                                                            }}
                                                            className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-sm border border-white/10"
                                                        >
                                                            Proceed to Training &rarr;
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* STAGE 2: TRAINING CONFIG */}
                                    {!useSmartCuration && (
                                        <div className="space-y-6 animate-in slide-in-from-right-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-300">Model Name</label>
                                                    <input
                                                        type="text"
                                                        value={newJobName}
                                                        onChange={(e) => setNewJobName(e.target.value)}
                                                        placeholder="e.g. My Style"
                                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-purple-500"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-300">Trigger Word</label>
                                                    <input
                                                        type="text"
                                                        value={triggerWord}
                                                        onChange={(e) => setTriggerWord(e.target.value)}
                                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-purple-500 font-mono"
                                                    />
                                                </div>
                                            </div>

                                            {/* Provider / Model */}
                                            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                                <label className="text-sm font-medium text-gray-300 mb-3 block">Provider Strategy</label>
                                                <div className="flex gap-4">
                                                    <button onClick={() => setProvider('fal')} className={clsx("flex-1 p-3 rounded-lg border text-left", provider === 'fal' ? "border-purple-500 bg-purple-500/10" : "border-white/10")}>
                                                        <div className="font-medium">Fal.ai (Flux)</div>
                                                        <div className="text-xs text-gray-500">Fast, Cost-effective</div>
                                                    </button>
                                                    <button onClick={() => setProvider('replicate')} className={clsx("flex-1 p-3 rounded-lg border text-left", provider === 'replicate' ? "border-purple-500 bg-purple-500/10" : "border-white/10")}>
                                                        <div className="font-medium">Replicate (Ostris)</div>
                                                        <div className="text-xs text-gray-500">High Quality</div>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Dataset Source */}
                                            <div>
                                                <label className="text-sm font-medium text-gray-300 mb-2 block">Training Dataset Path</label>
                                                <input
                                                    type="text"
                                                    value={datasetPath}
                                                    onChange={(e) => setDatasetPath(e.target.value)}
                                                    placeholder="Path to curated folder..."
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-purple-500 font-mono text-sm mb-2"
                                                />
                                                <p className="text-xs text-gray-500">
                                                    If you just ran Curation (Step 1), this path is likely <code>.../datasets/job_[id]_curated</code>
                                                </p>
                                            </div>

                                            {/* Action */}
                                            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                                <button onClick={resetForm} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                                                <button
                                                    onClick={handleCreateJob}
                                                    disabled={isSubmitting || !datasetPath || !newJobName}
                                                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
                                                >
                                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                                    Start Training
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Jobs List */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Training History</h3>

                    {isLoading ? (
                        <div className="text-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-3" />
                            <p className="text-gray-500">Loading training jobs...</p>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
                            <FileImage className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                            <p className="text-gray-400 font-medium">No training jobs yet</p>
                            <p className="text-sm text-gray-500 mt-1">Create your first custom LoRA model</p>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="mt-4 text-purple-400 hover:text-purple-300 text-sm font-medium"
                            >
                                + Create Training Job
                            </button>
                        </div>
                    ) : (
                        jobs.map(job => (
                            <div
                                key={job.id}
                                className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors"
                            >
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={clsx(
                                            "w-12 h-12 rounded-xl flex items-center justify-center border",
                                            getStatusColor(job.status)
                                        )}>
                                            {job.status === 'completed' ? <Check className="w-6 h-6" /> :
                                                job.status === 'failed' ? <AlertCircle className="w-6 h-6" /> :
                                                    job.status === 'training' ? <Loader2 className="w-6 h-6 animate-spin" /> :
                                                        job.status === 'processing_dataset' ? <Loader2 className="w-6 h-6 animate-spin" /> :
                                                            job.status === 'generated_dataset' ? <FileImage className="w-6 h-6" /> :
                                                                <Upload className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-white flex items-center gap-2">
                                                {job.name}
                                                {job.isStyle === false && (
                                                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Character</span>
                                                )}
                                            </h3>
                                            <div className="flex items-center gap-3 text-sm text-gray-400 mt-0.5">
                                                <span>
                                                    Trigger: <code className="text-purple-400 bg-purple-500/10 px-1 rounded">{job.triggerWord}</code>
                                                </span>
                                                <span className="text-gray-600">•</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDate(job.createdAt)}
                                                </span>
                                                {/* Provider Badge */}
                                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-800 text-gray-400 border border-white/5 uppercase">
                                                    {(job as any).provider || 'fal'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className={clsx(
                                            "px-3 py-1 rounded-full text-xs font-medium capitalize border",
                                            getStatusColor(job.status)
                                        )}>
                                            {job.status}
                                        </div>

                                        {job.status === 'completed' && job.loraUrl && (
                                            <a
                                                href={job.loraUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 transition-colors"
                                                title="Download LoRA"
                                            >
                                                <Download className="w-5 h-5" />
                                            </a>
                                        )}

                                        {/* Resume Training Action */}
                                        {job.status === 'completed_curation' && (
                                            <button
                                                onClick={() => {
                                                    setDatasetPath(job.datasetUrl || '');
                                                    setUseSmartCuration(false);
                                                    setIsCreating(true);
                                                    setNewJobName(job.name);
                                                    setTriggerWord(job.triggerWord);
                                                }}
                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg flex items-center gap-2 transition-colors"
                                            >
                                                Continue to Training &rarr;
                                            </button>
                                        )}

                                        <button
                                            onClick={(e) => handleDeleteJob(job.id, e)}
                                            className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 transition-colors"
                                            title="Delete Job"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Error Message */}
                                {job.error && (
                                    <div className="px-4 pb-4">
                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <h4 className="text-red-300 font-medium mb-1">Training Failed</h4>
                                                    <p className="text-sm text-red-200/80 mb-3">{job.error}</p>

                                                    {/* Actionable suggestions based on error type */}
                                                    <div className="text-xs text-gray-400 space-y-1.5 border-t border-red-500/20 pt-3 mt-2">
                                                        <p className="font-medium text-gray-300">To fix this issue:</p>
                                                        <ul className="list-disc list-inside space-y-1 ml-1">
                                                            {job.error.includes('format') || job.error.includes('octet') || job.error.includes('archive') ? (
                                                                <>
                                                                    <li>Re-generate your training dataset</li>
                                                                    <li>Ensure images are PNG or JPG format</li>
                                                                    <li>Check that image files aren't corrupted</li>
                                                                </>
                                                            ) : job.error.includes('images') || job.error.includes('dataset') ? (
                                                                <>
                                                                    <li>Add more training images (minimum 5-10)</li>
                                                                    <li>Verify images are readable PNG/JPG files</li>
                                                                    <li>Check the dataset folder path exists</li>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <li>Try creating a new training job</li>
                                                                    <li>Check your internet connection</li>
                                                                    <li>Contact support if the issue persists</li>
                                                                </>
                                                            )}
                                                        </ul>
                                                    </div>

                                                    {/* Retry Button */}
                                                    {job.datasetUrl && (
                                                        <button
                                                            onClick={() => handleStartTrainingFromReview(job.id, job.datasetUrl!)}
                                                            className="mt-3 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded text-red-300 text-xs font-medium flex items-center gap-2 transition-colors"
                                                        >
                                                            <Play className="w-3 h-3" />
                                                            Retry Training
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Dataset Generation Progress */}
                                {job.status === 'processing_dataset' && (
                                    <div className="px-4 pb-4">
                                        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                            <div className="flex items-center justify-between text-sm mb-2">
                                                <span className="text-purple-300">Generating character variations...</span>
                                                <span className="text-gray-400">~2-5 min remaining</span>
                                            </div>
                                            <div className="w-full bg-purple-500/20 rounded-full h-1.5 overflow-hidden">
                                                <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{ width: '40%' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Training Progress (for active jobs) */}
                                {job.status === 'training' && (
                                    <div className="px-4 pb-4">
                                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                            <div className="flex items-center justify-between text-sm mb-2">
                                                <span className="text-blue-300">Training in progress...</span>
                                                <span className="text-gray-400">~10-20 min remaining</span>
                                            </div>
                                            <div className="w-full bg-blue-500/20 rounded-full h-1.5 overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Dataset Review Panel */}
                                {job.status === 'generated_dataset' && job.datasetUrl && (
                                    <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="border-t border-white/10 my-4"></div>
                                        <DatasetReviewPanel
                                            jobId={job.id}
                                            datasetPath={job.datasetUrl}
                                            onComplete={() => handleStartTrainingFromReview(job.id, job.datasetUrl!)}
                                        />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Custom Preset Editor Modal */}
            {isPresetEditorOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-purple-500/5">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Settings2 className="w-5 h-5 text-purple-400" />
                                {editingPreset ? 'Edit Custom Preset' : 'Create Custom Preset'}
                            </h2>
                            <button onClick={closePresetEditor} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6 overflow-y-auto flex-1">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-300 mb-1 block">Preset Name *</label>
                                    <input
                                        type="text"
                                        value={presetName}
                                        onChange={(e) => setPresetName(e.target.value)}
                                        placeholder="e.g. Mermaid, Wheelchair User, Robot"
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-300 mb-1 block">Style Prefix (Optional)</label>
                                    <input
                                        type="text"
                                        value={presetStylePrefix}
                                        onChange={(e) => setPresetStylePrefix(e.target.value)}
                                        placeholder="e.g. anime style, cartoon style"
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-purple-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Prepended to all prompts for style consistency</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-300 mb-1 block">Description</label>
                                <input
                                    type="text"
                                    value={presetDescription}
                                    onChange={(e) => setPresetDescription(e.target.value)}
                                    placeholder="Short description of when to use this preset"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-purple-500"
                                />
                            </div>

                            {/* Poses List */}
                            <div>
                                <label className="text-sm font-medium text-gray-300 mb-2 block">
                                    Poses ({presetPoses.length}) *
                                </label>
                                <div className="bg-black/30 border border-white/10 rounded-lg p-3 max-h-[200px] overflow-y-auto mb-3">
                                    {presetPoses.length === 0 ? (
                                        <p className="text-gray-500 text-sm text-center py-4">No poses added yet. Add poses below.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {presetPoses.map((pose, index) => (
                                                <div key={index} className="flex items-center gap-2 group">
                                                    <span className="text-xs text-gray-500 w-6">{index + 1}.</span>
                                                    <span className="flex-1 text-sm text-gray-300 truncate">{pose}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removePoseFromList(index)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400 transition-all"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Add Pose Input */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newPose}
                                        onChange={(e) => setNewPose(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addPoseToList();
                                            }
                                        }}
                                        placeholder="e.g. front view, facing camera directly, standing"
                                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-purple-500 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={addPoseToList}
                                        disabled={!newPose.trim()}
                                        className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-purple-400 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Add
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Tip: Be specific about angles and framing. Use "close-up" or "medium shot" for automatic aspect ratio selection.
                                </p>
                            </div>

                            {/* Quick Add Templates */}
                            <div className="border-t border-white/10 pt-4">
                                <label className="text-xs font-medium text-gray-400 mb-2 block">Quick Add Common Poses</label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        "front view, facing camera directly, standing",
                                        "three-quarter view, body angled, standing",
                                        "side profile, standing",
                                        "close-up portrait, head and shoulders only",
                                        "medium shot cropped at waist",
                                        "full body shot, standing",
                                        "arms crossed, front view",
                                        "sitting casually, three-quarter view"
                                    ].map((pose) => (
                                        <button
                                            key={pose}
                                            type="button"
                                            onClick={() => {
                                                if (!presetPoses.includes(pose)) {
                                                    setPresetPoses(prev => [...prev, pose]);
                                                }
                                            }}
                                            disabled={presetPoses.includes(pose)}
                                            className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            + {pose.split(',')[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/10 flex justify-between items-center">
                            <div>
                                {editingPreset?.id && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (editingPreset.id) {
                                                deleteCustomPreset(editingPreset.id);
                                                closePresetEditor();
                                            }
                                        }}
                                        className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete Preset
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={closePresetEditor} className="px-4 py-2 text-gray-400 hover:text-white">
                                    Cancel
                                </button>
                                <button
                                    onClick={saveCustomPreset}
                                    disabled={!presetName.trim() || presetPoses.length === 0}
                                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingPreset ? 'Update Preset' : 'Create Preset'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
