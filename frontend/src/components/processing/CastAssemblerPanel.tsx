'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Loader2,
  Upload,
  Users,
  Sparkles,
  X,
  Plus,
  ImageIcon,
  Wand2,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip } from '@/components/ui/Tooltip';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface CharacterSlot {
  id: string;
  imageUrl: string | null;
  file: File | null;
  label: string;
}

interface CastAssemblerPanelProps {
  projectId?: string;
  onSaveResult?: (imageUrl: string) => void;
}

const ASPECT_RATIOS = [
  { value: 'landscape_16_9', label: '16:9 Landscape' },
  { value: 'landscape_4_3', label: '4:3 Landscape' },
  { value: 'square_hd', label: '1:1 Square' },
  { value: 'portrait_4_3', label: '4:3 Portrait' },
  { value: 'portrait_16_9', label: '9:16 Portrait' },
];

export function CastAssemblerPanel({ projectId, onSaveResult }: CastAssemblerPanelProps) {
  const [characters, setCharacters] = useState<CharacterSlot[]>([
    { id: '1', imageUrl: null, file: null, label: 'Character 1' },
    { id: '2', imageUrl: null, file: null, label: 'Character 2' },
  ]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [sceneDescription, setSceneDescription] = useState('');
  const [aspectRatio, setAspectRatio] = useState('landscape_16_9');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  const handleAddCharacter = () => {
    if (characters.length >= 4) {
      toast.error('Maximum 4 characters allowed');
      return;
    }
    const newId = String(characters.length + 1);
    setCharacters([
      ...characters,
      { id: newId, imageUrl: null, file: null, label: `Character ${newId}` },
    ]);
  };

  const handleRemoveCharacter = (id: string) => {
    if (characters.length <= 2) {
      toast.error('Minimum 2 characters required');
      return;
    }
    setCharacters(characters.filter(c => c.id !== id));
  };

  const handleCharacterUpload = async (id: string, file: File) => {
    // Create local preview URL
    const localUrl = URL.createObjectURL(file);
    setCharacters(
      characters.map(c => (c.id === id ? { ...c, imageUrl: localUrl, file } : c))
    );
  };

  const handleBackgroundUpload = async (file: File) => {
    const localUrl = URL.createObjectURL(file);
    setBackgroundImage(localUrl);
    setBackgroundFile(file);
  };

  const uploadToServer = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BACKEND_URL}/api/process/upload-temp`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    const rawUrl = data.url || data.fileUrl;
    return rawUrl.startsWith('http') ? rawUrl : `${BACKEND_URL}${rawUrl}`;
  };

  const handleAssemble = async () => {
    const filledCharacters = characters.filter(c => c.file);
    if (filledCharacters.length < 2) {
      toast.error('Please add at least 2 character images');
      return;
    }
    if (!sceneDescription.trim()) {
      toast.error('Please describe the scene');
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading('Assembling cast...');

    try {
      // Upload all character images to server
      const uploadPromises = filledCharacters.map(async c => {
        if (c.file) {
          return uploadToServer(c.file);
        }
        return c.imageUrl!;
      });
      const characterUrls = await Promise.all(uploadPromises);

      // Upload background if provided
      let bgUrl: string | undefined;
      if (backgroundFile) {
        bgUrl = await uploadToServer(backgroundFile);
      }

      // Call the Qwen assemble endpoint
      const res = await fetch(`${BACKEND_URL}/api/qwen/assemble`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterImages: characterUrls,
          sceneDescription: sceneDescription.trim(),
          backgroundImage: bgUrl,
          imageSize: aspectRatio,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Assembly failed');
      }

      const result = await res.json();
      if (result.status === 'succeeded' && result.outputs && result.outputs.length > 0) {
        const outputUrl = result.outputs[0];
        setResultImage(outputUrl);
        toast.success('Cast assembled successfully!', { id: toastId });
      } else {
        throw new Error(result.error || 'No output generated');
      }
    } catch (err: any) {
      console.error('Cast assembly failed:', err);
      toast.error(err.message || 'Assembly failed', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyUrl = () => {
    if (resultImage) {
      navigator.clipboard.writeText(resultImage);
      setCopied(true);
      toast.success('URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (resultImage) {
      const link = document.createElement('a');
      link.href = resultImage;
      link.download = `cast-assembly-${Date.now()}.png`;
      link.click();
    }
  };

  const handleSaveAsElement = () => {
    if (resultImage && onSaveResult) {
      onSaveResult(resultImage);
      toast.success('Saved as project element');
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-purple-400" />
        <div>
          <h2 className="text-lg font-bold">Cast Assembler</h2>
          <p className="text-xs text-white/50">
            Combine multiple characters into one scene (solves multi-LoRA bleeding)
          </p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Left side: Character slots */}
        <div className="flex w-1/2 flex-col gap-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Characters ({characters.length}/4)</span>
            <button
              onClick={handleAddCharacter}
              disabled={characters.length >= 4}
              className="flex items-center gap-1 rounded-lg bg-purple-500/20 px-2 py-1 text-xs text-purple-300 hover:bg-purple-500/30 disabled:opacity-50"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {characters.map(char => (
              <div
                key={char.id}
                className="relative flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-3"
              >
                {/* Remove button */}
                {characters.length > 2 && (
                  <button
                    onClick={() => handleRemoveCharacter(char.id)}
                    className="absolute -right-2 -top-2 rounded-full bg-red-500/80 p-1 text-white hover:bg-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}

                {/* Image area */}
                <div
                  className="relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/20 bg-black/30"
                  onClick={() => fileInputRefs.current[char.id]?.click()}
                >
                  {char.imageUrl ? (
                    <img
                      src={char.imageUrl}
                      alt={char.label}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-white/30">
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-xs">Click to upload</span>
                    </div>
                  )}
                  <input
                    ref={el => {
                      fileInputRefs.current[char.id] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleCharacterUpload(char.id, file);
                    }}
                  />
                </div>

                {/* Label */}
                <input
                  type="text"
                  value={char.label}
                  onChange={e =>
                    setCharacters(
                      characters.map(c =>
                        c.id === char.id ? { ...c, label: e.target.value } : c
                      )
                    )
                  }
                  className="rounded border border-white/10 bg-black/30 px-2 py-1 text-center text-xs text-white"
                  placeholder="Character name"
                />
              </div>
            ))}
          </div>

          {/* Background image (optional) */}
          <div className="mt-2">
            <span className="text-sm font-medium text-white/70">Background (optional)</span>
            <div
              className="mt-2 flex h-24 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/20 bg-black/30"
              onClick={() => backgroundInputRef.current?.click()}
            >
              {backgroundImage ? (
                <div className="relative h-full w-full">
                  <img
                    src={backgroundImage}
                    alt="Background"
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setBackgroundImage(null);
                      setBackgroundFile(null);
                    }}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-white/30">
                  <Upload className="h-5 w-5" />
                  <span className="text-xs">Click to add background scene</span>
                </div>
              )}
              <input
                ref={backgroundInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleBackgroundUpload(file);
                }}
              />
            </div>
          </div>
        </div>

        {/* Right side: Scene description & result */}
        <div className="flex w-1/2 flex-col gap-4">
          {/* Scene description */}
          <div>
            <label className="mb-1 block text-sm font-medium">Scene Description</label>
            <textarea
              value={sceneDescription}
              onChange={e => setSceneDescription(e.target.value)}
              placeholder="Describe how the characters should interact in the scene... e.g., 'The two friends are sitting at a coffee shop table, laughing together'"
              className="h-24 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none"
            />
          </div>

          {/* Aspect ratio */}
          <div>
            <label className="mb-1 block text-sm font-medium">Aspect Ratio</label>
            <select
              value={aspectRatio}
              onChange={e => setAspectRatio(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-purple-500/50 focus:outline-none"
            >
              {ASPECT_RATIOS.map(ar => (
                <option key={ar.value} value={ar.value}>
                  {ar.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assemble button */}
          <button
            onClick={handleAssemble}
            disabled={isProcessing || characters.filter(c => c.file).length < 2}
            className="flex items-center justify-center gap-2 rounded-lg bg-purple-500 px-4 py-3 font-medium text-white transition-all hover:bg-purple-600 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Assembling...
              </>
            ) : (
              <>
                <Wand2 className="h-5 w-5" />
                Assemble Cast
              </>
            )}
          </button>

          {/* Result */}
          {resultImage && (
            <div className="flex flex-1 flex-col gap-2 overflow-hidden rounded-lg border border-purple-500/30 bg-purple-500/10 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-purple-300">Result</span>
                <div className="flex gap-2">
                  <Tooltip content="Copy URL">
                    <button
                      onClick={handleCopyUrl}
                      className="rounded p-1 hover:bg-white/10"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </Tooltip>
                  <Tooltip content="Download">
                    <button
                      onClick={handleDownload}
                      className="rounded p-1 hover:bg-white/10"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  {onSaveResult && (
                    <Tooltip content="Save as Element">
                      <button
                        onClick={handleSaveAsElement}
                        className="rounded p-1 hover:bg-white/10"
                      >
                        <Sparkles className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-hidden rounded-lg">
                <img
                  src={resultImage}
                  alt="Assembled cast"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
