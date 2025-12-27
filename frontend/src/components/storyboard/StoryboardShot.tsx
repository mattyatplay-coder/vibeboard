'use client';

import React, { useState, useRef } from 'react';
import {
  Play,
  Upload,
  Trash2,
  GripVertical,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  Video,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';

export interface ShotData {
  id: string;
  orderIndex: number;
  prompt: string;
  duration: number;
  firstFrameUrl?: string | null;
  lastFrameUrl?: string | null;
  outputUrl?: string | null;
  status: 'pending' | 'generating' | 'complete' | 'failed';
  failureReason?: string | null;
}

interface StoryboardShotProps {
  shot: ShotData;
  sceneTitle?: string;
  sceneDescription?: string;
  onUpdate: (id: string, updates: Partial<ShotData>) => void;
  onDelete: (id: string) => void;
  onGenerate: (id: string) => void;
  onUploadFrame: (id: string, frameType: 'first' | 'last', file: File) => void;
  onEnhancePrompt?: (id: string) => void;
  isGenerating?: boolean;
  dragHandleProps?: any;
}

export default function StoryboardShot({
  shot,
  sceneTitle,
  sceneDescription,
  onUpdate,
  onDelete,
  onGenerate,
  onUploadFrame,
  onEnhancePrompt,
  isGenerating = false,
  dragHandleProps,
}: StoryboardShotProps) {
  const [isHoveringFirst, setIsHoveringFirst] = useState(false);
  const [isHoveringLast, setIsHoveringLast] = useState(false);
  const [isHoveringPreview, setIsHoveringPreview] = useState(false);
  const firstFrameInputRef = useRef<HTMLInputElement>(null);
  const lastFrameInputRef = useRef<HTMLInputElement>(null);

  const handleFrameUpload =
    (frameType: 'first' | 'last') => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onUploadFrame(shot.id, frameType, file);
      }
    };

  return (
    <TooltipProvider>
    <div className="flex gap-4">
      {/* Left Panel - Scene Info */}
      <div className="flex w-80 flex-shrink-0 flex-col rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
        {/* Scene Title & Description */}
        <div className="mb-4 flex items-start gap-2">
          <div
            {...dragHandleProps}
            className="mt-1 cursor-grab text-gray-500 hover:text-white active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">
              {sceneTitle || `Shot ${shot.orderIndex + 1}`}
            </h3>
            {sceneDescription && (
              <p className="mt-1 line-clamp-3 text-sm text-gray-400">{sceneDescription}</p>
            )}
          </div>
          <Tooltip content="Delete shot" side="top">
            <button
              onClick={() => onDelete(shot.id)}
              className="rounded p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>

        {/* Location & Style (placeholder rows) */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/30 px-3 py-2">
            <span className="text-sm text-gray-500">⊘</span>
            <span className="flex-1 text-sm text-gray-400">LOCATION</span>
            <span className="text-xs text-gray-600">○</span>
            <span className="text-gray-500">›</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/30 px-3 py-2">
            <span className="text-sm text-gray-500">✎</span>
            <span className="flex-1 text-sm text-gray-400">STYLE</span>
            <span className="text-xs text-gray-600">○</span>
            <span className="text-gray-500">›</span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Beginning & Ending Frame Uploads */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* Beginning Image */}
          <div
            className="relative"
            onMouseEnter={() => setIsHoveringFirst(true)}
            onMouseLeave={() => setIsHoveringFirst(false)}
          >
            <input
              ref={firstFrameInputRef}
              type="file"
              accept="image/*"
              onChange={handleFrameUpload('first')}
              className="hidden"
            />
            <div
              onClick={() => firstFrameInputRef.current?.click()}
              className={clsx(
                'aspect-video cursor-pointer overflow-hidden rounded-lg border-2 border-dashed transition-all',
                shot.firstFrameUrl
                  ? 'border-purple-500/50 bg-black/30'
                  : 'border-white/20 bg-black/20 hover:border-white/40 hover:bg-black/30'
              )}
            >
              {shot.firstFrameUrl ? (
                <>
                  <img
                    src={shot.firstFrameUrl}
                    alt="Beginning frame"
                    className="h-full w-full object-cover"
                  />
                  {isHoveringFirst && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60">
                      <span className="text-xs text-white">Replace</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                  <Upload className="h-4 w-4 text-gray-500" />
                </div>
              )}
            </div>
            <span className="mt-1 block text-center text-[10px] font-medium text-red-400">
              beginning image
              <br />
              upload & Preview
            </span>
          </div>

          {/* Ending Image */}
          <div
            className="relative"
            onMouseEnter={() => setIsHoveringLast(true)}
            onMouseLeave={() => setIsHoveringLast(false)}
          >
            <input
              ref={lastFrameInputRef}
              type="file"
              accept="image/*"
              onChange={handleFrameUpload('last')}
              className="hidden"
            />
            <div
              onClick={() => lastFrameInputRef.current?.click()}
              className={clsx(
                'aspect-video cursor-pointer overflow-hidden rounded-lg border-2 border-dashed transition-all',
                shot.lastFrameUrl
                  ? 'border-purple-500/50 bg-black/30'
                  : 'border-white/20 bg-black/20 hover:border-white/40 hover:bg-black/30'
              )}
            >
              {shot.lastFrameUrl ? (
                <>
                  <img
                    src={shot.lastFrameUrl}
                    alt="Ending frame"
                    className="h-full w-full object-cover"
                  />
                  {isHoveringLast && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60">
                      <span className="text-xs text-white">Replace</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                  <Upload className="h-4 w-4 text-gray-500" />
                </div>
              )}
            </div>
            <span className="mt-1 block text-center text-[10px] font-medium text-red-400">
              ending image
              <br />
              upload & Preview
            </span>
          </div>
        </div>
      </div>

      {/* Right Panel - Shot Card */}
      <div className="flex-1 overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
        {/* Video Preview Area */}
        <div
          className="relative bg-gradient-to-br from-gray-800/50 to-black/50"
          onMouseEnter={() => setIsHoveringPreview(true)}
          onMouseLeave={() => setIsHoveringPreview(false)}
        >
          {/* Shot Number Badge */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded bg-black/60 px-2 py-1 backdrop-blur-sm">
            <GripVertical className="h-3 w-3 text-gray-400" />
            <span className="text-sm font-medium text-white">{shot.orderIndex + 1}</span>
          </div>

          {/* Status Badge */}
          <div className="absolute top-3 right-3 z-10">
            {shot.status === 'generating' && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2 py-1 text-xs text-amber-400 backdrop-blur-sm">
                <Loader2 className="h-3 w-3 animate-spin" />
                Generating
              </div>
            )}
            {shot.status === 'complete' && (
              <div className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400 backdrop-blur-sm">
                <Check className="h-3 w-3" />
                Complete
              </div>
            )}
            {shot.status === 'failed' && (
              <div
                className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400 backdrop-blur-sm"
                title={shot.failureReason || ''}
              >
                <AlertCircle className="h-3 w-3" />
                Failed
              </div>
            )}
          </div>

          {/* Preview Content */}
          <div className="aspect-video">
            {shot.outputUrl ? (
              <video
                src={shot.outputUrl}
                className="h-full w-full object-cover"
                controls={isHoveringPreview}
                muted
                loop
                playsInline
                onMouseEnter={e => (e.target as HTMLVideoElement).play()}
                onMouseLeave={e => {
                  (e.target as HTMLVideoElement).pause();
                  (e.target as HTMLVideoElement).currentTime = 0;
                }}
              />
            ) : shot.firstFrameUrl ? (
              <img
                src={shot.firstFrameUrl}
                alt="Preview"
                className="h-full w-full object-cover opacity-60"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Video className="h-16 w-16 text-gray-700" />
              </div>
            )}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center gap-3 border-t border-white/5 bg-black/40 px-4 py-3">
          {/* Duration Input */}
          <div className="flex items-center overflow-hidden rounded bg-white">
            <span className="px-3 py-1.5 text-sm font-medium text-black">Duration</span>
            <input
              type="number"
              min={1}
              max={60}
              value={shot.duration}
              onChange={e => onUpdate(shot.id, { duration: parseInt(e.target.value) || 5 })}
              className="w-16 border-l border-gray-300 bg-gray-100 px-2 py-1.5 text-sm text-black focus:outline-none"
            />
          </div>

          <div className="flex-1" />

          {/* Generate Button */}
          <button
            onClick={() => onGenerate(shot.id)}
            disabled={isGenerating || shot.status === 'generating' || !shot.prompt.trim()}
            className={clsx(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              shot.status === 'generating' || isGenerating
                ? 'cursor-wait bg-gray-700 text-gray-400'
                : 'border border-white/10 bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]'
            )}
          >
            {shot.status === 'generating' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <span className="text-purple-400">✧</span>
                Generate Video
              </>
            )}
          </button>
        </div>

        {/* Prompt Area */}
        <div className="border-t border-white/5 px-4 py-3">
          <div className="relative">
            <textarea
              value={shot.prompt}
              onChange={e => onUpdate(shot.id, { prompt: e.target.value })}
              placeholder="Describe the action in this shot..."
              className="min-h-[80px] w-full resize-none bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
              disabled={shot.status === 'generating'}
            />
            {/* AI Enhance Button */}
            {onEnhancePrompt && (
              <Tooltip content="Enhance prompt with AI" side="top">
                <button
                  onClick={() => onEnhancePrompt(shot.id)}
                  className="absolute right-1 bottom-1 rounded p-1.5 text-purple-400 transition-colors hover:bg-purple-500/10 hover:text-purple-300"
                >
                  <Sparkles className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
          </div>

          {/* Shot Prompt Label */}
          <div className="mt-2 text-center text-xs text-gray-600">
            shot
            <br />
            prompt
          </div>
        </div>

        {/* Error Message */}
        {shot.failureReason && (
          <div className="border-t border-red-500/20 bg-red-500/10 px-4 py-2">
            <p className="text-xs text-red-400">{shot.failureReason}</p>
          </div>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
}
