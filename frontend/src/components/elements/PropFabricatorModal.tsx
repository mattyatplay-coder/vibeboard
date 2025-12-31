'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  X,
  Wand2,
  Download,
  Copy,
  Check,
  Sparkles,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip } from '@/components/ui/Tooltip';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface PropFabricatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  propImageUrl: string;
  propName: string;
  onSaveResult?: (imageUrl: string, name: string) => void;
}

const TRANSFORM_PRESETS = [
  { label: 'Cyberpunk', prompt: 'transform into a futuristic cyberpunk version with neon lights and chrome accents' },
  { label: 'Steampunk', prompt: 'transform into a Victorian steampunk version with brass, gears, and copper pipes' },
  { label: 'Fantasy', prompt: 'transform into a magical fantasy version with runes, crystals, and enchanted glow' },
  { label: 'Rustic', prompt: 'transform into an aged rustic version with weathered wood and vintage patina' },
  { label: 'Sci-Fi', prompt: 'transform into a sleek sci-fi version with holographic elements and alien technology' },
  { label: 'Horror', prompt: 'transform into a dark horror version with blood stains, rust, and decay' },
];

export function PropFabricatorModal({
  isOpen,
  onClose,
  propImageUrl,
  propName,
  onSaveResult,
}: PropFabricatorModalProps) {
  const [transformPrompt, setTransformPrompt] = useState('');
  const [maintainPerspective, setMaintainPerspective] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTransform = async () => {
    if (!transformPrompt.trim()) {
      toast.error('Please describe how to transform the prop');
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading('Fabricating prop...');

    try {
      const res = await fetch(`${BACKEND_URL}/api/qwen/fabricate-prop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propImage: propImageUrl.startsWith('http') ? propImageUrl : `${BACKEND_URL}${propImageUrl}`,
          transformDescription: transformPrompt.trim(),
          maintainPerspective,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Fabrication failed');
      }

      const result = await res.json();
      if (result.status === 'succeeded' && result.outputs && result.outputs.length > 0) {
        setResultImage(result.outputs[0]);
        toast.success('Prop fabricated!', { id: toastId });
      } else {
        throw new Error(result.error || 'No output generated');
      }
    } catch (err: any) {
      console.error('Prop fabrication failed:', err);
      toast.error(err.message || 'Fabrication failed', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePresetClick = (preset: typeof TRANSFORM_PRESETS[0]) => {
    setTransformPrompt(preset.prompt);
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
      link.download = `${propName}-fabricated-${Date.now()}.png`;
      link.click();
    }
  };

  const handleSaveAsElement = () => {
    if (resultImage && onSaveResult) {
      onSaveResult(resultImage, `${propName} (Fabricated)`);
      toast.success('Saved as new element');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div className="flex items-center gap-3">
              <Layers className="h-6 w-6 text-amber-400" />
              <div>
                <h2 className="text-lg font-bold">Prop Fabricator</h2>
                <p className="text-xs text-white/50">
                  Transform props while preserving geometry & perspective
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-1 gap-6 overflow-hidden p-6">
            {/* Left: Original prop */}
            <div className="flex w-1/3 flex-col gap-4">
              <div>
                <span className="text-sm font-medium text-white/70">Original Prop</span>
                <p className="text-xs text-white/40 mt-1 truncate">{propName}</p>
              </div>
              <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/30">
                <img
                  src={propImageUrl}
                  alt={propName}
                  className="h-48 w-full object-contain"
                />
              </div>

              {/* Maintain Perspective toggle */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={maintainPerspective}
                  onChange={e => setMaintainPerspective(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-white/70">Maintain perspective & geometry</span>
              </label>
            </div>

            {/* Right: Transform controls & result */}
            <div className="flex flex-1 flex-col gap-4">
              {/* Presets */}
              <div>
                <span className="text-sm font-medium text-white/70">Quick Presets</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TRANSFORM_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => handlePresetClick(preset)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-all hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-300"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom prompt */}
              <div>
                <span className="text-sm font-medium text-white/70">Transform Description</span>
                <textarea
                  value={transformPrompt}
                  onChange={e => setTransformPrompt(e.target.value)}
                  placeholder="Describe how to transform this prop... e.g., 'Turn this sword into a glowing lightsaber' or 'Make this car look like a Mad Max vehicle'"
                  className="mt-2 h-24 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-amber-500/50 focus:outline-none"
                />
              </div>

              {/* Transform button */}
              <button
                onClick={handleTransform}
                disabled={isProcessing || !transformPrompt.trim()}
                className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 font-medium text-black transition-all hover:bg-amber-400 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Fabricating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5" />
                    Fabricate Prop
                  </>
                )}
              </button>

              {/* Result */}
              {resultImage && (
                <div className="flex flex-1 flex-col gap-2 overflow-hidden rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-amber-300">Result</span>
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
                      alt="Fabricated prop"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
