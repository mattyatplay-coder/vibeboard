'use client';

import React, { useState, useRef } from 'react';
import {
  Loader2,
  Upload,
  Clapperboard,
  X,
  Download,
  Copy,
  Check,
  ImageIcon,
  Eye,
  Smile,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip } from '@/components/ui/Tooltip';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface AIReshootPanelProps {
  initialImageUrl?: string;
}

// Quick preset instructions for common reshoot fixes
const RESHOOT_PRESETS = [
  { label: 'Look at Camera', prompt: 'Make the character look directly at the camera', icon: Eye },
  { label: 'Smile', prompt: 'Change expression to a natural, warm smile', icon: Smile },
  { label: 'Close Mouth', prompt: 'Close the mouth naturally', icon: null },
  { label: 'Eyes Open', prompt: 'Open eyes fully and naturally', icon: Eye },
  { label: 'Turn Head Left', prompt: 'Turn the head slightly to the left', icon: RotateCcw },
  { label: 'Turn Head Right', prompt: 'Turn the head slightly to the right', icon: null },
  { label: 'More Serious', prompt: 'Change to a more serious, focused expression', icon: null },
  { label: 'Relaxed Pose', prompt: 'Make the pose more relaxed and natural', icon: null },
];

// Advanced instruction examples
const INSTRUCTION_EXAMPLES = [
  'Make the character wink with their left eye',
  'Change to a surprised expression',
  'Tilt head slightly down, looking up through eyebrows',
  'Add a subtle smirk to the left corner of mouth',
  'Make eye contact more intense and focused',
];

