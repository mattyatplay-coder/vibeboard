'use client';

import React, { useState, useRef } from 'react';
import {
  Loader2,
  Upload,
  Type,
  Sparkles,
  X,
  Download,
  Copy,
  Check,
  ImageIcon,
  Wand2,
  Languages,
  Palette,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip } from '@/components/ui/Tooltip';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface TextFixerPanelProps {
  initialImageUrl?: string;
}

const TEXT_PRESETS = [
  {
    label: 'Fix Gibberish',
    prompt: 'Fix any gibberish or unreadable text, make it clean and legible',
  },
  { label: 'English', prompt: 'Translate all text to English while matching the original style' },
  {
    label: 'Japanese',
    prompt: 'Translate all text to Japanese (kanji/hiragana) while matching the original style',
  },
  { label: 'Remove Text', prompt: 'Remove all text completely, fill with appropriate background' },
];

const STYLE_OPTIONS = [
  { value: 'match', label: 'Match Original' },
  { value: 'bold', label: 'Bold Sans-serif' },
  { value: 'elegant', label: 'Elegant Serif' },
  { value: 'handwritten', label: 'Handwritten' },
  { value: 'neon', label: 'Neon Glow' },
  { value: 'vintage', label: 'Vintage/Retro' },
];

export function TextFixerPanel({ initialImageUrl }: TextFixerPanelProps) {
  const [baseImage, setBaseImage] = useState<string | null>(initialImageUrl || null);
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [textInstruction, setTextInstruction] = useState('');
  const [matchStyle, setMatchStyle] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState('match');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    const localUrl = URL.createObjectURL(file);
    setBaseImage(localUrl);
    setBaseFile(file);
    setResultImage(null);
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

  const handleFixText = async () => {
    if (!baseImage || !textInstruction.trim()) {
      toast.error('Please upload an image and describe the text fix');
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading('Fixing text...');

    try {
      // Upload image if it's a local file
      let imageUrl = baseImage;
      if (baseFile) {
        imageUrl = await uploadToServer(baseFile);
      } else if (baseImage && !baseImage.startsWith('http')) {
        imageUrl = `${BACKEND_URL}${baseImage}`;
      }

      // Build the instruction with style guidance
      let fullInstruction = textInstruction.trim();
      if (!matchStyle && selectedStyle !== 'match') {
        fullInstruction += `. Use ${selectedStyle} text style`;
      }

      const res = await fetch(`${BACKEND_URL}/api/qwen/fix-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          textInstruction: fullInstruction,
          matchStyle,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Text fix failed');
      }

      const result = await res.json();
      if (result.status === 'succeeded' && result.outputs && result.outputs.length > 0) {
        setResultImage(result.outputs[0]);
        toast.success('Text fixed!', { id: toastId });
      } else {
        throw new Error(result.error || 'No output generated');
      }
    } catch (err: any) {
      console.error('Text fix failed:', err);
      toast.error(err.message || 'Text fix failed', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePresetClick = (preset: (typeof TEXT_PRESETS)[0]) => {
    setTextInstruction(preset.prompt);
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
      link.download = `text-fixed-${Date.now()}.png`;
      link.click();
    }
  };

  const handleUseAsBase = () => {
    if (resultImage) {
      setBaseImage(resultImage);
      setBaseFile(null);
      setResultImage(null);
      toast.success('Result set as new base image');
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Type className="h-6 w-6 text-emerald-400" />
        <div>
          <h2 className="text-lg font-bold">Text & Sign Fixer</h2>
          <p className="text-xs text-white/50">
            Fix gibberish text, translate signs, or correct typography
          </p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Left: Image upload */}
        <div className="flex w-1/3 flex-col gap-4">
          <span className="text-sm font-medium text-white/70">Source Image</span>
          <div
            className="relative flex flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/20 bg-black/30"
            onClick={() => fileInputRef.current?.click()}
          >
            {baseImage ? (
              <div className="relative h-full w-full">
                <img src={baseImage} alt="Source" className="h-full w-full object-contain" />
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setBaseImage(null);
                    setBaseFile(null);
                    setResultImage(null);
                  }}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1 hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-white/30">
                <Upload className="h-10 w-10" />
                <span className="text-sm">Click to upload image with text</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </div>
        </div>

        {/* Right: Controls & result */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {/* Quick Presets */}
          <div>
            <span className="text-sm font-medium text-white/70">Quick Actions</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {TEXT_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-300"
                >
                  {preset.label === 'English' || preset.label === 'Japanese' ? (
                    <Languages className="h-3 w-3" />
                  ) : preset.label === 'Remove Text' ? (
                    <X className="h-3 w-3" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text instruction */}
          <div>
            <span className="text-sm font-medium text-white/70">Text Instruction</span>
            <textarea
              value={textInstruction}
              onChange={e => setTextInstruction(e.target.value)}
              placeholder="Describe what to do with the text... e.g., 'Change the sign to say DANGER in red' or 'Translate the Japanese text to English WELCOME'"
              className="mt-2 h-24 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>

          {/* Style options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={matchStyle}
                onChange={e => setMatchStyle(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-white/70">Match original style</span>
            </label>

            {!matchStyle && (
              <select
                value={selectedStyle}
                onChange={e => setSelectedStyle(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
              >
                {STYLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Fix button */}
          <button
            onClick={handleFixText}
            disabled={isProcessing || !baseImage || !textInstruction.trim()}
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 font-medium text-black transition-all hover:bg-emerald-400 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Type className="h-5 w-5" />
                Fix Text
              </>
            )}
          </button>

          {/* Result */}
          {resultImage && (
            <div className="flex flex-1 flex-col gap-2 overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-emerald-300">Result</span>
                <div className="flex gap-2">
                  <Tooltip content="Copy URL">
                    <button onClick={handleCopyUrl} className="rounded p-1 hover:bg-white/10">
                      {copied ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </Tooltip>
                  <Tooltip content="Download">
                    <button onClick={handleDownload} className="rounded p-1 hover:bg-white/10">
                      <Download className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Use as new base">
                    <button onClick={handleUseAsBase} className="rounded p-1 hover:bg-white/10">
                      <Sparkles className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </div>
              </div>
              <div className="flex-1 overflow-hidden rounded-lg">
                <img src={resultImage} alt="Fixed text" className="h-full w-full object-contain" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
