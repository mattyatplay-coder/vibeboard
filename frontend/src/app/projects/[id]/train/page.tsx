'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { toast } from 'sonner';
import {
  Loader2,
  Upload,
  Play,
  Check,
  AlertCircle,
  FileImage,
  Plus,
  Download,
  X,
  Sparkles,
  User,
  Palette,
  Settings2,
  Info,
  Clock,
  Zap,
  Trash2,
  Edit3,
  Save,
} from 'lucide-react';
import { clsx } from 'clsx';
import { DatasetReviewPanel } from '@/components/training/DatasetReviewPanel';

interface TrainingJob {
  id: string;
  name: string;
  triggerWord: string;
  status:
    | 'uploading'
    | 'training'
    | 'completed'
    | 'failed'
    | 'completed_curation'
    | 'processing_dataset'
    | 'generated_dataset';
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

  const [newJobName, setNewJobName] = useState('');
  const [triggerWord, setTriggerWord] = useState('');

  // Dataset State
  const [datasetPath, setDatasetPath] = useState('');
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
  const [foundryPrompt, setFoundryPrompt] = useState('');
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
      console.error('Failed to load pose presets', err);
      // Fallback presets if API fails
      setPosePresets([
        {
          key: 'universal',
          name: 'Universal',
          description: 'Works with any character type',
          isBuiltIn: true,
        },
        {
          key: 'swimwear',
          name: 'Swimwear / Minimal',
          description: 'Bikinis, underwear - no pocket poses',
          isBuiltIn: true,
        },
        {
          key: 'casual',
          name: 'Casual Clothing',
          description: 'T-shirts, jeans - includes pockets',
          isBuiltIn: true,
        },
        {
          key: 'formal',
          name: 'Formal / Business',
          description: 'Suits, professional attire',
          isBuiltIn: true,
        },
        {
          key: 'fantasy',
          name: 'Fantasy / Armor',
          description: 'Knights, warriors, heroic poses',
          isBuiltIn: true,
        },
        {
          key: 'anime',
          name: 'Anime Character',
          description: '2D anime style poses',
          isBuiltIn: true,
        },
        {
          key: 'cartoon',
          name: 'Cartoon / Mascot',
          description: 'Chibi, mascots, simple poses',
          isBuiltIn: true,
        },
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
        poses: presetPoses,
      };

      if (editingPreset?.id) {
        // Update existing
        await fetchAPI(`/training/pose-presets/${editingPreset.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Preset updated!');
      } else {
        // Create new
        await fetchAPI('/training/pose-presets', {
          method: 'POST',
          body: JSON.stringify(payload),
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
        method: 'DELETE',
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
      console.error('Failed to load jobs', err);
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
      toast.error('Model Name is required');
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
          triggerWord: triggerWord || 'TOK',
          steps,
          learningRate,
          isStyle: trainingType === 'style',
          provider,
        }),
      });

      // 2. STAGE 1: CURATION
      if (useSmartCuration) {
        const formData = new FormData();
        selectedFiles.forEach(file => formData.append('images', file));
        referenceFiles.forEach(file => formData.append('reference_images', file));
        formData.append('datasetPath', datasetPath);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/training/jobs/${job.id}/curate`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!res.ok) throw new Error('Curation failed');
        const result = await res.json();

        toast.success(`Curation complete! Found ${result.count} frames.`);
        setDatasetPath(result.curatedPath); // Auto-fill for next step
        // Ideally, show success state in UI
      } else {
        // 3. STAGE 2: START TRAINING
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/training/jobs/${job.id}/start`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              baseModel,
              datasetPath, // This is now required
            }),
          }
        );

        toast.success('Job started! Check the list for progress.');
        resetForm();
      }

      loadJobs();
    } catch (err) {
      console.error('Operation failed', err);
      toast.error('Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFoundryGenerate = async () => {
    if (!foundrySourceFile || !newJobName || !triggerWord) {
      toast.error('Please fill in all fields (Image, Name, Trigger Word)');
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
          provider: 'fal',
        }),
      });

      // 2. Upload Source & Start Generation
      const formData = new FormData();
      formData.append('source_image', foundrySourceFile);
      formData.append('projectId', projectId);
      formData.append('triggerWord', triggerWord);
      if (foundryPrompt) formData.append('characterDescription', foundryPrompt);
      formData.append('prompt', 'person'); // Default class identifier
      formData.append('posePreset', selectedPreset); // Pose preset for generation

      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/training/jobs/${job.id}/generate-dataset`,
        {
          method: 'POST',
          body: formData,
        }
      );

      toast.success('Generating synthetic dataset... This takes ~3 minutes.');
      setIsCreating(false); // Close modal
      resetForm();
      loadJobs(); // Refresh list to show 'processing_dataset' status
    } catch (err: any) {
      console.error('Failed to start training job:', err);
      console.error('Error details:', err.response?.data || err.message);
      toast.error(err.message || 'Failed to start training job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenFolder = async (path: string) => {
    try {
      await fetchAPI('/system/open-folder', {
        method: 'POST',
        body: JSON.stringify({ path }),
      });
    } catch (e) {
      toast.error('Failed to open folder');
    }
  };

  const handleDeleteJob = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this training job?')) return;

    try {
      await fetchAPI(`/training/jobs/${jobId}`, {
        method: 'DELETE',
      });
      toast.success('Job deleted');
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (err) {
      console.error('Failed to delete job', err);
      toast.error('Failed to delete job');
    }
  };

  const handleStartTrainingFromReview = async (jobId: string, datasetUrl: string) => {
    try {
      toast.info('Zipping and uploading dataset...', { duration: 5000 });
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/training/jobs/${jobId}/start`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseModel: 'fast', // Default
            datasetPath: datasetUrl,
          }),
        }
      );
      toast.success('Training started successfully!');
      loadJobs();
    } catch (err) {
      console.error('Start training failed', err);
      toast.error('Failed to start training');
    }
  };

  const resetForm = () => {
    setIsCreating(false);
    setNewJobName('');
    setTriggerWord('');
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
    setFoundryPrompt('');
    setSelectedPreset('universal');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'training':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'processing_dataset':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'generated_dataset':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'completed_curation':
        return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 p-8">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            <Sparkles className="h-6 w-6 text-purple-400" />
            Model Training
          </h1>
          <p className="mt-1 text-gray-400">Train custom LoRA models using your own images</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white shadow-lg shadow-purple-600/20 transition-colors hover:bg-purple-500"
        >
          <Plus className="h-4 w-4" /> New Training Job
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {/* Create New Job Form */}
        {isCreating && (
          <div className="animate-in slide-in-from-top-4 mb-8 overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
            {/* Form Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-purple-500/5 p-4">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Zap className="h-5 w-5 text-purple-400" />
                Create New Training Job
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* Mode Selection */}
              <div className="mb-6 flex gap-4 rounded-lg bg-white/5 p-1">
                <button
                  onClick={() => {
                    setIsFoundryMode(false);
                    setUseSmartCuration(false);
                  }}
                  className={clsx(
                    'flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all',
                    !isFoundryMode
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  <Upload className="h-4 w-4" /> Standard Training
                </button>
                <button
                  onClick={() => setIsFoundryMode(true)}
                  className={clsx(
                    'flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all',
                    isFoundryMode
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  <Sparkles className="h-4 w-4" /> Character Foundry ✨
                </button>
              </div>

              {/* --- FOUNDRY MODE --- */}
              {isFoundryMode && (
                <div className="animate-in slide-in-from-left-4 space-y-6">
                  <div className="rounded-lg border border-purple-500/20 bg-gradient-to-r from-pink-500/10 to-purple-600/10 p-5">
                    <h3 className="mb-2 flex items-center gap-2 font-medium text-purple-300">
                      <Sparkles className="h-4 w-4" /> The Character Foundry
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-300">
                      Create a consistent character ("Franchise Quality") from a{' '}
                      <strong>single image</strong>. We will generate 20+ variations (angles,
                      lighting, distances) to train a robust LoRA model automatically.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Left Col: Inputs */}
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-300">
                          Character Name
                        </label>
                        <input
                          type="text"
                          value={newJobName}
                          onChange={e => setNewJobName(e.target.value)}
                          placeholder="e.g. Cyberpunk Alice"
                          className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-300">
                          Trigger Word
                        </label>
                        <input
                          type="text"
                          value={triggerWord}
                          onChange={e => setTriggerWord(e.target.value)}
                          placeholder="e.g. ohwx_alice"
                          className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono outline-none focus:border-purple-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Unique identifier (e.g. ohwx_name)
                        </p>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-300">
                          Character Description (Optional)
                        </label>
                        <textarea
                          value={foundryPrompt}
                          onChange={e => setFoundryPrompt(e.target.value)}
                          placeholder="e.g. a woman with blue hair, leather jacket, scar on left cheek..."
                          className="h-24 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-300">
                          Pose Preset
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={selectedPreset}
                            onChange={e => setSelectedPreset(e.target.value)}
                            className="flex-1 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm outline-none focus:border-purple-500"
                          >
                            <optgroup label="Built-in Presets">
                              {posePresets
                                .filter(p => p.isBuiltIn !== false)
                                .map(preset => (
                                  <option key={preset.key} value={preset.key}>
                                    {preset.name}
                                  </option>
                                ))}
                            </optgroup>
                            {posePresets.some(p => p.isBuiltIn === false) && (
                              <optgroup label="Custom Presets">
                                {posePresets
                                  .filter(p => p.isBuiltIn === false)
                                  .map(preset => (
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
                            className="rounded-lg border border-purple-500/30 bg-purple-500/20 p-2 text-purple-400 transition-colors hover:bg-purple-500/30"
                            title="Create custom preset"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          {/* Edit button for custom presets */}
                          {!posePresets.find(p => p.key === selectedPreset)?.isBuiltIn &&
                            selectedPreset.startsWith('custom_') && (
                              <button
                                type="button"
                                onClick={() => {
                                  const preset = posePresets.find(p => p.key === selectedPreset);
                                  if (preset) openPresetEditor(preset);
                                }}
                                className="rounded-lg border border-blue-500/30 bg-blue-500/20 p-2 text-blue-400 transition-colors hover:bg-blue-500/30"
                                title="Edit preset"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {posePresets.find(p => p.key === selectedPreset)?.description ||
                            'Select poses appropriate for the character'}
                          {posePresets.find(p => p.key === selectedPreset)?.poses && (
                            <span className="ml-2 text-purple-400">
                              ({posePresets.find(p => p.key === selectedPreset)?.poses?.length}{' '}
                              poses)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right Col: Image Upload */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-300">
                        Source Image (The "Golden Record")
                      </label>
                      {/* Hidden file input - triggered programmatically for Electron compatibility */}
                      <input
                        ref={foundryInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => {
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
                        className="group relative flex min-h-[200px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 p-4 transition-colors hover:bg-white/5"
                      >
                        {foundryPreviewUrl ? (
                          <div className="relative flex h-full w-full flex-col items-center">
                            <img
                              src={foundryPreviewUrl}
                              className="mb-4 max-h-[250px] rounded-lg object-contain shadow-lg"
                            />
                            <div
                              onClick={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (foundryPreviewUrl) URL.revokeObjectURL(foundryPreviewUrl);
                                setFoundrySourceFile(null);
                                setFoundryPreviewUrl(null);
                              }}
                              className="absolute top-2 right-2 z-30 cursor-pointer rounded-full bg-red-500/80 p-1 text-white hover:bg-red-500"
                            >
                              <X className="h-4 w-4" />
                            </div>
                            <p className="flex items-center gap-1 text-xs text-green-400">
                              <Check className="h-3 w-3" /> Ready for Analysis
                            </p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="mx-auto mb-3 h-8 w-8 text-gray-500 transition-colors group-hover:text-purple-400" />
                            <p className="text-sm font-medium text-gray-300">Upload Source Image</p>
                            <p className="mt-1 text-xs text-gray-500">
                              Best quality, neutral lighting preferred
                            </p>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-white/10 pt-6">
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleFoundryGenerate}
                      disabled={isSubmitting || !foundrySourceFile || !newJobName}
                      className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 px-6 py-2 font-medium text-white shadow-lg shadow-purple-600/20 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
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
                    <label className="mb-3 block text-sm font-medium text-gray-300">
                      Training Provider
                    </label>
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setProvider('fal')}
                        className={clsx(
                          'flex items-center justify-between rounded-lg border p-3 text-left transition-all',
                          provider === 'fal'
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-white/10 hover:border-white/30'
                        )}
                      >
                        <span className="font-medium">Fal.ai</span>
                        {provider === 'fal' && <Check className="h-4 w-4 text-purple-400" />}
                      </button>
                      <button
                        onClick={() => setProvider('replicate')}
                        className={clsx(
                          'flex items-center justify-between rounded-lg border p-3 text-left transition-all',
                          provider === 'replicate'
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-white/10 hover:border-white/30'
                        )}
                      >
                        <span className="font-medium">Replicate</span>
                        {provider === 'replicate' && <Check className="h-4 w-4 text-purple-400" />}
                      </button>
                    </div>
                  </div>

                  {/* Base Model Selection (Adapter) */}
                  {provider === 'fal' && (
                    <div className="animate-in slide-in-from-top-2 mb-4">
                      <label className="mb-2 block text-xs font-medium text-gray-400">
                        Base Model Strategy
                      </label>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        <button
                          onClick={() => setBaseModel('fast')}
                          className={clsx(
                            'rounded-lg border p-2.5 text-left text-sm transition-all',
                            baseModel === 'fast'
                              ? 'border-purple-500 bg-purple-500/10 text-white'
                              : 'border-white/10 text-gray-400 hover:text-gray-300'
                          )}
                        >
                          <div className="font-medium">Flux Schnell (Fast)</div>
                          <div className="text-[10px] opacity-70">Lower cost, faster training</div>
                        </button>
                        <button
                          onClick={() => setBaseModel('dev')}
                          className={clsx(
                            'rounded-lg border p-2.5 text-left text-sm transition-all',
                            baseModel === 'dev'
                              ? 'border-purple-500 bg-purple-500/10 text-white'
                              : 'border-white/10 text-gray-400 hover:text-gray-300'
                          )}
                        >
                          <div className="font-medium">Flux Dev (Quality)</div>
                          <div className="text-[10px] opacity-70">
                            Higher quality, commercial restrictions
                          </div>
                        </button>
                        {/* NEW: Wan Video Trainer */}
                        <button
                          // @ts-ignore
                          onClick={() => setBaseModel('wan-video')}
                          className={clsx(
                            'rounded-lg border p-2.5 text-left text-sm transition-all',
                            // @ts-ignore
                            baseModel === 'wan-video'
                              ? 'border-pink-500 bg-pink-500/10 text-white'
                              : 'border-white/10 text-gray-400 hover:text-gray-300'
                          )}
                        >
                          <div className="flex items-center gap-1 font-medium">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-pink-500" />
                            Wan Video (Beta)
                          </div>
                          <div className="text-[10px] opacity-70">
                            Train for consistent video characters
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                  {provider === 'replicate' && (
                    <p className="mt-2 rounded border border-white/5 bg-white/5 p-2 text-xs text-gray-500">
                      Using <code>ostris/flux-dev-lora-trainer</code> (High Quality)
                    </p>
                  )}

                  {/* Training Type Selection */}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-gray-300">
                      Training Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setTrainingType('style')}
                        className={clsx(
                          'rounded-xl border-2 p-4 text-left transition-all',
                          trainingType === 'style'
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-white/10 hover:border-white/30'
                        )}
                      >
                        <Palette
                          className={clsx(
                            'mb-2 h-6 w-6',
                            trainingType === 'style' ? 'text-purple-400' : 'text-gray-400'
                          )}
                        />
                        <div className="font-medium">Style LoRA</div>
                        <p className="mt-1 text-xs text-gray-500">
                          Train artistic styles, aesthetics, color grading
                        </p>
                      </button>
                      <button
                        onClick={() => setTrainingType('character')}
                        className={clsx(
                          'rounded-xl border-2 p-4 text-left transition-all',
                          trainingType === 'character'
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-white/10 hover:border-white/30'
                        )}
                      >
                        <User
                          className={clsx(
                            'mb-2 h-6 w-6',
                            trainingType === 'character' ? 'text-purple-400' : 'text-gray-400'
                          )}
                        />
                        <div className="font-medium">Character LoRA</div>
                        <p className="mt-1 text-xs text-gray-500">
                          Train consistent faces, characters, objects
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Steps Indicator */}
                  <div className="mb-6 flex items-center gap-4 border-b border-white/10 pb-4">
                    <button
                      onClick={() => setUseSmartCuration(true)}
                      className={clsx(
                        'flex items-center gap-2 text-sm font-medium transition-colors',
                        useSmartCuration ? 'text-purple-400' : 'text-gray-500'
                      )}
                    >
                      <div
                        className={clsx(
                          'flex h-6 w-6 items-center justify-center rounded-full border text-xs',
                          useSmartCuration
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-gray-700 bg-gray-800'
                        )}
                      >
                        1
                      </div>
                      Dataset Curation
                    </button>
                    <div className="h-px w-8 bg-white/10" />
                    <button
                      onClick={() => setUseSmartCuration(false)}
                      className={clsx(
                        'flex items-center gap-2 text-sm font-medium transition-colors',
                        !useSmartCuration ? 'text-purple-400' : 'text-gray-500'
                      )}
                    >
                      <div
                        className={clsx(
                          'flex h-6 w-6 items-center justify-center rounded-full border text-xs',
                          !useSmartCuration
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-gray-700 bg-gray-800'
                        )}
                      >
                        2
                      </div>
                      Training Config
                    </button>
                  </div>

                  {/* STAGE 1: CURATION */}
                  {useSmartCuration && (
                    <div className="animate-in slide-in-from-left-4 space-y-6">
                      <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                        <h3 className="mb-1 flex items-center gap-2 font-medium text-blue-300">
                          <Sparkles className="h-4 w-4" /> Smart Curation
                        </h3>
                        <p className="text-sm text-blue-200/70">
                          Upload reference photos of your subject (the "Identity") and a bulk folder
                          of media. We will auto-crop, caption, and filter the best images into a{' '}
                          <strong>local curated folder</strong> for you to review.
                        </p>
                      </div>

                      {/* Reference Images */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          1. Reference Identity (3-5 Close-ups)
                        </label>
                        <div className="mb-2 flex gap-2">
                          {previewUrlsRef.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              className="h-12 w-12 rounded border border-white/20 object-cover"
                            />
                          ))}
                        </div>
                        <div className="relative cursor-pointer rounded-lg border border-dashed border-white/10 p-4 text-center transition-colors hover:bg-white/5">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleReferenceFileSelect}
                            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                          />
                          <p className="text-xs text-gray-400">Click to upload reference faces</p>
                        </div>
                      </div>

                      {/* Bulk Data */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          2. Bulk Data Source
                        </label>

                        {/* Local Path Input */}
                        <div className="mb-3">
                          <input
                            type="text"
                            value={datasetPath}
                            onChange={e => setDatasetPath(e.target.value)}
                            placeholder="/Users/username/photos/raw-footage"
                            className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 font-mono text-sm outline-none focus:border-purple-500"
                          />
                          <p className="mt-1 text-[10px] text-gray-500">
                            Found server-side folder path
                          </p>
                        </div>

                        <p className="my-2 text-center text-xs text-gray-500">- OR -</p>

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
                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-3 text-gray-300 transition-colors hover:bg-white/10"
                          >
                            <FileImage className="h-4 w-4" />
                            Select Folder from Computer
                          </label>
                          {selectedFiles.length > 0 && (
                            <p className="mt-2 text-center text-xs text-green-400">
                              {selectedFiles.length} files staged for upload
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Curation Action */}
                      <div className="flex items-center justify-between border-t border-white/10 pt-4">
                        <p className="text-xs text-gray-500">
                          Result will be saved to <code>datasets/job_[id]_curated</code>
                        </p>
                        <button
                          onClick={handleCreateJob}
                          disabled={isSubmitting || (selectedFiles.length === 0 && !datasetPath)}
                          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          Run Smart Curation
                        </button>
                      </div>

                      {/* Folder Link (After Curation) */}
                      {jobs.length > 0 && jobs[0].status === 'completed_curation' && (
                        <div className="animate-in slide-in-from-top-2 mt-4 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
                          <p className="mb-2 font-medium text-green-400">Curation Complete!</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenFolder(jobs[0].datasetUrl || datasetPath)}
                              className="flex items-center gap-2 rounded border border-green-500/30 bg-green-600/20 px-3 py-1.5 text-sm text-green-300 transition-colors hover:bg-green-600/30"
                            >
                              <FileImage className="h-4 w-4" />
                              Open Folder
                            </button>
                            <button
                              onClick={() => {
                                if (jobs[0].datasetUrl) setDatasetPath(jobs[0].datasetUrl);
                                setUseSmartCuration(false);
                              }}
                              className="rounded border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
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
                    <div className="animate-in slide-in-from-right-4 space-y-6">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300">Model Name</label>
                          <input
                            type="text"
                            value={newJobName}
                            onChange={e => setNewJobName(e.target.value)}
                            placeholder="e.g. My Style"
                            className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 outline-none focus:border-purple-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300">Trigger Word</label>
                          <input
                            type="text"
                            value={triggerWord}
                            onChange={e => setTriggerWord(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 font-mono outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      {/* Provider / Model */}
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <label className="mb-3 block text-sm font-medium text-gray-300">
                          Provider Strategy
                        </label>
                        <div className="flex gap-4">
                          <button
                            onClick={() => setProvider('fal')}
                            className={clsx(
                              'flex-1 rounded-lg border p-3 text-left',
                              provider === 'fal'
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-white/10'
                            )}
                          >
                            <div className="font-medium">Fal.ai (Flux)</div>
                            <div className="text-xs text-gray-500">Fast, Cost-effective</div>
                          </button>
                          <button
                            onClick={() => setProvider('replicate')}
                            className={clsx(
                              'flex-1 rounded-lg border p-3 text-left',
                              provider === 'replicate'
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-white/10'
                            )}
                          >
                            <div className="font-medium">Replicate (Ostris)</div>
                            <div className="text-xs text-gray-500">High Quality</div>
                          </button>
                        </div>
                      </div>

                      {/* Dataset Source */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          Training Dataset Path
                        </label>
                        <input
                          type="text"
                          value={datasetPath}
                          onChange={e => setDatasetPath(e.target.value)}
                          placeholder="Path to curated folder..."
                          className="mb-2 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 font-mono text-sm outline-none focus:border-purple-500"
                        />
                        <p className="text-xs text-gray-500">
                          If you just ran Curation (Step 1), this path is likely{' '}
                          <code>.../datasets/job_[id]_curated</code>
                        </p>
                      </div>

                      {/* Action */}
                      <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                        <button
                          onClick={resetForm}
                          className="px-4 py-2 text-gray-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateJob}
                          disabled={isSubmitting || !datasetPath || !newJobName}
                          className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2 text-white shadow-lg shadow-purple-600/20 hover:bg-purple-500 disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
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
          <h3 className="text-sm font-medium tracking-wider text-gray-400 uppercase">
            Training History
          </h3>

          {isLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-purple-400" />
              <p className="text-gray-500">Loading training jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 py-16 text-center">
              <FileImage className="mx-auto mb-4 h-12 w-12 text-gray-600" />
              <p className="font-medium text-gray-400">No training jobs yet</p>
              <p className="mt-1 text-sm text-gray-500">Create your first custom LoRA model</p>
              <button
                onClick={() => setIsCreating(true)}
                className="mt-4 text-sm font-medium text-purple-400 hover:text-purple-300"
              >
                + Create Training Job
              </button>
            </div>
          ) : (
            jobs.map(job => (
              <div
                key={job.id}
                className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] transition-colors hover:border-white/20"
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={clsx(
                        'flex h-12 w-12 items-center justify-center rounded-xl border',
                        getStatusColor(job.status)
                      )}
                    >
                      {job.status === 'completed' ? (
                        <Check className="h-6 w-6" />
                      ) : job.status === 'failed' ? (
                        <AlertCircle className="h-6 w-6" />
                      ) : job.status === 'training' ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : job.status === 'processing_dataset' ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : job.status === 'generated_dataset' ? (
                        <FileImage className="h-6 w-6" />
                      ) : (
                        <Upload className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="flex items-center gap-2 font-medium text-white">
                        {job.name}
                        {job.isStyle === false && (
                          <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-300">
                            Character
                          </span>
                        )}
                      </h3>
                      <div className="mt-0.5 flex items-center gap-3 text-sm text-gray-400">
                        <span>
                          Trigger:{' '}
                          <code className="rounded bg-purple-500/10 px-1 text-purple-400">
                            {job.triggerWord}
                          </code>
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(job.createdAt)}
                        </span>
                        {/* Provider Badge */}
                        <span className="rounded border border-white/5 bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400 uppercase">
                          {(job as any).provider || 'fal'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div
                      className={clsx(
                        'rounded-full border px-3 py-1 text-xs font-medium capitalize',
                        getStatusColor(job.status)
                      )}
                    >
                      {job.status}
                    </div>

                    {job.status === 'completed' && job.loraUrl && (
                      <a
                        href={job.loraUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-green-500/30 bg-green-500/10 p-2 text-green-400 transition-colors hover:bg-green-500/20"
                        title="Download LoRA"
                      >
                        <Download className="h-5 w-5" />
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
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
                      >
                        Continue to Training &rarr;
                      </button>
                    )}

                    <button
                      onClick={e => handleDeleteJob(job.id, e)}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20"
                      title="Delete Job"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {job.error && (
                  <div className="px-4 pb-4">
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                        <div className="flex-1">
                          <h4 className="mb-1 font-medium text-red-300">Training Failed</h4>
                          <p className="mb-3 text-sm text-red-200/80">{job.error}</p>

                          {/* Actionable suggestions based on error type */}
                          <div className="mt-2 space-y-1.5 border-t border-red-500/20 pt-3 text-xs text-gray-400">
                            <p className="font-medium text-gray-300">To fix this issue:</p>
                            <ul className="ml-1 list-inside list-disc space-y-1">
                              {job.error.includes('format') ||
                              job.error.includes('octet') ||
                              job.error.includes('archive') ? (
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
                              className="mt-3 flex items-center gap-2 rounded border border-red-500/30 bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/30"
                            >
                              <Play className="h-3 w-3" />
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
                    <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-3">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-purple-300">Generating character variations...</span>
                        <span className="text-gray-400">~2-5 min remaining</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-purple-500/20">
                        <div
                          className="h-full animate-pulse rounded-full bg-purple-500"
                          style={{ width: '40%' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Training Progress (for active jobs) */}
                {job.status === 'training' && (
                  <div className="px-4 pb-4">
                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-blue-300">Training in progress...</span>
                        <span className="text-gray-400">~10-20 min remaining</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-500/20">
                        <div
                          className="h-full animate-pulse rounded-full bg-blue-500"
                          style={{ width: '60%' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Dataset Review Panel */}
                {job.status === 'generated_dataset' && job.datasetUrl && (
                  <div className="animate-in fade-in slide-in-from-top-2 px-4 pb-4">
                    <div className="my-4 border-t border-white/10"></div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-purple-500/5 p-4">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Settings2 className="h-5 w-5 text-purple-400" />
                {editingPreset ? 'Edit Custom Preset' : 'Create Custom Preset'}
              </h2>
              <button onClick={closePresetEditor} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">
                    Preset Name *
                  </label>
                  <input
                    type="text"
                    value={presetName}
                    onChange={e => setPresetName(e.target.value)}
                    placeholder="e.g. Mermaid, Wheelchair User, Robot"
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">
                    Style Prefix (Optional)
                  </label>
                  <input
                    type="text"
                    value={presetStylePrefix}
                    onChange={e => setPresetStylePrefix(e.target.value)}
                    placeholder="e.g. anime style, cartoon style"
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 outline-none focus:border-purple-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Prepended to all prompts for style consistency
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">Description</label>
                <input
                  type="text"
                  value={presetDescription}
                  onChange={e => setPresetDescription(e.target.value)}
                  placeholder="Short description of when to use this preset"
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 outline-none focus:border-purple-500"
                />
              </div>

              {/* Poses List */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Poses ({presetPoses.length}) *
                </label>
                <div className="mb-3 max-h-[200px] overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-3">
                  {presetPoses.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500">
                      No poses added yet. Add poses below.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {presetPoses.map((pose, index) => (
                        <div key={index} className="group flex items-center gap-2">
                          <span className="w-6 text-xs text-gray-500">{index + 1}.</span>
                          <span className="flex-1 truncate text-sm text-gray-300">{pose}</span>
                          <button
                            type="button"
                            onClick={() => removePoseFromList(index)}
                            className="rounded p-1 text-red-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/20"
                          >
                            <X className="h-3 w-3" />
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
                    onChange={e => setNewPose(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addPoseToList();
                      }
                    }}
                    placeholder="e.g. front view, facing camera directly, standing"
                    className="flex-1 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={addPoseToList}
                    disabled={!newPose.trim()}
                    className="flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/20 px-4 py-2 text-purple-400 transition-colors hover:bg-purple-500/30 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Tip: Be specific about angles and framing. Use "close-up" or "medium shot" for
                  automatic aspect ratio selection.
                </p>
              </div>

              {/* Quick Add Templates */}
              <div className="border-t border-white/10 pt-4">
                <label className="mb-2 block text-xs font-medium text-gray-400">
                  Quick Add Common Poses
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'front view, facing camera directly, standing',
                    'three-quarter view, body angled, standing',
                    'side profile, standing',
                    'close-up portrait, head and shoulders only',
                    'medium shot cropped at waist',
                    'full body shot, standing',
                    'arms crossed, front view',
                    'sitting casually, three-quarter view',
                  ].map(pose => (
                    <button
                      key={pose}
                      type="button"
                      onClick={() => {
                        if (!presetPoses.includes(pose)) {
                          setPresetPoses(prev => [...prev, pose]);
                        }
                      }}
                      disabled={presetPoses.includes(pose)}
                      className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      + {pose.split(',')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/10 p-4">
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
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" /> Delete Preset
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closePresetEditor}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCustomPreset}
                  disabled={!presetName.trim() || presetPoses.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2 text-white shadow-lg shadow-purple-600/20 hover:bg-purple-500 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {editingPreset ? 'Update Preset' : 'Create Preset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
