'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Package,
  Image as ImageIcon,
  Search,
  Wand2,
  Box,
  Palette,
  Sun,
  Loader2,
  Download,
  ExternalLink,
  Scissors,
  Upload,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Tooltip } from '@/components/ui/Tooltip';
import { usePropBinStore, Prop, PROP_CATEGORIES } from '@/lib/propBinStore';
import { useParams } from 'next/navigation';

interface PropBinPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type PropCategory = keyof typeof PROP_CATEGORIES | 'all';
type ViewMode = 'list' | 'inspector';

// Material Analysis from backend
interface MaterialAnalysis {
  dominantColors: Array<{ hex: string; percentage: number }>;
  reflectivity: 'matte' | 'satin' | 'glossy' | 'metallic' | 'glass';
  transparency: 'opaque' | 'translucent' | 'transparent';
  texture: 'smooth' | 'rough' | 'patterned' | 'organic';
  suggestedLighting: string[];
}

// Extended Prop from database
interface ExtractedProp extends Prop {
  extractedUrl?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  edgeQuality?: number;
  materialAnalysis?: MaterialAnalysis;
  proxy3dUrl?: string;
  proxy3dStatus?: 'none' | 'generating' | 'complete' | 'failed';
  usageCount?: number;
}

export function PropBinPanel({ isOpen, onClose }: PropBinPanelProps) {
  const { id: projectId } = useParams();
  const { props, addProp, updateProp, deleteProp } = usePropBinStore();
  const [editingProp, setEditingProp] = useState<Prop | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<PropCategory>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProp, setSelectedProp] = useState<ExtractedProp | null>(null);

  // Extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractUrl, setExtractUrl] = useState('');
  const [generating3D, setGenerating3D] = useState<string | null>(null);
  const [extractionTab, setExtractionTab] = useState<'url' | 'upload' | 'generation'>('url');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Generation picker state
  const [generations, setGenerations] = useState<
    Array<{ id: string; outputUrl: string; prompt?: string }>
  >([]);
  const [loadingGenerations, setLoadingGenerations] = useState(false);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);

  // Database props (from backend)
  const [dbProps, setDbProps] = useState<ExtractedProp[]>([]);
  const [loadingDbProps, setLoadingDbProps] = useState(false);

  // New prop form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<Prop['category']>('custom');
  const [newTags, setNewTags] = useState('');

  // Load props from database
  const loadDbProps = useCallback(async () => {
    if (!projectId) return;
    setLoadingDbProps(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/props`);
      if (res.ok) {
        const data = await res.json();
        setDbProps(data.props || []);
      }
    } catch (err) {
      console.error('Failed to load props:', err);
    } finally {
      setLoadingDbProps(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen && projectId) {
      loadDbProps();
    }
  }, [isOpen, projectId, loadDbProps]);

  // Combine local props with database props
  const allProps = [...props, ...dbProps.filter(dp => !props.some(p => p.id === dp.id))];

  const filteredProps = allProps.filter(prop => {
    const matchesSearch =
      prop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || prop.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreate = () => {
    if (!newName.trim() || !newDescription.trim()) return;

    addProp({
      name: newName.trim().replace(/\s+/g, ''),
      description: newDescription.trim(),
      category: newCategory,
      tags: newTags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
    });

    setNewName('');
    setNewDescription('');
    setNewCategory('custom');
    setNewTags('');
    setIsCreating(false);
  };

  const handleUpdate = () => {
    if (!editingProp) return;

    updateProp(editingProp.id, {
      name: editingProp.name.trim().replace(/\s+/g, ''),
      description: editingProp.description.trim(),
      category: editingProp.category,
      tags: editingProp.tags,
    });

    setEditingProp(null);
  };

  const handleCopyToClipboard = (propName: string) => {
    navigator.clipboard.writeText(`#${propName}`);
  };

  // Extract prop from URL
  const handleExtract = async () => {
    if (!extractUrl.trim() || !projectId) return;

    setIsExtracting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/props/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: extractUrl,
          sourceType: 'url',
          category: 'object',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        await loadDbProps();
        setExtractUrl('');
        // Show the new prop in inspector
        if (data.prop) {
          setSelectedProp(data.prop);
          setViewMode('inspector');
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Extraction failed');
      }
    } catch (err) {
      console.error('Extract error:', err);
      alert('Extraction failed');
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle file upload extraction
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleExtractFromUpload = async () => {
    if (!uploadFile || !projectId) return;

    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append('image', uploadFile);
      formData.append('sourceType', 'upload');
      formData.append('category', 'object');

      const res = await fetch(`/api/projects/${projectId}/props/extract-upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        await loadDbProps();
        setUploadFile(null);
        setUploadPreview(null);
        if (data.prop) {
          setSelectedProp(data.prop);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Extraction failed');
      }
    } catch (err) {
      console.error('Upload extract error:', err);
      alert('Extraction failed');
    } finally {
      setIsExtracting(false);
    }
  };

  // Load generations for picker
  const loadGenerations = useCallback(async () => {
    if (!projectId) return;
    setLoadingGenerations(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generations?limit=50`);
      if (res.ok) {
        const data = await res.json();
        // Filter to only images with outputUrl
        const imageGens = (data.generations || []).filter(
          (g: { outputUrl?: string; mode?: string }) =>
            g.outputUrl && (!g.mode || g.mode === 'text_to_image' || g.mode === 'image_to_image')
        );
        setGenerations(imageGens);
      }
    } catch (err) {
      console.error('Failed to load generations:', err);
    } finally {
      setLoadingGenerations(false);
    }
  }, [projectId]);

  // Load generations when tab changes
  useEffect(() => {
    if (extractionTab === 'generation' && generations.length === 0) {
      loadGenerations();
    }
  }, [extractionTab, generations.length, loadGenerations]);

  const handleExtractFromGeneration = async () => {
    if (!selectedGenerationId || !projectId) return;

    const gen = generations.find(g => g.id === selectedGenerationId);
    if (!gen?.outputUrl) return;

    setIsExtracting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/props/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: gen.outputUrl,
          sourceType: 'generation',
          sourceId: gen.id,
          category: 'object',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        await loadDbProps();
        setSelectedGenerationId(null);
        if (data.prop) {
          setSelectedProp(data.prop);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Extraction failed');
      }
    } catch (err) {
      console.error('Generation extract error:', err);
      alert('Extraction failed');
    } finally {
      setIsExtracting(false);
    }
  };

  // Generate 3D proxy
  const handleGenerate3D = async (propId: string) => {
    if (!projectId) return;
    setGenerating3D(propId);

    try {
      const res = await fetch(`/api/projects/${projectId}/props/${propId}/generate-3d`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'triposr' }),
      });

      if (res.ok) {
        await loadDbProps();
        // Update selected prop if viewing it
        if (selectedProp?.id === propId) {
          const updated = dbProps.find(p => p.id === propId);
          if (updated) setSelectedProp(updated);
        }
      }
    } catch (err) {
      console.error('3D generation error:', err);
    } finally {
      setGenerating3D(null);
    }
  };

  // Material Inspector Component
  const MaterialInspector = ({ prop }: { prop: ExtractedProp }) => {
    const analysis = prop.materialAnalysis;

    return (
      <div className="space-y-4">
        {/* Preview Image */}
        {prop.extractedUrl && (
          <div className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/50">
            <img src={prop.extractedUrl} alt={prop.name} className="h-full w-full object-contain" />
            {/* Checkerboard background for transparency */}
            <div
              className="absolute inset-0 -z-10"
              style={{
                backgroundImage: `
                  linear-gradient(45deg, #333 25%, transparent 25%),
                  linear-gradient(-45deg, #333 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #333 75%),
                  linear-gradient(-45deg, transparent 75%, #333 75%)
                `,
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
              }}
            />
          </div>
        )}

        {/* Dimensions & Quality */}
        <div className="flex gap-2">
          {prop.width && prop.height && (
            <div className="flex-1 rounded-lg border border-white/10 bg-black/30 p-2 text-center">
              <div className="text-xs text-gray-500">Dimensions</div>
              <div className="text-sm font-medium text-white">
                {prop.width} × {prop.height}
              </div>
            </div>
          )}
          {prop.edgeQuality !== undefined && (
            <div className="flex-1 rounded-lg border border-white/10 bg-black/30 p-2 text-center">
              <div className="text-xs text-gray-500">Edge Quality</div>
              <div
                className={clsx(
                  'text-sm font-medium',
                  prop.edgeQuality > 0.7
                    ? 'text-green-400'
                    : prop.edgeQuality > 0.4
                      ? 'text-amber-400'
                      : 'text-red-400'
                )}
              >
                {Math.round(prop.edgeQuality * 100)}%
              </div>
            </div>
          )}
        </div>

        {/* Color Palette */}
        {analysis?.dominantColors && analysis.dominantColors.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-black/30 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
              <Palette className="h-4 w-4" />
              <span>Dominant Colors</span>
            </div>
            <div className="flex gap-1">
              {analysis.dominantColors.map((color, i) => (
                <Tooltip key={i} content={`${color.hex} (${color.percentage}%)`} side="top">
                  <div
                    className="h-8 flex-1 cursor-pointer rounded transition-transform hover:scale-105"
                    style={{ backgroundColor: color.hex }}
                    onClick={() => navigator.clipboard.writeText(color.hex)}
                  />
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {/* Material Properties */}
        {analysis && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-white/10 bg-black/30 p-2">
              <div className="text-xs text-gray-500">Reflectivity</div>
              <div className="text-sm font-medium text-white capitalize">
                {analysis.reflectivity}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-2">
              <div className="text-xs text-gray-500">Transparency</div>
              <div className="text-sm font-medium text-white capitalize">
                {analysis.transparency}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-2">
              <div className="text-xs text-gray-500">Texture</div>
              <div className="text-sm font-medium text-white capitalize">{analysis.texture}</div>
            </div>
            {prop.usageCount !== undefined && (
              <div className="rounded-lg border border-white/10 bg-black/30 p-2">
                <div className="text-xs text-gray-500">Usage Count</div>
                <div className="text-sm font-medium text-white">{prop.usageCount}</div>
              </div>
            )}
          </div>
        )}

        {/* Lighting Suggestions */}
        {analysis?.suggestedLighting && analysis.suggestedLighting.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-black/30 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
              <Sun className="h-4 w-4" />
              <span>Suggested Lighting</span>
            </div>
            <ul className="space-y-1 text-xs text-gray-300">
              {analysis.suggestedLighting.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-400">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 3D Proxy Section */}
        <div className="rounded-lg border border-white/10 bg-black/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Box className="h-4 w-4" />
              <span>3D Proxy</span>
            </div>
            {prop.proxy3dStatus === 'complete' && prop.proxy3dUrl && (
              <a
                href={prop.proxy3dUrl}
                download
                className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
              >
                <Download className="inline-block h-3 w-3" /> GLB
              </a>
            )}
          </div>

          {prop.proxy3dStatus === 'none' || !prop.proxy3dStatus ? (
            <button
              onClick={() => handleGenerate3D(prop.id)}
              disabled={generating3D === prop.id}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-purple-500/20 text-purple-300 transition-colors hover:bg-purple-500/30 disabled:opacity-50"
            >
              {generating3D === prop.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Box className="h-4 w-4" />
                  <span>Generate 3D Proxy (TripoSR)</span>
                </>
              )}
            </button>
          ) : prop.proxy3dStatus === 'generating' ? (
            <div className="flex h-10 items-center justify-center gap-2 text-purple-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>3D proxy generating...</span>
            </div>
          ) : prop.proxy3dStatus === 'complete' ? (
            <div className="text-center text-sm text-green-400">3D proxy ready</div>
          ) : (
            <div className="text-center text-sm text-red-400">Generation failed</div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedProp(null);
              setViewMode('list');
            }}
            className="h-10 flex-1 rounded-lg bg-white/5 text-gray-400 transition-colors hover:bg-white/10"
          >
            Back to List
          </button>
          <button
            onClick={() => handleCopyToClipboard(prop.name)}
            className="h-10 flex-1 rounded-lg bg-amber-500/20 text-amber-300 transition-colors hover:bg-amber-500/30"
          >
            Copy #{prop.name}
          </button>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="fixed top-20 right-4 z-50 flex max-h-[85vh] w-[440px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">
                {viewMode === 'inspector' ? 'Material Inspector' : 'Prop Bin'}
              </h2>
              {viewMode === 'list' && (
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-500">
                  #PropName
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {viewMode === 'list' && (
                <Tooltip content="Extract from Image" side="left">
                  <button
                    onClick={() => setViewMode('inspector')}
                    className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                  >
                    <Scissors className="h-4 w-4 text-purple-400" />
                  </button>
                </Tooltip>
              )}
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {viewMode === 'inspector' && selectedProp ? (
            /* Material Inspector View */
            <div className="flex-1 overflow-y-auto p-4">
              <MaterialInspector prop={selectedProp as ExtractedProp} />
            </div>
          ) : viewMode === 'inspector' ? (
            /* Extraction View with Tabs */
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {/* Tab Selector */}
              <div className="flex gap-1 rounded-lg bg-black/30 p-1">
                <button
                  onClick={() => setExtractionTab('url')}
                  className={clsx(
                    'flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                    extractionTab === 'url'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  <ExternalLink className="mx-auto mb-1 h-4 w-4" />
                  URL
                </button>
                <button
                  onClick={() => setExtractionTab('upload')}
                  className={clsx(
                    'flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                    extractionTab === 'upload'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  <Upload className="mx-auto mb-1 h-4 w-4" />
                  Upload
                </button>
                <button
                  onClick={() => setExtractionTab('generation')}
                  className={clsx(
                    'flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                    extractionTab === 'generation'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  <Wand2 className="mx-auto mb-1 h-4 w-4" />
                  Generation
                </button>
              </div>

              {/* URL Tab */}
              {extractionTab === 'url' && (
                <div className="rounded-xl border border-dashed border-white/20 bg-black/30 p-6 text-center">
                  <ExternalLink className="mx-auto mb-3 h-8 w-8 text-purple-400" />
                  <h3 className="mb-2 font-medium text-white">Paste Image URL</h3>
                  <p className="mb-4 text-xs text-gray-500">
                    Extract from any publicly accessible image URL
                  </p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={extractUrl}
                      onChange={e => setExtractUrl(e.target.value)}
                      placeholder="https://example.com/image.png"
                      className="h-10 w-full rounded-lg border border-white/10 bg-black/50 px-3 text-sm text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none"
                    />
                    <button
                      onClick={handleExtract}
                      disabled={!extractUrl.trim() || isExtracting}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-purple-500/20 text-purple-300 transition-colors hover:bg-purple-500/30 disabled:opacity-50"
                    >
                      {isExtracting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Extracting...</span>
                        </>
                      ) : (
                        <>
                          <Scissors className="h-4 w-4" />
                          <span>Extract & Analyze</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Tab */}
              {extractionTab === 'upload' && (
                <div className="rounded-xl border border-dashed border-white/20 bg-black/30 p-6 text-center">
                  {uploadPreview ? (
                    <>
                      <div className="relative mx-auto mb-4 aspect-square w-48 overflow-hidden rounded-lg border border-white/10">
                        <img
                          src={uploadPreview}
                          alt="Upload preview"
                          className="h-full w-full object-contain"
                        />
                        <button
                          onClick={() => {
                            setUploadPreview(null);
                            setUploadFile(null);
                          }}
                          className="absolute top-2 right-2 rounded-full bg-black/60 p-1 hover:bg-black/80"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                      <button
                        onClick={handleExtractFromUpload}
                        disabled={isExtracting}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-purple-500/20 text-purple-300 transition-colors hover:bg-purple-500/30 disabled:opacity-50"
                      >
                        {isExtracting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Extracting...</span>
                          </>
                        ) : (
                          <>
                            <Scissors className="h-4 w-4" />
                            <span>Extract & Analyze</span>
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="mx-auto mb-3 h-8 w-8 text-purple-400" />
                      <h3 className="mb-2 font-medium text-white">Upload Image</h3>
                      <p className="mb-4 text-xs text-gray-500">
                        Drag & drop or click to select an image file
                      </p>
                      <label className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-purple-500/20 text-purple-300 transition-colors hover:bg-purple-500/30">
                        <Upload className="h-4 w-4" />
                        <span>Choose File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </>
                  )}
                </div>
              )}

              {/* Generation Tab */}
              {extractionTab === 'generation' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white">Select a Generation</h3>
                    <button
                      onClick={loadGenerations}
                      disabled={loadingGenerations}
                      className="rounded-md px-2 py-1 text-xs text-gray-400 hover:text-white"
                    >
                      {loadingGenerations ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>

                  {loadingGenerations ? (
                    <div className="flex h-40 items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                    </div>
                  ) : generations.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/20 bg-black/30 p-6 text-center">
                      <ImageIcon className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                      <p className="text-sm text-gray-500">No generations found</p>
                      <p className="text-xs text-gray-600">Generate some images first</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid max-h-60 grid-cols-3 gap-2 overflow-y-auto">
                        {generations.map(gen => (
                          <button
                            key={gen.id}
                            onClick={() => setSelectedGenerationId(gen.id)}
                            className={clsx(
                              'group relative aspect-square overflow-hidden rounded-lg border-2 transition-all',
                              selectedGenerationId === gen.id
                                ? 'border-purple-500 ring-2 ring-purple-500/30'
                                : 'border-white/10 hover:border-white/30'
                            )}
                          >
                            <img
                              src={gen.outputUrl}
                              alt="Generation"
                              className="h-full w-full object-cover"
                            />
                            {selectedGenerationId === gen.id && (
                              <div className="absolute inset-0 flex items-center justify-center bg-purple-500/20">
                                <div className="rounded-full bg-purple-500 p-1">
                                  <Scissors className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={handleExtractFromGeneration}
                        disabled={!selectedGenerationId || isExtracting}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-purple-500/20 text-purple-300 transition-colors hover:bg-purple-500/30 disabled:opacity-50"
                      >
                        {isExtracting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Extracting...</span>
                          </>
                        ) : (
                          <>
                            <Scissors className="h-4 w-4" />
                            <span>Extract Selected</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Extracted Props Preview */}
              {dbProps.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-gray-400">Recent Extractions</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {dbProps.slice(0, 6).map(prop => (
                      <button
                        key={prop.id}
                        onClick={() => {
                          setSelectedProp(prop);
                        }}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-black/50 transition-colors hover:border-white/30"
                      >
                        {prop.thumbnailUrl || prop.extractedUrl ? (
                          <img
                            src={prop.thumbnailUrl || prop.extractedUrl}
                            alt={prop.name}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <ImageIcon className="absolute top-1/2 left-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-gray-600" />
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <div className="truncate text-[10px] text-white">{prop.name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setViewMode('list')}
                className="h-10 w-full rounded-lg bg-white/5 text-gray-400 transition-colors hover:bg-white/10"
              >
                Back to Prop List
              </button>
            </div>
          ) : (
            /* List View */
            <>
              {/* Search & Filter */}
              <div className="space-y-2 border-b border-white/10 p-3">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search props..."
                    className="h-9 w-full rounded-lg border border-white/10 bg-black/30 pr-4 pl-10 text-sm text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setFilterCategory('all')}
                    className={clsx(
                      'rounded-md px-2 py-1 text-xs transition-colors',
                      filterCategory === 'all'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    )}
                  >
                    All
                  </button>
                  {Object.entries(PROP_CATEGORIES).map(([key, { label, icon }]) => (
                    <button
                      key={key}
                      onClick={() => setFilterCategory(key as PropCategory)}
                      className={clsx(
                        'flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
                        filterCategory === key
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      )}
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Props List */}
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {loadingDbProps ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                  </div>
                ) : filteredProps.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500">
                    {searchQuery ? 'No props match your search' : 'No props yet. Create one!'}
                  </div>
                ) : (
                  filteredProps.map(prop => (
                    <div
                      key={prop.id}
                      className="group rounded-lg border border-white/10 bg-black/30 p-3 transition-colors hover:border-white/20"
                    >
                      {editingProp?.id === prop.id ? (
                        // Editing Mode
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingProp.name}
                            onChange={e => setEditingProp({ ...editingProp, name: e.target.value })}
                            className="h-8 w-full rounded border border-amber-500/30 bg-black/50 px-2 text-sm text-white focus:outline-none"
                            placeholder="PropName (no spaces)"
                          />
                          <textarea
                            value={editingProp.description}
                            onChange={e =>
                              setEditingProp({ ...editingProp, description: e.target.value })
                            }
                            className="h-20 w-full resize-none rounded border border-white/10 bg-black/50 px-2 py-1 text-xs text-white focus:border-amber-500/30 focus:outline-none"
                            placeholder="Detailed prompt description..."
                          />
                          <select
                            value={editingProp.category || 'custom'}
                            onChange={e =>
                              setEditingProp({
                                ...editingProp,
                                category: e.target.value as Prop['category'],
                              })
                            }
                            className="h-8 w-full rounded border border-white/10 bg-black/50 px-2 text-xs text-white focus:outline-none"
                          >
                            {Object.entries(PROP_CATEGORIES).map(([key, { label }]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={handleUpdate}
                              className="h-8 flex-1 rounded bg-amber-500/20 text-xs text-amber-300 transition-colors hover:bg-amber-500/30"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingProp(null)}
                              className="h-8 flex-1 rounded bg-white/5 text-xs text-gray-400 transition-colors hover:bg-white/10"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Display Mode
                        <div className="flex gap-3">
                          {/* Thumbnail */}
                          {(prop as ExtractedProp).thumbnailUrl ||
                          (prop as ExtractedProp).extractedUrl ? (
                            <button
                              onClick={() => {
                                setSelectedProp(prop as ExtractedProp);
                                setViewMode('inspector');
                              }}
                              className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/50"
                            >
                              <img
                                src={
                                  (prop as ExtractedProp).thumbnailUrl ||
                                  (prop as ExtractedProp).extractedUrl
                                }
                                alt={prop.name}
                                className="h-full w-full object-contain"
                              />
                            </button>
                          ) : null}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Tooltip content="Click to copy" side="top">
                                  <button
                                    onClick={() => handleCopyToClipboard(prop.name)}
                                    className="font-mono text-sm text-amber-400 transition-colors hover:text-amber-300"
                                  >
                                    #{prop.name}
                                  </button>
                                </Tooltip>
                                {prop.category && PROP_CATEGORIES[prop.category] && (
                                  <span className="text-xs opacity-60">
                                    {PROP_CATEGORIES[prop.category].icon}
                                  </span>
                                )}
                                {(prop as ExtractedProp).proxy3dStatus === 'complete' && (
                                  <Box className="h-3 w-3 text-purple-400" />
                                )}
                              </div>
                              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                {(prop as ExtractedProp).extractedUrl && (
                                  <Tooltip content="Inspect Materials" side="top">
                                    <button
                                      onClick={() => {
                                        setSelectedProp(prop as ExtractedProp);
                                        setViewMode('inspector');
                                      }}
                                      className="rounded p-1.5 transition-colors hover:bg-white/10"
                                    >
                                      <Palette className="h-3.5 w-3.5 text-purple-400" />
                                    </button>
                                  </Tooltip>
                                )}
                                <Tooltip content="Edit" side="top">
                                  <button
                                    onClick={() => setEditingProp(prop)}
                                    className="rounded p-1.5 transition-colors hover:bg-white/10"
                                  >
                                    <Edit2 className="h-3.5 w-3.5 text-gray-400" />
                                  </button>
                                </Tooltip>
                                <Tooltip content="Delete" side="top">
                                  <button
                                    onClick={() => deleteProp(prop.id)}
                                    className="rounded p-1.5 transition-colors hover:bg-red-500/20"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                  </button>
                                </Tooltip>
                              </div>
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-gray-400">
                              {prop.description}
                            </p>
                            {prop.tags && prop.tags.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {prop.tags.map((tag, i) => (
                                  <span
                                    key={i}
                                    className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-gray-500"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Create New Prop */}
              <div className="border-t border-white/10 p-3">
                {isCreating ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value.replace(/\s+/g, ''))}
                      placeholder="PropName (no spaces)"
                      className="h-9 w-full rounded-lg border border-amber-500/30 bg-black/30 px-3 text-sm text-white placeholder-gray-500 focus:outline-none"
                    />
                    <textarea
                      value={newDescription}
                      onChange={e => setNewDescription(e.target.value)}
                      placeholder="Detailed prompt description (e.g., 'vintage rotary telephone, cherry red bakelite, brass dial')"
                      className="h-24 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-amber-500/30 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <select
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value as Prop['category'])}
                        className="h-9 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-white focus:outline-none"
                      >
                        {Object.entries(PROP_CATEGORIES).map(([key, { label, icon }]) => (
                          <option key={key} value={key}>
                            {icon} {label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={newTags}
                        onChange={e => setNewTags(e.target.value)}
                        placeholder="Tags (comma-separated)"
                        className="h-9 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-white placeholder-gray-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreate}
                        disabled={!newName.trim() || !newDescription.trim()}
                        className="h-10 flex-1 rounded-lg bg-amber-500/20 font-medium text-amber-300 transition-colors hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Create Prop
                      </button>
                      <button
                        onClick={() => {
                          setIsCreating(false);
                          setNewName('');
                          setNewDescription('');
                          setNewTags('');
                        }}
                        className="h-10 rounded-lg bg-white/5 px-4 text-gray-400 transition-colors hover:bg-white/10"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsCreating(true)}
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500/10 font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Prop</span>
                    </button>
                    <button
                      onClick={() => setViewMode('inspector')}
                      className="flex h-10 items-center justify-center gap-2 rounded-lg bg-purple-500/10 px-4 font-medium text-purple-400 transition-colors hover:bg-purple-500/20"
                    >
                      <Scissors className="h-4 w-4" />
                      <span>Extract</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Usage Hint */}
              <div className="px-3 pb-3">
                <div className="rounded-lg border border-amber-500/10 bg-amber-500/5 p-2 text-[10px] text-amber-400/70">
                  <strong>Usage:</strong> Type{' '}
                  <code className="rounded bg-black/30 px-1">#PropName</code> in your prompt. It
                  will expand to the full description when generating.
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
