'use client';

/**
 * Director's Viewfinder Page
 *
 * Professional viewfinder with:
 * - Interactive DOF simulator
 * - Live composite overlay
 * - AR preview mode
 * - Framing guides
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera,
    Image,
    Layers,
    Plus,
    RefreshCw,
    Save,
    Trash2,
    Upload,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Tooltip } from '@/components/ui/Tooltip';
import { DirectorViewfinder } from '@/components/viewfinder';

// ============================================================================
// TYPES
// ============================================================================

interface ViewfinderElement {
    id: string;
    name: string;
    imageUrl: string;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
    locked?: boolean;
}

interface Generation {
    id: string;
    inputPrompt: string;
    outputs: string | { url?: string; type?: string }[] | null;
    status: string;
}

interface Element {
    id: string;
    name: string;
    type: string;
    url?: string;
    fileUrl?: string;
    thumbnail?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ViewfinderPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    // State
    const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
    const [viewfinderElements, setViewfinderElements] = useState<ViewfinderElement[]>([]);
    const [generations, setGenerations] = useState<Generation[]>([]);
    const [elements, setElements] = useState<Element[]>([]);
    const [captures, setCaptures] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activePanel, setActivePanel] = useState<'reference' | 'elements' | 'captures'>('reference');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Fetch generations for reference selection
    const fetchGenerations = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/api/projects/${projectId}/generations?limit=50`);
            const data = await res.json();
            // API returns array directly, not {success, generations}
            const generationsArray = Array.isArray(data) ? data : (data.generations || []);
            setGenerations(generationsArray.filter((g: Generation) => g.status === 'succeeded'));
        } catch (error) {
            console.error('Failed to fetch generations:', error);
        }
    }, [apiUrl, projectId]);

    // Fetch project elements
    const fetchElements = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/api/projects/${projectId}/elements`);
            const data = await res.json();
            // API returns array directly, not {success, elements}
            const elementsArray = Array.isArray(data) ? data : (data.elements || []);
            setElements(elementsArray);
        } catch (error) {
            console.error('Failed to fetch elements:', error);
        }
    }, [apiUrl, projectId]);

    useEffect(() => {
        fetchGenerations();
        fetchElements();
    }, [fetchGenerations, fetchElements]);

    // Get image URL from generation outputs
    const getImageUrl = (gen: Generation): string | null => {
        if (!gen.outputs) return null;
        try {
            const parsed = typeof gen.outputs === 'string' ? JSON.parse(gen.outputs) : gen.outputs;
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed[0].url || null;
            }
        } catch {
            return null;
        }
        return null;
    };

    // Add element to viewfinder
    const addElementToViewfinder = (el: Element) => {
        const newElement: ViewfinderElement = {
            id: `vf-${el.id}-${Date.now()}`,
            name: el.name,
            imageUrl: el.url || el.fileUrl || el.thumbnail || '',
            x: 0.5,
            y: 0.5,
            scale: 1,
            rotation: 0,
            opacity: 1,
        };
        setViewfinderElements(prev => [...prev, newElement]);
    };

    // Handle capture from viewfinder
    const handleCapture = (imageUrl: string) => {
        setCaptures(prev => [imageUrl, ...prev]);
    };

    // Upload reference image
    const handleUploadReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            // Use the processing temp upload endpoint
            const res = await fetch(`${apiUrl}/api/process/upload-temp`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (data.success && data.fileUrl) {
                // fileUrl is relative, need to prefix with apiUrl for display
                setReferenceImageUrl(`${apiUrl}${data.fileUrl}`);
            }
        } catch (error) {
            console.error('Failed to upload reference:', error);
        }
        setIsUploading(false);
        // Reset input
        e.target.value = '';
    };

    // Save capture as element
    const saveCaptureAsElement = async (dataUrl: string) => {
        setIsLoading(true);
        try {
            // Convert data URL to blob
            const res = await fetch(dataUrl);
            const blob = await res.blob();

            // Create form data
            const formData = new FormData();
            formData.append('file', blob, `viewfinder-capture-${Date.now()}.png`);
            formData.append('name', `Viewfinder Capture ${new Date().toLocaleTimeString()}`);
            formData.append('type', 'reference');

            // Upload to backend
            const uploadRes = await fetch(`${apiUrl}/api/projects/${projectId}/elements/upload`, {
                method: 'POST',
                body: formData,
            });
            const data = await uploadRes.json();

            if (data.success) {
                fetchElements();
            }
        } catch (error) {
            console.error('Failed to save capture:', error);
        }
        setIsLoading(false);
    };

    return (
        <div className="flex h-screen bg-[#0a0a0a]">
            {/* Left Sidebar - Reference/Elements/Captures */}
            <AnimatePresence>
                {!sidebarCollapsed && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 288, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#111]"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 border-b border-white/10 p-4">
                            <div className="flex-1">
                                <h1 className="text-lg font-bold text-white">Viewfinder</h1>
                                <p className="text-xs text-gray-500">DOF Simulator & Composite</p>
                            </div>
                        </div>

                {/* Panel Tabs */}
                <div className="flex border-b border-white/10">
                    {[
                        { id: 'reference', icon: Image, label: 'Reference' },
                        { id: 'elements', icon: Layers, label: 'Elements' },
                        { id: 'captures', icon: Camera, label: 'Captures' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActivePanel(tab.id as typeof activePanel)}
                            className={clsx(
                                'flex flex-1 flex-col items-center gap-1 py-3 text-[10px] transition-colors',
                                activePanel === tab.id
                                    ? 'bg-cyan-500/10 text-cyan-400'
                                    : 'text-gray-500 hover:bg-white/5 hover:text-white'
                            )}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Panel Content */}
                <div className="flex-1 overflow-y-auto p-3">
                    {/* Reference Panel */}
                    {activePanel === 'reference' && (
                        <div className="space-y-3">
                            {/* Upload Button */}
                            <label
                                className={clsx(
                                    'flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-cyan-500/30 bg-cyan-500/5 p-4 transition-all hover:border-cyan-500/50 hover:bg-cyan-500/10',
                                    isUploading && 'pointer-events-none opacity-50'
                                )}
                            >
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleUploadReference}
                                    className="hidden"
                                    disabled={isUploading}
                                />
                                {isUploading ? (
                                    <>
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                                        <span className="text-sm font-medium text-cyan-400">Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-5 w-5 text-cyan-400" />
                                        <span className="text-sm font-medium text-cyan-400">Upload Reference Image</span>
                                    </>
                                )}
                            </label>

                            {/* Current Reference Indicator */}
                            {referenceImageUrl && (
                                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-2">
                                    <div className="h-10 w-10 overflow-hidden rounded border border-green-500/30">
                                        <img src={referenceImageUrl} alt="Current reference" className="h-full w-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-green-400">Reference Active</p>
                                        <p className="truncate text-[10px] text-gray-500">Click below to change</p>
                                    </div>
                                    <button
                                        onClick={() => setReferenceImageUrl(null)}
                                        className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-red-400"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            {/* Divider */}
                            <div className="flex items-center gap-2">
                                <div className="h-px flex-1 bg-white/10" />
                                <span className="text-[10px] text-gray-600">or select from generations</span>
                                <div className="h-px flex-1 bg-white/10" />
                            </div>

                            {generations.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-white/20 p-6 text-center">
                                    <Image className="mx-auto h-8 w-8 text-gray-600" />
                                    <p className="mt-2 text-xs text-gray-500">No generations yet</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {generations.map(gen => {
                                        const url = getImageUrl(gen);
                                        if (!url) return null;
                                        return (
                                            <button
                                                key={gen.id}
                                                onClick={() => setReferenceImageUrl(url)}
                                                className={clsx(
                                                    'group relative aspect-square overflow-hidden rounded-lg border transition-all',
                                                    referenceImageUrl === url
                                                        ? 'border-cyan-400 ring-2 ring-cyan-400/50'
                                                        : 'border-white/10 hover:border-white/30'
                                                )}
                                            >
                                                <img
                                                    src={url}
                                                    alt={gen.inputPrompt}
                                                    className="h-full w-full object-cover"
                                                />
                                                {referenceImageUrl === url && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-cyan-500/20">
                                                        <div className="rounded-full bg-cyan-500 p-1">
                                                            <Camera className="h-4 w-4 text-white" />
                                                        </div>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Elements Panel */}
                    {activePanel === 'elements' && (
                        <div className="space-y-2">
                            <p className="mb-3 text-xs text-gray-500">Add elements to composite:</p>
                            {elements.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-white/20 p-6 text-center">
                                    <Layers className="mx-auto h-8 w-8 text-gray-600" />
                                    <p className="mt-2 text-xs text-gray-500">No elements in project</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {elements.map(el => (
                                        <button
                                            key={el.id}
                                            onClick={() => addElementToViewfinder(el)}
                                            className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2 text-left transition-all hover:border-white/20 hover:bg-white/10"
                                        >
                                            {(el.url || el.fileUrl || el.thumbnail) && (
                                                <img
                                                    src={el.url || el.fileUrl || el.thumbnail}
                                                    alt={el.name}
                                                    className="h-10 w-10 rounded object-cover"
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="truncate text-sm text-white">{el.name}</p>
                                                <p className="text-[10px] text-gray-500">{el.type}</p>
                                            </div>
                                            <Plus className="h-4 w-4 text-gray-500" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Current Viewfinder Elements */}
                            {viewfinderElements.length > 0 && (
                                <div className="mt-4 border-t border-white/10 pt-4">
                                    <p className="mb-2 text-xs font-medium text-gray-400">In Viewfinder:</p>
                                    {viewfinderElements.map(el => (
                                        <div
                                            key={el.id}
                                            className="flex items-center justify-between rounded-lg bg-white/5 p-2"
                                        >
                                            <span className="text-xs text-white">{el.name}</span>
                                            <button
                                                onClick={() =>
                                                    setViewfinderElements(prev =>
                                                        prev.filter(e => e.id !== el.id)
                                                    )
                                                }
                                                className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-red-400"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Captures Panel */}
                    {activePanel === 'captures' && (
                        <div className="space-y-2">
                            <p className="mb-3 text-xs text-gray-500">Your viewfinder captures:</p>
                            {captures.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-white/20 p-6 text-center">
                                    <Camera className="mx-auto h-8 w-8 text-gray-600" />
                                    <p className="mt-2 text-xs text-gray-500">No captures yet</p>
                                    <p className="text-[10px] text-gray-600">Use the Capture button in the viewfinder</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {captures.map((capture, i) => (
                                        <div key={i} className="group relative aspect-video overflow-hidden rounded-lg border border-white/10">
                                            <img
                                                src={capture}
                                                alt={`Capture ${i + 1}`}
                                                className="h-full w-full object-cover"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                                                <Tooltip content="Save as Element" side="top">
                                                    <button
                                                        onClick={() => saveCaptureAsElement(capture)}
                                                        disabled={isLoading}
                                                        className="rounded-lg bg-green-500 p-2 text-white transition-colors hover:bg-green-400"
                                                    >
                                                        <Save className="h-4 w-4" />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="Delete" side="top">
                                                    <button
                                                        onClick={() =>
                                                            setCaptures(prev => prev.filter((_, j) => j !== i))
                                                        }
                                                        className="rounded-lg bg-red-500 p-2 text-white transition-colors hover:bg-red-400"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content - Viewfinder (fills all available space) */}
            <div className="relative flex-1">
                <DirectorViewfinder
                    projectId={projectId}
                    referenceImageUrl={referenceImageUrl || undefined}
                    elements={viewfinderElements}
                    onElementsChange={setViewfinderElements}
                    onCapture={handleCapture}
                    embedded={true}
                    isOpen={true}
                    fullscreen={sidebarCollapsed}
                    pageSidebarCollapsed={sidebarCollapsed}
                    onTogglePageSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
            </div>
        </div>
    );
}
