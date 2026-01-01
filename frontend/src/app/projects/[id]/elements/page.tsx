'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  X,
  Image as ImageIcon,
  Film,
  Edit2,
  Heart,
  Download,
  Trash2,
  Copy,
  CheckSquare,
  Tag,
  Box,
  Layers,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { fetchAPI, uploadFile } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { EditElementModal } from '@/components/elements/EditElementModal';
import { PropFabricatorModal } from '@/components/elements/PropFabricatorModal';
import { SortFilterHeader, SortFilterState } from '@/components/elements/SortFilterHeader';
import { Element as StoreElement, ElementType } from '@/lib/store';
import { useParams } from 'next/navigation';

import { useSession } from '@/context/SessionContext';
import { SaveElementModal } from '@/components/generations/SaveElementModal';
import { Tooltip } from '@/components/ui/Tooltip';
import { Wand2 } from 'lucide-react';
import { MaterialViewModal } from '@/components/elements/MaterialViewModal';

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
  const [propFabricatorElement, setPropFabricatorElement] = useState<StoreElement | null>(null);

  // Phase 3: Asset Bin state
  const [processingElementIds, setProcessingElementIds] = useState<Set<string>>(new Set());
  const [materialViewElement, setMaterialViewElement] = useState<StoreElement | null>(null);

  // Sort & Filter State
  const [sortFilter, setSortFilter] = useState<SortFilterState>({
    sortBy: 'name',
    sortOrder: 'asc',
    filterType: [],
    filterMediaType: [],
    filterAspectRatio: [],
    filterTags: [],
    filterSessions: [],
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
        url: (() => {
          const u = e.fileUrl as string;
          if (!u) return '';
          if (u.startsWith('http') || u.startsWith('data:')) return u;
          return `http://localhost:3001${u.startsWith('/') ? '' : '/'}${u}`;
        })(),
        isFavorite: e.isFavorite,
        tags: e.tags || [],
        metadata: e.metadata,
        session: e.session, // Include session info
      }));
      setElements(mapped);
    } catch (err) {
      console.error(err);
    }
  };

  // ... (onDrop implementation remains same) ...
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
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
            sessionId: selectedSessionId || undefined, // Pass selected session ID
          });
        } catch (err) {
          console.error('Upload failed', err);
        }
      }
      setUploading(false);
      loadElements();
    },
    [projectId, selectedSessionId]
  );

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
          body: JSON.stringify(body),
        });
      }
      loadElements();
    } catch (err) {
      console.error('Failed to update element', err);
      throw err;
    }
  };

  const handleDeleteElement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this element?')) return;
    setElements(prev => prev.filter(e => e.id !== id));
    try {
      await fetchAPI(`/projects/${projectId}/elements/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete element', err);
      loadElements();
      alert('Failed to delete element');
    }
  };

  // Phase 3: Asset Bin - Scene Deconstruction (2D → 3D)
  const handleDeconstruct = async (element: StoreElement) => {
    if (processingElementIds.has(element.id)) return;

    setProcessingElementIds(prev => new Set(prev).add(element.id));

    try {
      const response = await fetchAPI(`/projects/${projectId}/assets/deconstruct`, {
        method: 'POST',
        body: JSON.stringify({
          elementId: element.id,
          outputFormat: '3d_gaussian',
          qualityLevel: 'standard',
        }),
      });

      if (response.success) {
        alert(`Scene deconstruction complete! Created ${response.createdElements?.length || 0} 3D assets.`);
        loadElements(); // Refresh to show new child elements
      } else {
        alert(`Deconstruction failed: ${response.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to deconstruct scene', err);
      alert('Failed to deconstruct scene. Check console for details.');
    } finally {
      setProcessingElementIds(prev => {
        const next = new Set(prev);
        next.delete(element.id);
        return next;
      });
    }
  };

  // Phase 3: Asset Bin - PBR Material Extraction
  const handleExtractMaterials = async (element: StoreElement) => {
    if (processingElementIds.has(element.id)) return;

    setProcessingElementIds(prev => new Set(prev).add(element.id));

    try {
      const response = await fetchAPI(`/projects/${projectId}/assets/extract-materials`, {
        method: 'POST',
        body: JSON.stringify({
          elementId: element.id,
          materialType: 'auto',
          resolution: 1024,
        }),
      });

      if (response.success) {
        // Refresh elements to get updated metadata with PBR maps
        await loadElements();
        // Find the updated element and show material view
        const updatedElement = elements.find(e => e.id === element.id);
        if (updatedElement) {
          setMaterialViewElement(updatedElement);
        }
      } else {
        alert(`Material extraction failed: ${response.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to extract materials', err);
      alert('Failed to extract materials. Check console for details.');
    } finally {
      setProcessingElementIds(prev => {
        const next = new Set(prev);
        next.delete(element.id);
        return next;
      });
    }
  };

  // Phase 3: View existing PBR maps
  const handleViewMaterials = (element: StoreElement) => {
    setMaterialViewElement(element);
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
      await Promise.all(
        selectedElementIds.map(id =>
          fetchAPI(`/projects/${projectId}/elements/${id}`, { method: 'DELETE' })
        )
      );
      setSelectedElementIds([]);
      loadElements();
    } catch (err) {
      console.error('Batch delete failed', err);
    }
  };

  const handleBatchMove = async (targetSessionId: string) => {
    try {
      const formData = new FormData();
      formData.append('sessionId', targetSessionId);

      await Promise.all(
        selectedElementIds.map(id =>
          fetch(`http://localhost:3001/api/projects/${projectId}/elements/${id}`, {
            method: 'PATCH',
            body: formData,
          })
        )
      );
      setSelectedElementIds([]);
      loadElements();
    } catch (err) {
      console.error('Batch move failed', err);
    }
  };

  const handleBatchSetType = async (name: string, type: string) => {
    // Name is ignored in batch, only type is used
    try {
      const formData = new FormData();
      formData.append('type', type);

      await Promise.all(
        selectedElementIds.map(id =>
          fetch(`http://localhost:3001/api/projects/${projectId}/elements/${id}`, {
            method: 'PATCH',
            body: formData,
          })
        )
      );

      setSelectedElementIds([]);
      loadElements();
    } catch (err) {
      console.error('Batch set type failed', err);
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
      'video/*': [],
    },
  });

  // Filter and Sort Logic

  // Extract all available tags
  const availableTags = Array.from(new Set(elements.flatMap(e => e.tags || [])));

  return (
    <div className="space-y-8 p-8 pb-20">
      <header className="flex items-center gap-4">
        {/* Title section */}
        <div className="shrink-0">
          <h1 className="text-3xl font-bold tracking-tight">Elements</h1>
          <p className="mt-1 text-sm text-gray-400">Manage your characters, props, and locations.</p>
        </div>

        {/* Spacer to push buttons to the right */}
        <div className="flex-1" />

        {/* Sort, Filter, Select All buttons - matching Generate page styling */}
        <SortFilterHeader
          state={sortFilter}
          onChange={setSortFilter}
          availableTags={availableTags}
          availableSessions={sessions}
          onSelectAll={elements.length > 0 ? (
            selectedElementIds.length === sortedElements.length
              ? deselectAllElements
              : selectAllElements
          ) : undefined}
          selectAllLabel={
            selectedElementIds.length === sortedElements.length ? 'Deselect All' : 'Select All'
          }
        />
      </header>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        onClick={open}
        className={clsx(
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-colors',
          isDragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-white/10 hover:border-white/20 hover:bg-white/5'
        )}
      >
        <input {...getInputProps()} />
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          {uploading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
          ) : (
            <Upload className="h-8 w-8 text-gray-400" />
          )}
        </div>
        <h3 className="mb-2 text-xl font-medium">Upload Images or Videos</h3>
        <p className="mb-6 max-w-md text-gray-400">
          Drag & drop up to 14 files here, or click to select files.
        </p>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            open();
          }}
          className="rounded-lg bg-white px-6 py-2 font-medium text-black transition-colors hover:bg-gray-200"
        >
          Select Files
        </button>
      </div>

      {/* Elements Grid */}
      <div className="space-y-8">
        {sortedElements.length === 0 ? (
          <div className="w-full py-12 text-center text-gray-500">
            {elements.length === 0
              ? 'No elements found. Upload some above!'
              : 'No elements match your filters.'}
          </div>
        ) : (
          Object.entries(
            sortedElements.reduce(
              (acc, el) => {
                const sessionName = el.session?.name || 'Global / Unassigned';
                if (!acc[sessionName]) acc[sessionName] = [];
                acc[sessionName].push(el);
                return acc;
              },
              {} as Record<string, StoreElement[]>
            )
          ).map(([sessionName, sessionElements]) => (
            <div key={sessionName}>
              <h2 className="mb-4 border-b border-white/10 pb-2 text-xl font-bold text-gray-400">
                {sessionName}
              </h2>
              <div className="flex flex-wrap gap-4">
                <AnimatePresence>
                  {sessionElements.map(element => (
                    <ElementCard
                      key={element.id}
                      element={element}
                      onEdit={() => handleElementClick(element)}
                      onUpdate={handleUpdateElement}
                      onDelete={handleDeleteElement}
                      onFabricate={() => setPropFabricatorElement(element)}
                      onDeconstruct={() => handleDeconstruct(element)}
                      onExtractMaterials={() => handleExtractMaterials(element)}
                      onViewMaterials={() => handleViewMaterials(element)}
                      isProcessing={processingElementIds.has(element.id)}
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
        <div className="animate-in slide-in-from-bottom-4 fade-in fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-6 rounded-xl border border-white/10 bg-[#1a1a1a] px-6 py-3 shadow-2xl duration-200">
          <span className="text-sm font-medium text-white">
            {selectedElementIds.length} selected
          </span>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <select
              onChange={e => {
                if (e.target.value) handleBatchMove(e.target.value);
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
              defaultValue=""
            >
              <option value="" disabled>
                Move to Session...
              </option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsBatchTypeModalOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-1.5 text-sm font-medium text-yellow-500 transition-colors hover:bg-yellow-500/20"
            >
              <Tag className="h-4 w-4" />
              Set Type
            </button>
            <Tooltip content="Copy Links for JDownloader" side="top">
              <button
                onClick={handleBatchCopyLinks}
                className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
              >
                <Copy className="h-4 w-4" />
                Copy Links
              </button>
            </Tooltip>
            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/20"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
            <div className="mx-1 h-4 w-px bg-white/10" />
            <button
              onClick={
                selectedElementIds.length === sortedElements.length
                  ? deselectAllElements
                  : selectAllElements
              }
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10"
            >
              <CheckSquare className="h-4 w-4" />
              {selectedElementIds.length === sortedElements.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={deselectAllElements}
              className="ml-1 p-1.5 text-gray-400 transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
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

      {propFabricatorElement && (
        <PropFabricatorModal
          isOpen={!!propFabricatorElement}
          onClose={() => setPropFabricatorElement(null)}
          propImageUrl={propFabricatorElement.url}
          propName={propFabricatorElement.name}
          onSaveResult={async (imageUrl, name) => {
            // Save the fabricated result as a new element
            try {
              await fetchAPI(`/projects/${projectId}/elements`, {
                method: 'POST',
                body: JSON.stringify({
                  name,
                  url: imageUrl,
                  type: 'prop',
                  metadata: { source: 'prop-fabricator', originalId: propFabricatorElement.id },
                }),
              });
              loadElements();
            } catch (err) {
              console.error('Failed to save fabricated prop:', err);
            }
          }}
        />
      )}

      {/* Phase 3: Material View Modal for PBR maps */}
      {materialViewElement && (
        <MaterialViewModal
          isOpen={!!materialViewElement}
          onClose={() => setMaterialViewElement(null)}
          elementName={materialViewElement.name}
          pbrMaps={(materialViewElement.metadata as any)?.pbrMaps || {}}
        />
      )}
    </div>
  );
}

function ElementCard({
  element,
  onEdit,
  onUpdate,
  onDelete,
  onFabricate,
  onDeconstruct,
  onExtractMaterials,
  onViewMaterials,
  isProcessing,
  isSelected,
  onToggleSelection,
}: {
  element: StoreElement;
  onEdit: () => void;
  onUpdate: (id: string, updates: Partial<StoreElement>) => void;
  onDelete: (id: string) => void;
  onFabricate?: () => void;
  onDeconstruct?: () => void;
  onExtractMaterials?: () => void;
  onViewMaterials?: () => void;
  isProcessing?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Determine aspect ratio class
  // Logic:
  // 1. If type is explicitly 'character', force vertical (9:16).
  // 2. If metadata exists, use dimensions.
  // 3. Default to horizontal (16:9).
  const isVertical =
    element.type === 'character' ||
    (element.metadata as any)?.height > (element.metadata as any)?.width;

  const aspectRatioClass = isVertical ? 'aspect-[9/16]' : 'aspect-[16/9]';

  const handleMouseEnter = () => {
    if (element.type === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {}); // Ignore autoplay errors
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
                    ${
                      element.type === 'video'
                        ? `<video src="${element.url}" controls autoplay loop></video>`
                        : `<img src="${element.url}" alt="${element.name.replace(/"/g, '&quot;')}" />`
                    }
                </body>
            </html>
        `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    window.open(
      url,
      '_blank',
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
        'group relative z-10 h-48 cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all hover:z-20 hover:ring-2 hover:ring-blue-500',
        aspectRatioClass
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={e => {
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
          'absolute top-2 left-2 z-20 flex items-center gap-2 transition-opacity duration-200',
          isSelected || element.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        {onToggleSelection && (
          <div
            onClick={e => {
              e.stopPropagation();
              onToggleSelection();
            }}
          >
            <div
              className={clsx(
                'flex h-5 w-5 items-center justify-center rounded border transition-colors',
                isSelected
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-white/50 bg-black/50 hover:border-white hover:bg-black/70'
              )}
            >
              {isSelected && <CheckSquare className="h-3 w-3 text-white" />}
            </div>
          </div>
        )}
        <button
          onClick={handleFavorite}
          className="rounded-lg bg-black/50 p-1.5 text-white backdrop-blur-md transition-colors hover:bg-red-500/20"
        >
          <Heart
            className={clsx(
              'h-4 w-4',
              element.isFavorite ? 'fill-red-500 text-red-500' : 'text-white'
            )}
          />
        </button>
      </div>
      {element.type === 'video' ? (
        <video
          ref={videoRef}
          src={element.url}
          className="h-full w-full object-cover"
          muted
          playsInline
          onTimeUpdate={handleTimeUpdate}
        />
      ) : (
        <img src={element.url} alt={element.name} className="h-full w-full object-cover" />
      )}

      <div className="absolute inset-0 flex flex-col justify-between bg-black/50 p-3 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex items-start justify-end">
          <div className="flex gap-1">
            <button
              onClick={handleDownload}
              className="rounded-lg bg-black/50 p-1.5 text-white transition-colors hover:bg-white/20"
            >
              <Download className="h-4 w-4" />
            </button>
            {element.type !== 'video' && onFabricate && (
              <Tooltip content="Prop Fabricator">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onFabricate();
                  }}
                  className="rounded-lg bg-black/50 p-1.5 text-white transition-colors hover:bg-amber-500/20 hover:text-amber-400"
                >
                  <Wand2 className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
            {element.type !== 'video' && onDeconstruct && (
              <Tooltip content="Deconstruct to 3D">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (!isProcessing) onDeconstruct();
                  }}
                  disabled={isProcessing}
                  className={clsx(
                    'rounded-lg bg-black/50 p-1.5 transition-colors',
                    isProcessing
                      ? 'cursor-not-allowed text-gray-500'
                      : 'text-white hover:bg-cyan-500/20 hover:text-cyan-400'
                  )}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Box className="h-4 w-4" />
                  )}
                </button>
              </Tooltip>
            )}
            {element.type !== 'video' && onExtractMaterials && (
              <Tooltip content="Extract PBR Materials">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (!isProcessing) onExtractMaterials();
                  }}
                  disabled={isProcessing}
                  className={clsx(
                    'rounded-lg bg-black/50 p-1.5 transition-colors',
                    isProcessing
                      ? 'cursor-not-allowed text-gray-500'
                      : 'text-white hover:bg-purple-500/20 hover:text-purple-400'
                  )}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Layers className="h-4 w-4" />
                  )}
                </button>
              </Tooltip>
            )}
            {/* View existing PBR maps if available */}
            {element.type !== 'video' && onViewMaterials && (element.metadata as any)?.pbrMaps && (
              <Tooltip content="View PBR Materials">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onViewMaterials();
                  }}
                  className="rounded-lg bg-purple-500/30 p-1.5 text-purple-400 transition-colors hover:bg-purple-500/40"
                >
                  <Layers className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
            <button
              onClick={handleTrash}
              className="rounded-lg bg-black/50 p-1.5 text-white transition-colors hover:bg-red-500/20 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-auto flex items-center gap-2">
          {element.type === 'video' && <Film className="h-3 w-3 text-blue-400" />}
          <p className="flex-1 truncate text-xs font-medium text-white">{element.name}</p>
          <button
            onClick={e => {
              e.stopPropagation();
              onEdit();
            }}
            className="rounded-lg bg-black/50 p-1.5 text-white transition-colors hover:bg-white/20"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
