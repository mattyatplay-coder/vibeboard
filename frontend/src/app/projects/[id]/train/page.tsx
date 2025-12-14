'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { toast } from 'sonner';
import {
    Loader2, Upload, Play, Check, AlertCircle,
    FileImage, Plus, Download, X,
    Sparkles, User, Palette, Settings2, Info, Clock, Zap, Trash2
} from 'lucide-react';
import { clsx } from 'clsx';

interface TrainingJob {
    id: string;
    name: string;
    triggerWord: string;
    status: 'uploading' | 'training' | 'completed' | 'failed' | 'completed_curation' | 'processing_dataset';
    loraUrl?: string;
    datasetUrl?: string;
    error?: string;
    steps?: number;
    learningRate?: number;
    isStyle?: boolean;
    createdAt: string;
    updatedAt?: string;
}

export default function TrainingPage() {
    const params = useParams();
    const projectId = params.id as string;

    const [jobs, setJobs] = useState<TrainingJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // New Job State
    const [provider, setProvider] = useState<'fal' | 'replicate'>('fal');
    const [baseModel, setBaseModel] = useState<'fast' | 'dev'>('fast'); // New State

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

    useEffect(() => {
        loadJobs();
        const interval = setInterval(loadJobs, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [projectId]);

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
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setReferenceFiles(prev => [...prev, ...files]);
            const newUrls = files.map(file => URL.createObjectURL(file));
            setPreviewUrlsRef(prev => [...prev, ...newUrls]);
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
        setProvider('fal');
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

                                {/* Base Model Selection (Adapter) */}
                                {provider === 'fal' && (
                                    <div className="mb-4 animate-in slide-in-from-top-2">
                                        <label className="text-xs font-medium text-gray-400 mb-2 block">Base Model Strategy</label>
                                        <div className="grid grid-cols-2 gap-3">
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
                                        </div>
                                    </div>
                                )}
                                {provider === 'replicate' && (
                                    <p className="text-xs text-gray-500 mt-2 bg-white/5 p-2 rounded border border-white/5">
                                        Using <code>ostris/flux-dev-lora-trainer</code> (High Quality)
                                    </p>
                                )}
                            </div>

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
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
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
                                                    onClick={() => setUseSmartCuration(false)}
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
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-300">
                                            {job.error}
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
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
