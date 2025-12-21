"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon, Film, Edit2, Heart, Download, Trash2, Copy, CheckSquare, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { fetchAPI, uploadFile } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { EditElementModal } from "@/components/elements/EditElementModal";
import { SortFilterHeader, SortFilterState } from "@/components/elements/SortFilterHeader";
import { Element as StoreElement, ElementType } from "@/lib/store";
import { useParams } from "next/navigation";

import { useSession } from "@/context/SessionContext";
import { SaveElementModal } from "@/components/generations/SaveElementModal";

export default function ElementsPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const projectId = params.id as string;
    const { selectedSessionId, sessions } = useSession();

    const [elements, setElements] = useState<StoreElement[]>([]);
    const [uploading, setUploading] = useState(false);
    const [selectedElement, setSelectedElement] = useState<StoreElement | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isBatchTypeModalOpen, setIsBatchTypeModalOpen] = useState(false);

    // Sort & Filter State
    const [sortFilter, setSortFilter] = useState<SortFilterState>({
        sortBy: 'name',
        sortOrder: 'asc',
        filterType: [],
        filterMediaType: [],
        filterAspectRatio: [],
        filterTags: [],
        filterSessions: []
    });

    // Initialize filters from URL
    useEffect(() => {
        const typeParam = searchParams.get('type');
        if (typeParam) {
            setSortFilter(prev => ({ ...prev, filterType: [typeParam] }));
        }
    }, [searchParams]);

    // Sync filter with selected session
    useEffect(() => {
        if (selectedSessionId) {
            setSortFilter(prev => ({ ...prev, filterSessions: [selectedSessionId] }));
        } else {
            // If no session selected, maybe clear filter? Or leave as is?
            // User said "default session filter to whichever session you are in".
            // If we are in "Global" (null), we might want to show all or just global.
            // For now, let's clear it to show all, or we could set it to 'unassigned' if we want to be strict.
            // Let's clear it to show everything by default if no session is selected.
            setSortFilter(prev => ({ ...prev, filterSessions: [] }));
        }
    }, [selectedSessionId]);

    useEffect(() => {
        if (projectId) {
            loadElements();
        }
    }, [projectId]);

    const loadElements = async () => {
        try {
            const data = await fetchAPI(`/projects/${projectId}/elements`);
            const mapped: StoreElement[] = data.map((e: any) => ({
                id: e.id,
                name: e.name,
                type: e.type as ElementType,
                url: `http://localhost:3001${e.fileUrl}`,
                isFavorite: e.isFavorite,
                tags: e.tags || [],
                metadata: e.metadata,
                session: e.session // Include session info
            }));
            setElements(mapped);
        } catch (err) {
            console.error(err);
        }
    };

    // ... (onDrop implementation remains same) ...
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        setUploading(true);
        for (const file of acceptedFiles) {
            try {
                let type: ElementType = 'image';
                let metadata = {};

                if (file.type.startsWith('image')) {
                    // Detect dimensions
                    const bmp = await createImageBitmap(file);
                    const { width, height } = bmp;
                    bmp.close();

                    metadata = { width, height, aspectRatio: width / height };

                    // Infer type based on aspect ratio
                    if (height > width) {
                        type = 'character';
                    }
                } else if (file.type.startsWith('video')) {
                    type = 'video';
                    // Video dimensions are harder to get without loading, skipping for now
                }

                await uploadFile(`/projects/${projectId}/elements`, file, {
                    name: file.name.split('.')[0],
                    type: type,
                    metadata: JSON.stringify(metadata),
                    tags: JSON.stringify([]), // Initialize with empty tags
                    sessionId: selectedSessionId || undefined // Pass selected session ID
                });
            } catch (err) {
                console.error("Upload failed", err);
            }
        }
        setUploading(false);
        loadElements();
    }, [projectId, selectedSessionId]);

    const handleElementClick = (element: StoreElement) => {
        setSelectedElement(element);
        setIsEditModalOpen(true);
    };

    const handleUpdateElement = async (id: string, updates: any) => {
        try {
            if (updates.file) {
                const formData = new FormData();
                formData.append('file', updates.file);
                if (updates.name) formData.append('name', updates.name);
                if (updates.type) formData.append('type', updates.type);
                if (updates.isFavorite !== undefined) {
                    formData.append('isFavorite', String(updates.isFavorite));
                }
                if (updates.tags) {
                    formData.append('tags', JSON.stringify(updates.tags));
                }
                if (updates.sessionId !== undefined) {
                    formData.append('sessionId', String(updates.sessionId));
                }

                const res = await fetch(`http://localhost:3001/api/projects/${projectId}/elements/${id}`, {
                    method: 'PATCH',
                    body: formData,
                });

                if (!res.ok) throw new Error('Update failed');
            } else {
                // Handle tags specially if they are in updates
                const body = { ...updates };
                if (body.tags) {
                    body.tags = JSON.stringify(body.tags);
                }

                await fetchAPI(`/projects/${projectId}/elements/${id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(body)
                });
            }
            loadElements();
        } catch (err) {
            console.error("Failed to update element", err);
            throw err;
        }
    };

    const handleDeleteElement = async (id: string) => {
        if (!confirm('Are you sure you want to delete this element?')) return;
        setElements((prev) => prev.filter((e) => e.id !== id));
        try {
            await fetchAPI(`/projects/${projectId}/elements/${id}`, {
                method: 'DELETE'
            });
        } catch (err) {
            console.error("Failed to delete element", err);
            loadElements();
            alert("Failed to delete element");
        }
    };

    // Batch Selection State
    const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);

    const toggleElementSelection = (id: string) => {
        setSelectedElementIds(prev =>
            prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
        );
    };

    // Filter and Sort Logic (Moved up to be available for Selection)
    const filteredElements = elements.filter(el => {
        // Filter by Session
        if (sortFilter.filterSessions.length > 0) {
            const sessionId = el.session?.id || 'unassigned';
            if (!sortFilter.filterSessions.includes(sessionId)) return false;
        }

        // Filter by Type
        if (sortFilter.filterType.length > 0 && !sortFilter.filterType.includes(el.type)) return false;

        // Filter by Media Type
        if (sortFilter.filterMediaType.length > 0) {
            const isVideo = el.type === 'video';
            const isImage = el.type !== 'video';
            if (sortFilter.filterMediaType.includes('video') && !isVideo) {
                if (!sortFilter.filterMediaType.includes('image')) return false;
            }
            if (sortFilter.filterMediaType.includes('image') && !isImage) {
                if (!sortFilter.filterMediaType.includes('video')) return false;
            }
        }

        // Filter by Aspect Ratio (Approximate)
        if (sortFilter.filterAspectRatio.length > 0) {
            const ratio = el.metadata?.aspectRatio || (el.type === 'character' ? 9 / 16 : 16 / 9);
            const tolerance = 0.1;
            const matches = sortFilter.filterAspectRatio.some(target => {
                const [w, h] = target.split(':').map(Number);
                const targetRatio = w / h;
                return Math.abs(ratio - targetRatio) < tolerance;
            });
            if (!matches) return false;
        }

        // Filter by Tags
        if (sortFilter.filterTags.length > 0) {
            if (!el.tags || !sortFilter.filterTags.every(tag => el.tags?.includes(tag))) return false;
        }

        return true;
    });

    const sortedElements = [...filteredElements].sort((a, b) => {
        if (sortFilter.sortBy === 'aspectRatio') {
            const valA = a.metadata?.aspectRatio || 0;
            const valB = b.metadata?.aspectRatio || 0;
            if (valA < valB) return sortFilter.sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortFilter.sortOrder === 'asc' ? 1 : -1;
            return 0;
        }

        const key = sortFilter.sortBy as keyof StoreElement;
        // Only sort by name or type directly
        if (key !== 'name' && key !== 'type') return 0;

        const valA = a[key];
        const valB = b[key];

        if (valA < valB) return sortFilter.sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortFilter.sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const selectAllElements = () => {
        // Select all CURRENTLY VISIBLE elements
        setSelectedElementIds(sortedElements.map(e => e.id));
    };

    const deselectAllElements = () => {
        setSelectedElementIds([]);
    };

    const handleBatchDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedElementIds.length} elements?`)) return;

        try {
            await Promise.all(selectedElementIds.map(id =>
                fetchAPI(`/projects/${projectId}/elements/${id}`, { method: 'DELETE' })
            ));
            setSelectedElementIds([]);
            loadElements();
        } catch (err) {
            console.error("Batch delete failed", err);
        }
    };

    const handleBatchMove = async (targetSessionId: string) => {
        try {
            const formData = new FormData();
            formData.append('sessionId', targetSessionId);

            await Promise.all(selectedElementIds.map(id =>
                fetch(`http://localhost:3001/api/projects/${projectId}/elements/${id}`, {
                    method: 'PATCH',
                    body: formData
                })
            ));
            setSelectedElementIds([]);
            loadElements();
        } catch (err) {
            console.error("Batch move failed", err);
        }
    };

    const handleBatchSetType = async (name: string, type: string) => {
        // Name is ignored in batch, only type is used
        try {
            const formData = new FormData();
            formData.append('type', type);

            await Promise.all(selectedElementIds.map(id =>
                fetch(`http://localhost:3001/api/projects/${projectId}/elements/${id}`, {
                    method: 'PATCH',
                    body: formData
                })
            ));

            setSelectedElementIds([]);
            loadElements();
        } catch (err) {
            console.error("Batch set type failed", err);
        }
    };

    const handleBatchCopyLinks = () => {
        const links = elements
            .filter(e => selectedElementIds.includes(e.id))
            .map(e => e.url)
            .join('\n');

        if (links) {
            navigator.clipboard.writeText(links);
            alert(`Copied ${selectedElementIds.length} links to clipboard!`);
        }
    };

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        noClick: true,
        accept: {
            'image/*': [],
            'video/*': []
        }
    });

    // Filter and Sort Logic




    // Extract all available tags
    const availableTags = Array.from(new Set(elements.flatMap(e => e.tags || [])));

    return (
        <div className="space-y-8 pb-20 p-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Elements</h1>
                    <p className="text-gray-400 mt-2">Manage your characters, props, and locations.</p>
                </div>
                <SortFilterHeader
                    state={sortFilter}
                    onChange={setSortFilter}
                    availableTags={availableTags}
                    availableSessions={sessions}
                />
                {elements.length > 0 && (
                    <button
                        onClick={selectedElementIds.length === sortedElements.length ? deselectAllElements : selectAllElements}
                        className="ml-4 text-sm text-blue-400 hover:text-blue-300"
                    >
                        {selectedElementIds.length === sortedElements.length ? "Deselect All" : "Select All"}
                    </button>
                )}
            </header>

            {/* Upload Zone */}
            <div
                {...getRootProps()}
                onClick={open}
                className={clsx(
                    "border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-colors cursor-pointer",
                    isDragActive ? "border-blue-500 bg-blue-500/10" : "border-white/10 hover:border-white/20 hover:bg-white/5"
                )}
            >
                <input {...getInputProps()} />
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                    {uploading ? <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div> : <Upload className="w-8 h-8 text-gray-400" />}
                </div>
                <h3 className="text-xl font-medium mb-2">Upload Images or Videos</h3>
                <p className="text-gray-400 max-w-md mb-6">
                    Drag & drop up to 14 files here, or click to select files.
                </p>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        open();
                    }}
                    className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                    Select Files
                </button>
            </div>

            {/* Elements Grid */}
            <div className="space-y-8">
                {sortedElements.length === 0 ? (
                    <div className="w-full text-center py-12 text-gray-500">
                        {elements.length === 0 ? "No elements found. Upload some above!" : "No elements match your filters."}
                    </div>
                ) : (
                    Object.entries(
                        sortedElements.reduce((acc, el) => {
                            const sessionName = el.session?.name || "Global / Unassigned";
                            if (!acc[sessionName]) acc[sessionName] = [];
                            acc[sessionName].push(el);
                            return acc;
                        }, {} as Record<string, StoreElement[]>)
                    ).map(([sessionName, sessionElements]) => (
                        <div key={sessionName}>
                            <h2 className="text-xl font-bold text-gray-400 mb-4 border-b border-white/10 pb-2">{sessionName}</h2>
                            <div className="flex flex-wrap gap-4">
                                <AnimatePresence>
                                    {sessionElements.map((element) => (
                                        <ElementCard
                                            key={element.id}
                                            element={element}
                                            onEdit={() => handleElementClick(element)}
                                            onUpdate={handleUpdateElement}
                                            onDelete={handleDeleteElement}
                                            isSelected={selectedElementIds.includes(element.id)}
                                            onToggleSelection={() => toggleElementSelection(element.id)}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Batch Action Toolbar */}
            {selectedElementIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl px-6 py-3 flex items-center gap-6 animate-in slide-in-from-bottom-4 fade-in duration-200">
                    <span className="text-sm font-medium text-white">
                        {selectedElementIds.length} selected
                    </span>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                        <select
                            onChange={(e) => {
                                if (e.target.value) handleBatchMove(e.target.value);
                            }}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            defaultValue=""
                        >
                            <option value="" disabled>Move to Session...</option>
                            {sessions.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => setIsBatchTypeModalOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-lg text-sm font-medium transition-colors border border-yellow-500/20"
                        >
                            <Tag className="w-4 h-4" />
                            Set Type
                        </button>
                        <button
                            onClick={handleBatchCopyLinks}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium transition-colors border border-blue-500/20"
                            title="Copy Links for JDownloader"
                        >
                            <Copy className="w-4 h-4" />
                            Copy Links
                        </button>
                        <button
                            onClick={handleBatchDelete}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-medium transition-colors border border-red-500/20"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                        <div className="h-4 w-px bg-white/10 mx-1" />
                        <button
                            onClick={selectedElementIds.length === sortedElements.length ? deselectAllElements : selectAllElements}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium transition-colors border border-white/10"
                        >
                            <CheckSquare className="w-4 h-4" />
                            {selectedElementIds.length === sortedElements.length ? "Deselect All" : "Select All"}
                        </button>
                        <button
                            onClick={deselectAllElements}
                            className="p-1.5 text-gray-400 hover:text-white transition-colors ml-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}


            <EditElementModal
                element={selectedElement}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleUpdateElement}
                sessions={sessions}
            />

            <SaveElementModal
                isOpen={isBatchTypeModalOpen}
                onClose={() => setIsBatchTypeModalOpen(false)}
                onSave={handleBatchSetType}
                isBatch={true}
                title={`Set Type for ${selectedElementIds.length} Elements`}
                initialName=""
            />
        </div >
    );
}

function ElementCard({ element, onEdit, onUpdate, onDelete, isSelected, onToggleSelection }: { element: StoreElement; onEdit: () => void; onUpdate: (id: string, updates: Partial<StoreElement>) => void; onDelete: (id: string) => void; isSelected?: boolean; onToggleSelection?: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Determine aspect ratio class
    // Logic:
    // 1. If type is explicitly 'character', force vertical (9:16).
    // 2. If metadata exists, use dimensions.
    // 3. Default to horizontal (16:9).
    const isVertical = element.type === 'character' ||
        ((element.metadata as any)?.height > (element.metadata as any)?.width);

    const aspectRatioClass = isVertical ? 'aspect-[9/16]' : 'aspect-[16/9]';

    const handleMouseEnter = () => {
        if (element.type === 'video' && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => { }); // Ignore autoplay errors
            setIsPlaying(true);
        }
    };

    const handleMouseLeave = () => {
        if (element.type === 'video' && videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current && videoRef.current.currentTime >= 5) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    };

    const handleClick = () => {
        const width = 1280;
        const height = 720;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        const html = `
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>${element.name.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
                    <style>
                        body { margin: 0; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
                        video, img { max-width: 100%; max-height: 100%; object-fit: contain; }
                    </style>
                </head>
                <body>
                    ${element.type === 'video'
                ? `<video src="${element.url}" controls autoplay loop></video>`
                : `<img src="${element.url}" alt="${element.name.replace(/"/g, '&quot;')}" />`}
                </body>
            </html>
        `;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        window.open(
            url,
            "_blank",
            `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
        );
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = element.url;
        link.download = element.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleTrash = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(element.id);
    };

    const handleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdate(element.id, { isFavorite: !element.isFavorite });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={clsx(
                "group relative h-48 rounded-xl overflow-hidden bg-white/5 border border-white/10 cursor-pointer z-10 hover:z-20 hover:ring-2 hover:ring-blue-500 transition-all",
                aspectRatioClass
            )}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => {
                if (onToggleSelection && (e.ctrlKey || e.metaKey || isSelected)) {
                    e.stopPropagation();
                    onToggleSelection();
                } else {
                    handleClick();
                }
            }}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-label={`View details for ${element.name}`}
        >
            {/* Selection Checkbox and Favorite - top-left */}
            <div
                className={clsx(
                    "absolute top-2 left-2 z-20 flex items-center gap-2 transition-opacity duration-200",
                    (isSelected || element.isFavorite) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
            >
                {onToggleSelection && (
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelection();
                        }}
                    >
                        <div className={clsx(
                            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                            isSelected
                                ? "bg-blue-500 border-blue-500"
                                : "bg-black/50 border-white/50 hover:border-white hover:bg-black/70"
                        )}>
                            {isSelected && <CheckSquare className="w-3 h-3 text-white" />}
                        </div>
                    </div>
                )}
                <button
                    onClick={handleFavorite}
                    className="p-1.5 bg-black/50 hover:bg-red-500/20 rounded-lg text-white backdrop-blur-md transition-colors"
                >
                    <Heart className={clsx("w-4 h-4", element.isFavorite ? "fill-red-500 text-red-500" : "text-white")} />
                </button>
            </div>
            {element.type === "video" ? (
                <video
                    ref={videoRef}
                    src={element.url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                />
            ) : (
                <img src={element.url} alt={element.name} className="w-full h-full object-cover" />
            )}

            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                <div className="flex justify-end items-start">
                    <div className="flex gap-1">
                        <button
                            onClick={handleDownload}
                            className="p-1.5 bg-black/50 hover:bg-white/20 rounded-lg text-white transition-colors"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleTrash}
                            className="p-1.5 bg-black/50 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-white transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-auto">
                    {element.type === 'video' && (
                        <Film className="w-3 h-3 text-blue-400" />
                    )}
                    <p className="text-white text-xs font-medium truncate flex-1">{element.name}</p>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                        className="p-1.5 bg-black/50 hover:bg-white/20 rounded-lg text-white transition-colors"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