export function AIReshootPanel({ initialImageUrl }: AIReshootPanelProps) {
  const [baseImage, setBaseImage] = useState<string | null>(initialImageUrl || null);
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [instruction, setInstruction] = useState('');
  const [preserveBackground, setPreserveBackground] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    const localUrl = URL.createObjectURL(file);
    setBaseImage(localUrl);
    setBaseFile(file);
    setResultImage(null);
    setHistory([]);
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

  const handleReshoot = async () => {
    if (!baseImage || !instruction.trim()) {
      toast.error('Please upload an image and describe the change');
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading('Applying AI Reshoot...');

    try {
      // Upload image if it's a local file
      let imageUrl = baseImage;
      if (baseFile) {
        imageUrl = await uploadToServer(baseFile);
      } else if (baseImage && !baseImage.startsWith('http')) {
        imageUrl = `${BACKEND_URL}${baseImage}`;
      }

      const res = await fetch(`${BACKEND_URL}/api/qwen/reshoot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          instruction: instruction.trim(),
          preserveBackground,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Reshoot failed');
      }

      const result = await res.json();
      if (result.status === 'succeeded' && result.outputs && result.outputs.length > 0) {
        // Add current result to history before updating
        if (resultImage) {
          setHistory(prev => [...prev, resultImage]);
        }
        setResultImage(result.outputs[0]);
        toast.success('Reshoot complete!', { id: toastId });
      } else {
        throw new Error(result.error || 'No output generated');
      }
    } catch (err: any) {
      console.error('Reshoot failed:', err);
      toast.error(err.message || 'Reshoot failed', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePresetClick = (preset: (typeof RESHOOT_PRESETS)[0]) => {
    setInstruction(preset.prompt);
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
      link.download = `reshoot-${Date.now()}.png`;
      link.click();
    }
  };

  const handleUseAsBase = () => {
    if (resultImage) {
      setBaseImage(resultImage);
      setBaseFile(null);
      setResultImage(null);
      setInstruction('');
      toast.success('Result set as new base image');
    }
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const lastResult = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setResultImage(lastResult);
      toast.info('Reverted to previous result');
    }
  };

  return (
    <div className="flex h-full gap-6 overflow-hidden">
      {/* Left: Source Image Upload */}
      <div className="flex w-1/3 flex-col gap-4">
        <div className="flex items-center gap-2">
          <Clapperboard className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold">Source Image</h2>
        </div>

        <div
          className="group relative flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-white/5 transition-all hover:border-amber-500/50 hover:bg-white/10"
          onClick={() => fileInputRef.current?.click()}
          onDrop={e => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
              handleFileUpload(file);
            }
          }}
          onDragOver={e => e.preventDefault()}
        >
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

          {baseImage ? (
            <>
              <img
                src={baseImage}
                alt="Source"
                className="max-h-full max-w-full rounded-lg object-contain"
              />
              <button
                onClick={e => {
                  e.stopPropagation();
                  setBaseImage(null);
                  setBaseFile(null);
                  setResultImage(null);
                  setHistory([]);
                }}
                className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white/80 transition-colors hover:bg-red-600 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <Upload className="h-12 w-12 transition-colors group-hover:text-amber-400" />
              <span className="text-sm">Drop image or click to upload</span>
              <span className="text-xs text-gray-500">Supports JPG, PNG, WebP</span>
            </div>
          )}
        </div>
      </div>

      {/* Center: Controls */}
      <div className="flex w-1/3 flex-col gap-4 overflow-y-auto">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold">AI Reshoot Controls</h2>
        </div>

        {/* Quick Presets */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-300">Quick Fixes</h3>
          <div className="flex flex-wrap gap-2">
            {RESHOOT_PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  instruction === preset.prompt
                    ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white'
                }`}
              >
                {preset.icon && <preset.icon className="h-3 w-3" />}
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Instruction */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-300">Custom Instruction</h3>
          <textarea
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            placeholder="Describe what you want to change...&#10;e.g., 'Make character look at camera with a subtle smile'"
            rows={4}
            className="w-full resize-none rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-amber-500/50"
          />

          {/* Examples */}
          <div className="mt-3">
            <span className="text-xs text-gray-500">Examples:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {INSTRUCTION_EXAMPLES.slice(0, 3).map(example => (
                <button
                  key={example}
                  onClick={() => setInstruction(example)}
                  className="rounded border border-white/5 bg-black/30 px-2 py-0.5 text-[10px] text-gray-500 transition-colors hover:border-white/20 hover:text-gray-300"
                >
                  {example.length > 35 ? example.slice(0, 35) + '...' : example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-300">Options</h3>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={preserveBackground}
              onChange={e => setPreserveBackground(e.target.checked)}
              className="h-4 w-4 rounded border-white/30 bg-black/50 text-amber-500 focus:ring-amber-500/50"
            />
            <div>
              <span className="text-sm text-white">Preserve Background</span>
              <p className="text-xs text-gray-500">
                Keep the scene identical, only change the subject
              </p>
            </div>
          </label>
        </div>

        {/* Action Button */}
        <button
          onClick={handleReshoot}
          disabled={!baseImage || !instruction.trim() || isProcessing}
          className={`flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all ${
            baseImage && instruction.trim() && !isProcessing
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40'
              : 'cursor-not-allowed bg-gray-700 text-gray-500'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Clapperboard className="h-4 w-4" />
              Apply Reshoot
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        {/* Info Box */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs text-amber-300/80">
            <strong>AI Reshoot</strong> uses Qwen-2511 to make precise adjustments to expressions,
            gaze, and poses without regenerating the entire image. Perfect for fixing actors who
            aren&apos;t looking at the camera or need subtle expression changes.
          </p>
        </div>
      </div>

      {/* Right: Result Preview */}
      <div className="flex w-1/3 flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-green-400" />
            <h2 className="text-lg font-semibold">Result</h2>
          </div>
          {history.length > 0 && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-400 transition-colors hover:border-white/20 hover:text-white"
            >
              <RotateCcw className="h-3 w-3" />
              Undo
            </button>
          )}
        </div>

        <div className="relative flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5">
          {resultImage ? (
            <>
              <img
                src={resultImage}
                alt="Result"
                className="max-h-full max-w-full rounded-lg object-contain"
              />

              {/* Result Actions */}
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
                <Tooltip content="Copy URL">
                  <button
                    onClick={handleCopyUrl}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/70 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20"
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
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/70 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </Tooltip>
                <Tooltip content="Use as New Base">
                  <button
                    onClick={handleUseAsBase}
                    className="flex items-center gap-1 rounded-lg bg-amber-500/80 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-amber-400"
                  >
                    <ArrowRight className="h-3 w-3" />
                    Iterate
                  </button>
                </Tooltip>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <ImageIcon className="h-12 w-12" />
              <span className="text-sm">Result will appear here</span>
              {baseImage && instruction.trim() && (
                <span className="text-xs text-amber-400/60">Ready to reshoot</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
