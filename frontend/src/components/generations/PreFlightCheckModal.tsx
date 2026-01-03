'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle,
  Image,
  Music,
  Video,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  validateModelInputs,
  getModelRequirements,
  getConstraintViolations,
  getModelConstraints,
  CurrentInputs,
  InputRequirement,
} from '@/lib/ModelConstraints';
import { ALL_MODELS } from '@/lib/ModelRegistry';

interface PreFlightCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  modelId: string;
  currentInputs: CurrentInputs;
  loraCount?: number;
  referenceCount?: number;
  hasNegativePrompt?: boolean;
}

interface CheckItem {
  id: string;
  label: string;
  description: string;
  status: 'pass' | 'fail' | 'warning';
  actionHint?: string;
}

/**
 * PreFlightCheckModal - The Validation Gate
 *
 * Pops up BEFORE clicking Generate to catch configuration errors:
 * - Missing required inputs (image, audio, video)
 * - LoRA incompatibilities
 * - Reference count violations
 * - Negative prompt on unsupported models
 */
export function PreFlightCheckModal({
  isOpen,
  onClose,
  onProceed,
  modelId,
  currentInputs,
  loraCount = 0,
  referenceCount = 0,
  hasNegativePrompt = false,
}: PreFlightCheckModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  // Get model info
  const model = useMemo(() => ALL_MODELS.find(m => m.id === modelId), [modelId]);
  const modelName = model?.name || modelId.split('/').pop() || 'Unknown Model';
  const constraints = useMemo(() => getModelConstraints(modelId), [modelId]);
  const requirements = useMemo(() => getModelRequirements(modelId), [modelId]);

  // Run all validations
  const checks = useMemo<CheckItem[]>(() => {
    const items: CheckItem[] = [];

    // 1. Check required inputs
    const inputValidation = validateModelInputs(modelId, currentInputs);
    if (inputValidation.missingInputs.length > 0) {
      inputValidation.missingInputs.forEach(req => {
        items.push({
          id: `missing-${req.input}`,
          label: `Missing ${req.label}`,
          description: req.description,
          status: 'fail',
          actionHint: getActionHint(req),
        });
      });
    } else if (requirements.length > 0) {
      // All required inputs present
      items.push({
        id: 'inputs-valid',
        label: 'Required inputs provided',
        description: `All ${requirements.length} required input(s) are ready`,
        status: 'pass',
      });
    }

    // 2. Check LoRA constraints
    if (loraCount > 0) {
      if (!constraints.supportsLoRA) {
        items.push({
          id: 'lora-unsupported',
          label: `LoRAs not supported`,
          description: `${modelName} doesn't support LoRAs. Remove all ${loraCount} LoRA(s) or switch models.`,
          status: 'fail',
          actionHint: 'Remove LoRAs from the LoRA Manager',
        });
      } else if (constraints.maxLoRAs && loraCount > constraints.maxLoRAs) {
        items.push({
          id: 'lora-exceeded',
          label: `Too many LoRAs`,
          description: `${modelName} supports max ${constraints.maxLoRAs} LoRAs, but you have ${loraCount}.`,
          status: 'fail',
          actionHint: `Remove ${loraCount - constraints.maxLoRAs} LoRA(s)`,
        });
      } else {
        items.push({
          id: 'lora-ok',
          label: `${loraCount} LoRA(s) ready`,
          description: `Within limit of ${constraints.maxLoRAs || 'unlimited'}`,
          status: 'pass',
        });
      }
    }

    // 3. Check reference count constraints
    if (constraints.minReferences && referenceCount < constraints.minReferences) {
      items.push({
        id: 'ref-min',
        label: `Need more references`,
        description: `${modelName} requires at least ${constraints.minReferences} reference image(s). You have ${referenceCount}.`,
        status: 'fail',
        actionHint: 'Add reference images in Element Picker',
      });
    }
    if (constraints.maxReferences && referenceCount > constraints.maxReferences) {
      items.push({
        id: 'ref-max',
        label: `Too many references`,
        description: `${modelName} supports max ${constraints.maxReferences} reference(s). You have ${referenceCount}.`,
        status: 'fail',
        actionHint: `Remove ${referenceCount - constraints.maxReferences} reference(s)`,
      });
    }

    // 4. Check negative prompt support
    if (hasNegativePrompt && !constraints.supportsNegativePrompt) {
      items.push({
        id: 'neg-prompt-unsupported',
        label: 'Negative prompt ignored',
        description: `${modelName} doesn't use negative prompts. Use prompt weighting instead.`,
        status: 'warning',
        actionHint: 'Consider removing negative prompt or switching models',
      });
    }

    // 5. Check NSFW filter warnings
    if (constraints.nsfwStrength === 'strict') {
      items.push({
        id: 'nsfw-strict',
        label: 'Strict content filter',
        description: `${modelName} has strict NSFW filtering. Some prompts may be rejected.`,
        status: 'warning',
      });
    }

    // If no checks at all, add a general pass
    if (items.length === 0) {
      items.push({
        id: 'all-good',
        label: 'Ready to generate',
        description: 'No configuration issues detected',
        status: 'pass',
      });
    }

    return items;
  }, [
    modelId,
    modelName,
    currentInputs,
    constraints,
    requirements,
    loraCount,
    referenceCount,
    hasNegativePrompt,
  ]);

  // Determine if we can proceed
  const hasFailures = checks.some(c => c.status === 'fail');
  const hasWarnings = checks.some(c => c.status === 'warning');
  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const warnCount = checks.filter(c => c.status === 'warning').length;

  // Animation on open
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={clsx(
          'relative w-full max-w-md rounded-2xl border bg-zinc-900 shadow-2xl transition-all duration-300',
          hasFailures
            ? 'border-red-500/50'
            : hasWarnings
              ? 'border-amber-500/50'
              : 'border-green-500/50',
          isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            {hasFailures ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
            ) : hasWarnings ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-white">Pre-Flight Check</h2>
              <p className="text-xs text-gray-400">{modelName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Check Items */}
        <div className="max-h-[400px] space-y-2 overflow-y-auto p-5">
          {checks.map(check => (
            <div
              key={check.id}
              className={clsx(
                'rounded-xl border p-4 transition-all',
                check.status === 'fail'
                  ? 'border-red-500/30 bg-red-500/10'
                  : check.status === 'warning'
                    ? 'border-amber-500/30 bg-amber-500/10'
                    : 'border-green-500/30 bg-green-500/10'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {check.status === 'fail' ? (
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  ) : check.status === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={clsx(
                      'font-medium',
                      check.status === 'fail'
                        ? 'text-red-300'
                        : check.status === 'warning'
                          ? 'text-amber-300'
                          : 'text-green-300'
                    )}
                  >
                    {check.label}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">{check.description}</p>
                  {check.actionHint && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-cyan-400">
                      <ArrowRight className="h-3 w-3" />
                      {check.actionHint}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary & Actions */}
        <div className="border-t border-white/10 px-5 py-4">
          {/* Summary badges */}
          <div className="mb-4 flex items-center gap-3">
            {passCount > 0 && (
              <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400">
                {passCount} passed
              </span>
            )}
            {warnCount > 0 && (
              <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400">
                {warnCount} warning{warnCount > 1 ? 's' : ''}
              </span>
            )}
            {failCount > 0 && (
              <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400">
                {failCount} failed
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-white transition-all hover:bg-white/10"
            >
              Go Back
            </button>
            <button
              onClick={onProceed}
              disabled={hasFailures}
              className={clsx(
                'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium transition-all',
                hasFailures
                  ? 'cursor-not-allowed bg-gray-700 text-gray-400'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500'
              )}
            >
              <Sparkles className="h-4 w-4" />
              {hasFailures ? 'Fix Issues First' : hasWarnings ? 'Generate Anyway' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper: Get action hint for missing input types
 */
function getActionHint(req: InputRequirement): string {
  switch (req.input) {
    case 'image':
      return 'Add an image in the Element Picker or drag one to the canvas';
    case 'audio':
      return 'Click the Audio button in the toolbar to add audio';
    case 'motionVideo':
      return 'Add a driving video for motion transfer';
    case 'sourceVideo':
      return 'Add a source video to process';
    case 'mask':
      return 'Draw or upload a mask for inpainting';
    case 'faceReference':
      return 'Add a face image for identity preservation';
    default:
      return 'Add the required input';
  }
}

/**
 * Hook to build CurrentInputs from Generate page state
 */
export function usePreFlightInputs(
  selectedElementIds: string[],
  elements: { id: string; type: string }[],
  audioFile: File | null,
  audioUrl: string | null,
  styleConfig?: { referenceImage?: File | string | null }
): CurrentInputs {
  return useMemo(() => {
    // Check what types of elements are selected
    const selectedElements = elements.filter(e => selectedElementIds.includes(e.id));
    const hasImage =
      selectedElements.some(e => e.type === 'image') || !!styleConfig?.referenceImage;
    const hasAudio = !!audioFile || !!audioUrl;
    const hasMotionVideo = selectedElements.some(e => e.type === 'video'); // Could be used as motion driver
    const hasSourceVideo = selectedElements.some(e => e.type === 'video');
    const hasMask = false; // Would need separate mask state
    const hasFaceReference = hasImage; // Face refs come from image elements

    return {
      hasImage,
      hasAudio,
      hasMotionVideo,
      hasSourceVideo,
      hasMask,
      hasFaceReference,
    };
  }, [selectedElementIds, elements, audioFile, audioUrl, styleConfig]);
}
