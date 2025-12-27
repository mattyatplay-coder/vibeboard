/**
 * Render Queue Panel
 *
 * Multi-pass rendering controls for draft → review → master workflow.
 * Shows cost savings and allows quality tier selection.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import * as Tooltip from '@radix-ui/react-tooltip';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Zap,
  Star,
  Crown,
  ChevronUp,
  ChevronDown,
  TrendingDown,
  Loader2,
  ArrowUpCircle,
  Layers,
  SplitSquareHorizontal,
  Film,
  Eye,
  CheckCheck,
  Archive,
} from 'lucide-react';
import { ABLightbox } from './ABLightbox';
import { BACKEND_URL } from '@/lib/api';

// Reusable Tooltip wrapper component
function InfoTooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  return (
    <Tooltip.Root delayDuration={100}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="z-50 max-w-xs rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs text-gray-200 shadow-xl"
          sideOffset={5}
        >
          {content}
          <Tooltip.Arrow className="fill-gray-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

type RenderQuality = 'draft' | 'review' | 'master';
type RenderPassStatus = 'pending' | 'queued' | 'generating' | 'complete' | 'failed' | 'skipped';

interface QualityPreset {
  id: string;
  name: string;
  quality: RenderQuality;
  description: string;
  imageModel: string;
  videoModel: string;
  imageCost: number;
  videoCost: number;
  estimatedTimeImage: number;
  estimatedTimeVideo: number;
}

interface RenderPass {
  id: string;
  shotId: string;
  quality: RenderQuality;
  orderIndex: number;
  status: RenderPassStatus;
  outputUrl?: string;
  actualCost?: number;
}

interface RenderJob {
  id: string;
  sceneChainId: string;
  projectId: string;
  name: string;
  targetQualities: RenderQuality[];
  activeQuality: RenderQuality;
  totalPasses: number;
  completedPasses: number;
  failedPasses: number;
  estimatedCost: number;
  actualCost: number;
  status: 'pending' | 'rendering' | 'paused' | 'complete' | 'failed';
  passes: RenderPass[];
}

interface CostComparison {
  draftCost: number;
  masterCost: number;
  savings: number;
  savingsPercent: number;
}

interface VersionStack {
  shotId: string;
  shotName: string;
  versions: Array<{
    passId: string;
    quality: RenderQuality;
    status: RenderPassStatus;
    outputUrl?: string;
    thumbnailUrl?: string;
    seed?: number;
    model: string;
    cost?: number;
    createdAt: string;
  }>;
  activeVersion: RenderQuality;
  canUpgrade: boolean;
  nextUpgradeQuality?: RenderQuality;
  upgradeCost?: number;
}

interface RenderQueuePanelProps {
  projectId: string;
  sceneChainId: string;
  shotCount: number;
  onRenderComplete?: (quality: RenderQuality, outputs: string[]) => void;
}

const QUALITY_ICONS: Record<RenderQuality, React.ReactNode> = {
  draft: <Zap className="h-4 w-4" />,
  review: <Star className="h-4 w-4" />,
  master: <Crown className="h-4 w-4" />,
};

const QUALITY_COLORS: Record<RenderQuality, string> = {
  draft: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
  review: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  master: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
};

const STATUS_COLORS: Record<RenderPassStatus, string> = {
  pending: 'text-gray-400',
  queued: 'text-yellow-400',
  generating: 'text-blue-400',
  complete: 'text-green-400',
  failed: 'text-red-400',
  skipped: 'text-gray-500',
};

export function RenderQueuePanel({
  projectId,
  sceneChainId,
  shotCount,
  onRenderComplete,
}: RenderQueuePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [presets, setPresets] = useState<Record<RenderQuality, QualityPreset> | null>(null);
  const [selectedQualities, setSelectedQualities] = useState<RenderQuality[]>(['draft']);
  const [currentJob, setCurrentJob] = useState<RenderJob | null>(null);
  const [costComparison, setCostComparison] = useState<CostComparison | null>(null);
  const [versionStacks, setVersionStacks] = useState<VersionStack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [promotingShot, setPromotingShot] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxShotId, setLightboxShotId] = useState<string | undefined>(undefined);
  const [burnInMetadata, setBurnInMetadata] = useState(false); // Refinement C: Watermark toggle
  const [approvedShots, setApprovedShots] = useState<Set<string>>(new Set()); // Shots with approved masters
  const [pendingReviewShots, setPendingReviewShots] = useState<Set<string>>(new Set()); // Shots awaiting review

  // Fetch presets on mount
  useEffect(() => {
    fetchPresets();
    fetchCostComparison();
    fetchVersionStacks();
  }, [projectId, shotCount, sceneChainId]);

  // Poll job status when rendering
  useEffect(() => {
    if (!currentJob || currentJob.status === 'complete' || currentJob.status === 'failed') {
      return;
    }

    const poll = setInterval(() => {
      fetchJobStatus(currentJob.id);
    }, 2000);

    return () => clearInterval(poll);
  }, [currentJob?.id, currentJob?.status]);

  const fetchPresets = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/render-queue/presets`);
      if (res.ok) {
        const data = await res.json();
        setPresets(data.presets);
      }
    } catch (error) {
      console.error('Failed to fetch presets:', error);
    }
  };

  const fetchCostComparison = async () => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/projects/${projectId}/render-queue/cost-comparison?shots=${shotCount}&iterations=3`
      );
      if (res.ok) {
        const data = await res.json();
        setCostComparison(data);
      }
    } catch (error) {
      console.error('Failed to fetch cost comparison:', error);
    }
  };

  const fetchVersionStacks = async () => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/projects/${projectId}/render-queue/scene-chains/${sceneChainId}/version-stacks`
      );
      if (res.ok) {
        const data = await res.json();
        setVersionStacks(data);
      }
    } catch (error) {
      console.error('Failed to fetch version stacks:', error);
    }
  };

  const handlePromoteShot = async (shotId: string, targetQuality: RenderQuality) => {
    if (!currentJob) return;
    setPromotingShot(shotId);

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/projects/${projectId}/render-queue/jobs/${currentJob.id}/shots/${shotId}/promote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quality: targetQuality }),
        }
      );
      if (res.ok) {
        // Refresh job and version stacks
        await fetchJobStatus(currentJob.id);
        await fetchVersionStacks();
      }
    } catch (error) {
      console.error('Failed to promote shot:', error);
    } finally {
      setPromotingShot(null);
    }
  };

  const fetchJobStatus = async (jobId: string) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/projects/${projectId}/render-queue/jobs/${jobId}`
      );
      if (res.ok) {
        const job = await res.json();
        setCurrentJob(job);

        if (job.status === 'complete' && onRenderComplete) {
          const completedOutputs = job.passes
            .filter((p: RenderPass) => p.status === 'complete' && p.outputUrl)
            .map((p: RenderPass) => p.outputUrl!);
          onRenderComplete(job.activeQuality, completedOutputs);
        }
      }
    } catch (error) {
      console.error('Failed to fetch job status:', error);
    }
  };

  const handleStartRender = async () => {
    if (selectedQualities.length === 0) return;
    setIsLoading(true);

    try {
      // Create job
      const createRes = await fetch(`${BACKEND_URL}/api/projects/${projectId}/render-queue/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneChainId,
          qualities: selectedQualities,
          burnInMetadata, // Refinement C: Pass watermark option
        }),
      });

      if (!createRes.ok) {
        throw new Error('Failed to create render job');
      }

      const job = await createRes.json();

      // Start job
      const startRes = await fetch(
        `${BACKEND_URL}/api/projects/${projectId}/render-queue/jobs/${job.id}/start`,
        { method: 'POST' }
      );

      if (!startRes.ok) {
        throw new Error('Failed to start render job');
      }

      const startedJob = await startRes.json();
      setCurrentJob(startedJob);
    } catch (error) {
      console.error('Failed to start render:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseResume = async () => {
    if (!currentJob) return;

    const endpoint = currentJob.status === 'paused' ? 'resume' : 'pause';
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/projects/${projectId}/render-queue/jobs/${currentJob.id}/${endpoint}`,
        { method: 'POST' }
      );
      if (res.ok) {
        const job = await res.json();
        setCurrentJob(job);
      }
    } catch (error) {
      console.error(`Failed to ${endpoint} job:`, error);
    }
  };

  const handleCancel = async () => {
    if (!currentJob) return;

    try {
      await fetch(`${BACKEND_URL}/api/projects/${projectId}/render-queue/jobs/${currentJob.id}`, {
        method: 'DELETE',
      });
      setCurrentJob(null);
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  };

  const handleRetryFailed = async (passId: string) => {
    if (!currentJob) return;

    try {
      await fetch(
        `${BACKEND_URL}/api/projects/${projectId}/render-queue/jobs/${currentJob.id}/passes/${passId}/retry`,
        { method: 'POST' }
      );
      fetchJobStatus(currentJob.id);
    } catch (error) {
      console.error('Failed to retry pass:', error);
    }
  };

  // Accept Master - Mark shot as finalized, archive draft, update navigator thumbnail
  const handleAcceptMaster = useCallback(
    async (shotId: string, passId: string) => {
      try {
        // 1. Mark the master pass as accepted/finalized
        const res = await fetch(
          `${BACKEND_URL}/api/projects/${projectId}/render-queue/scene-chains/${sceneChainId}/shots/${shotId}/finalize`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passId, action: 'accept' }),
          }
        );

        if (res.ok) {
          // Update local state
          setApprovedShots(prev => new Set([...prev, shotId]));
          setPendingReviewShots(prev => {
            const next = new Set(prev);
            next.delete(shotId);
            return next;
          });

          // Refresh version stacks to show updated state
          await fetchVersionStacks();

          // Move to next shot needing review, or close if done
          const nextPendingShot = versionStacks.find(
            s => s.shotId !== shotId && pendingReviewShots.has(s.shotId)
          );
          if (nextPendingShot) {
            setLightboxShotId(nextPendingShot.shotId);
          } else {
            setShowLightbox(false);
          }
        }
      } catch (error) {
        console.error('Failed to accept master:', error);
      }
    },
    [projectId, sceneChainId, versionStacks, pendingReviewShots, fetchVersionStacks]
  );

  // Reject Master - Keep draft as the working version, hide/archive the master
  const handleRejectMaster = useCallback(
    async (shotId: string) => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/projects/${projectId}/render-queue/scene-chains/${sceneChainId}/shots/${shotId}/finalize`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reject' }),
          }
        );

        if (res.ok) {
          // Remove from pending review
          setPendingReviewShots(prev => {
            const next = new Set(prev);
            next.delete(shotId);
            return next;
          });

          // Refresh version stacks
          await fetchVersionStacks();

          // Move to next shot needing review, or close if done
          const nextPendingShot = versionStacks.find(
            s => s.shotId !== shotId && pendingReviewShots.has(s.shotId)
          );
          if (nextPendingShot) {
            setLightboxShotId(nextPendingShot.shotId);
          } else {
            setShowLightbox(false);
          }
        }
      } catch (error) {
        console.error('Failed to reject master:', error);
      }
    },
    [projectId, sceneChainId, versionStacks, pendingReviewShots, fetchVersionStacks]
  );

  // Detect shots with completed masters that need review
  useEffect(() => {
    const shotsNeedingReview = versionStacks
      .filter(stack => {
        const hasMaster = stack.versions.some(
          v => v.quality === 'master' && v.status === 'complete'
        );
        const isNotApproved = !approvedShots.has(stack.shotId);
        return hasMaster && isNotApproved;
      })
      .map(s => s.shotId);

    setPendingReviewShots(new Set(shotsNeedingReview));
  }, [versionStacks, approvedShots]);

  const toggleQuality = (quality: RenderQuality) => {
    setSelectedQualities(prev => {
      if (prev.includes(quality)) {
        return prev.filter(q => q !== quality);
      }
      // Keep sorted order: draft, review, master
      const order: RenderQuality[] = ['draft', 'review', 'master'];
      return [...prev, quality].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    });
  };

  const estimatedCost = selectedQualities.reduce((sum, q) => {
    const preset = presets?.[q];
    if (!preset) return sum;
    return sum + preset.videoCost * shotCount;
  }, 0);

  const estimatedTime = selectedQualities.reduce((sum, q) => {
    const preset = presets?.[q];
    if (!preset) return sum;
    return sum + preset.estimatedTimeVideo * shotCount;
  }, 0);

  const progressPercent = currentJob
    ? (currentJob.completedPasses / currentJob.totalPasses) * 100
    : 0;

  return (
    <Tooltip.Provider delayDuration={100}>
    <div className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
      {/* Header - Full-width title bar with pill controls */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* Title + Expand toggle */}
        <InfoTooltip content="Batch render all shots in your scene chain at different quality levels. Click to expand options.">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 transition-colors hover:opacity-80"
          >
            <Zap className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-white">Render Queue</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
        </InfoTooltip>

        {/* Job status badge */}
        {currentJob && (
          <InfoTooltip
            content={
              currentJob.status === 'rendering' ? 'Currently processing shots...' :
              currentJob.status === 'paused' ? 'Job paused - click Resume to continue' :
              currentJob.status === 'complete' ? 'All renders complete!' :
              'Some renders failed - click retry to try again'
            }
          >
            <div
              className={clsx(
                'rounded-full px-2.5 py-1 text-xs font-medium',
                currentJob.status === 'rendering' && 'bg-blue-500/20 text-blue-400',
                currentJob.status === 'paused' && 'bg-yellow-500/20 text-yellow-400',
                currentJob.status === 'complete' && 'bg-green-500/20 text-green-400',
                currentJob.status === 'failed' && 'bg-red-500/20 text-red-400'
              )}
            >
              {currentJob.status === 'rendering' && <Loader2 className="mr-1.5 inline h-3 w-3 animate-spin" />}
              {currentJob.status.charAt(0).toUpperCase() + currentJob.status.slice(1)}
            </div>
          </InfoTooltip>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Burn-in toggle pill with visible checkbox */}
        {!currentJob && (selectedQualities.includes('draft') || selectedQualities.includes('review')) && (
          <InfoTooltip content={<><strong>Burn-in Metadata</strong><br />Overlay shot number, timecode, and quality level onto draft/review renders. Useful for reviewing with clients. Disabled for master renders.</>}>
            <label
              className={clsx(
                'flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs transition-all',
                burnInMetadata
                  ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                  : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'
              )}
            >
              <input
                type="checkbox"
                checked={burnInMetadata}
                onChange={e => setBurnInMetadata(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/30 bg-white/10 text-cyan-500 focus:ring-1 focus:ring-cyan-500/50 focus:ring-offset-0"
              />
              <Film className="h-3.5 w-3.5" />
              <span>Burn-in Metadata</span>
            </label>
          </InfoTooltip>
        )}

        {/* Cost estimate pill */}
        {selectedQualities.length > 0 && !currentJob && (
          <InfoTooltip content={<>Estimated cost for <strong>{shotCount} shot{shotCount !== 1 ? 's' : ''}</strong> at <strong>{selectedQualities.join(' + ')}</strong> quality.<br />Actual cost may vary based on render time.</>}>
            <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
              <DollarSign className="h-3.5 w-3.5" />
              <span>Est. ${estimatedCost.toFixed(2)}</span>
              <span className="text-gray-600">•</span>
              <Clock className="h-3.5 w-3.5" />
              <span>~{Math.ceil(estimatedTime / 60)} min</span>
            </div>
          </InfoTooltip>
        )}

        {/* Savings pill */}
        {costComparison && costComparison.savingsPercent > 20 && !currentJob && (
          <InfoTooltip
            content={
              <div className="space-y-1">
                <div className="flex items-center gap-1 font-medium text-green-400">
                  <TrendingDown className="h-3 w-3" />
                  Draft-First Workflow
                </div>
                <p>
                  Iterate 3× at draft quality (<strong>${costComparison.draftCost.toFixed(2)}</strong>/shot),
                  then render once at master (<strong>${costComparison.masterCost.toFixed(2)}</strong>/shot).
                </p>
                <p className="text-green-400">
                  You save <strong>${costComparison.savings.toFixed(2)}</strong> compared to iterating at master quality every time.
                </p>
              </div>
            }
          >
            <div className="flex cursor-help items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs text-green-400">
              <TrendingDown className="h-3.5 w-3.5" />
              <span>Save {costComparison.savingsPercent.toFixed(0)}%</span>
            </div>
          </InfoTooltip>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-4 pb-4">
              {/* Quality Tier Selection - Full width */}
              <div className="flex gap-2">
                {(['draft', 'review', 'master'] as RenderQuality[]).map(quality => {
                  const preset = presets?.[quality];
                  const isSelected = selectedQualities.includes(quality);
                  const isDisabled = !!currentJob && currentJob.status === 'rendering';

                  // Quality-specific tooltips explaining the workflow
                  const qualityTooltipContent: Record<RenderQuality, React.ReactNode> = {
                    draft: (
                      <div className="space-y-1">
                        <div className="font-medium text-amber-400">① DRAFT</div>
                        <p>Fast, cheap renders for quick iteration. Use this to test timing, pacing, and overall flow before committing to expensive renders.</p>
                      </div>
                    ),
                    review: (
                      <div className="space-y-1">
                        <div className="font-medium text-blue-400">② REVIEW</div>
                        <p>Medium quality for client/team review. Good balance of quality and cost for feedback rounds.</p>
                      </div>
                    ),
                    master: (
                      <div className="space-y-1">
                        <div className="font-medium text-purple-400">③ MASTER</div>
                        <p>Final render quality for delivery. Only render at master once you're happy with the edit.</p>
                        <p className="text-purple-300">Seeds from draft are preserved for consistency.</p>
                      </div>
                    ),
                  };

                  return (
                    <InfoTooltip key={quality} content={qualityTooltipContent[quality]}>
                      <button
                        onClick={() => !isDisabled && toggleQuality(quality)}
                        disabled={isDisabled}
                        className={clsx(
                          'flex-1 rounded-lg border p-3 transition-all',
                          isSelected
                            ? QUALITY_COLORS[quality]
                            : 'border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-400',
                          isDisabled && 'cursor-not-allowed opacity-50'
                        )}
                      >
                        <div className="mb-1 flex items-center justify-center gap-1.5">
                          {QUALITY_ICONS[quality]}
                          <span className="text-xs font-medium capitalize">{quality}</span>
                        </div>
                        {preset && (
                          <div className="text-[10px] opacity-70">
                            ${preset.videoCost.toFixed(2)}/shot
                          </div>
                        )}
                      </button>
                    </InfoTooltip>
                  );
                })}
              </div>

              {/* Action Buttons - Full width */}
              <div className="flex gap-2">
                {!currentJob ? (
                  <InfoTooltip
                    content={
                      shotCount === 0
                        ? 'Add shots to your scene chain first, then come back to render them all at once.'
                        : selectedQualities.length === 0
                        ? 'Select at least one quality tier (Draft, Review, or Master) above to start rendering.'
                        : <>Render all <strong>{shotCount} shot{shotCount !== 1 ? 's' : ''}</strong> at <strong>{selectedQualities.join(' + ')}</strong> quality. You can pause or cancel at any time.</>
                    }
                  >
                    <button
                      onClick={handleStartRender}
                      disabled={selectedQualities.length === 0 || isLoading || shotCount === 0}
                      className={clsx(
                        'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all',
                        selectedQualities.length > 0 && !isLoading && shotCount > 0
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400'
                          : 'cursor-not-allowed bg-white/10 text-gray-500'
                      )}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Start Render
                    </button>
                  </InfoTooltip>
                ) : (
                  <>
                    <InfoTooltip
                      content={
                        currentJob.status === 'paused'
                          ? 'Resume rendering from where you left off. No work is lost.'
                          : 'Pause the render job. You can resume later without losing progress.'
                      }
                    >
                      <button
                        onClick={handlePauseResume}
                        className={clsx(
                          'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all',
                          currentJob.status === 'paused'
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                        )}
                      >
                        {currentJob.status === 'paused' ? (
                          <>
                            <Play className="h-4 w-4" />
                            Resume
                          </>
                        ) : (
                          <>
                            <Pause className="h-4 w-4" />
                          Pause
                        </>
                      )}
                      </button>
                    </InfoTooltip>
                    <InfoTooltip content="Cancel the entire render job. Completed shots will be kept, but pending shots will be discarded.">
                      <button
                        onClick={handleCancel}
                        className="rounded-lg bg-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/30"
                      >
                        Cancel
                      </button>
                    </InfoTooltip>
                  </>
                )}
              </div>

              {/* Active Job Progress */}
              {currentJob && (
                <div className="space-y-3">
                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-400">
                        {currentJob.completedPasses} / {currentJob.totalPasses} passes
                      </span>
                      <span className={QUALITY_COLORS[currentJob.activeQuality].split(' ')[0]}>
                        {currentJob.activeQuality} pass
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className={clsx(
                          'h-full rounded-full',
                          currentJob.activeQuality === 'draft' && 'bg-amber-500',
                          currentJob.activeQuality === 'review' && 'bg-blue-500',
                          currentJob.activeQuality === 'master' && 'bg-purple-500'
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>

                  {/* Cost Tracking */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Actual cost</span>
                    <span className="font-mono text-white">
                      ${currentJob.actualCost.toFixed(2)} / ${currentJob.estimatedCost.toFixed(2)}
                    </span>
                  </div>

                  {/* Failed Passes */}
                  {currentJob.failedPasses > 0 && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2">
                      <div className="flex items-center gap-2 text-xs text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        <span>{currentJob.failedPasses} failed</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {currentJob.passes
                          .filter(p => p.status === 'failed')
                          .slice(0, 5)
                          .map(p => (
                            <button
                              key={p.id}
                              onClick={() => handleRetryFailed(p.id)}
                              className="flex items-center gap-1 rounded bg-red-500/20 px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/30"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Shot {p.orderIndex + 1}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}


              {/* Version Stacks - Show per-shot upgrade options */}
              {versionStacks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] tracking-wider text-gray-500 uppercase">
                      <Layers className="h-3 w-3" />
                      Version Stacks
                      {pendingReviewShots.size > 0 && (
                        <span className="ml-1 rounded-full bg-orange-500/20 px-1.5 py-0.5 text-[9px] font-bold text-orange-400">
                          {pendingReviewShots.size} pending review
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Review Dailies Button - opens lightbox for first pending review shot */}
                      {pendingReviewShots.size > 0 && (
                        <button
                          onClick={() => {
                            const firstPendingShot = versionStacks.find(s =>
                              pendingReviewShots.has(s.shotId)
                            );
                            setLightboxShotId(firstPendingShot?.shotId);
                            setShowLightbox(true);
                          }}
                          className="flex items-center gap-1.5 rounded border border-orange-500/30 bg-gradient-to-r from-orange-500/30 to-amber-500/30 px-2.5 py-1.5 text-[10px] font-medium text-orange-300 transition-all hover:from-orange-500/40 hover:to-amber-500/40"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Review Dailies
                        </button>
                      )}
                      {/* A/B Compare Button - opens lightbox for first shot with 2+ passes */}
                      {versionStacks.some(
                        s => s.versions.filter(v => v.status === 'complete').length >= 2
                      ) &&
                        pendingReviewShots.size === 0 && (
                          <button
                            onClick={() => {
                              const comparableShot = versionStacks.find(
                                s => s.versions.filter(v => v.status === 'complete').length >= 2
                              );
                              setLightboxShotId(comparableShot?.shotId);
                              setShowLightbox(true);
                            }}
                            className="flex items-center gap-1.5 rounded bg-cyan-500/20 px-2 py-1 text-[10px] font-medium text-cyan-400 transition-all hover:bg-cyan-500/30"
                          >
                            <SplitSquareHorizontal className="h-3 w-3" />
                            A/B Compare
                          </button>
                        )}
                    </div>
                  </div>
                  <div className="max-h-48 space-y-1.5 overflow-y-auto">
                    {versionStacks.map(stack => {
                      const hasMultiplePasses =
                        stack.versions.filter(v => v.status === 'complete').length >= 2;
                      const isPendingReview = pendingReviewShots.has(stack.shotId);
                      const isApproved = approvedShots.has(stack.shotId);

                      return (
                        <div
                          key={stack.shotId}
                          className={clsx(
                            'flex items-center justify-between rounded-lg px-3 py-2 transition-all',
                            isPendingReview && 'border border-orange-500/20 bg-orange-500/10',
                            isApproved && 'border border-green-500/20 bg-green-500/10',
                            !isPendingReview && !isApproved && 'bg-white/5'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">{stack.shotName}</span>
                              {/* Status badges */}
                              {isPendingReview && (
                                <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[9px] font-medium text-orange-400">
                                  NEEDS REVIEW
                                </span>
                              )}
                              {isApproved && (
                                <span className="flex items-center gap-1 rounded bg-green-500/20 px-1.5 py-0.5 text-[9px] font-medium text-green-400">
                                  <CheckCheck className="h-3 w-3" />
                                  APPROVED
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {(['draft', 'review', 'master'] as RenderQuality[]).map(q => {
                                const version = stack.versions.find(v => v.quality === q);
                                if (!version) {
                                  return (
                                    <div
                                      key={q}
                                      className="h-6 w-6 rounded border border-dashed border-white/10"
                                      title={`${q} - not rendered`}
                                    />
                                  );
                                }
                                return (
                                  <div
                                    key={q}
                                    className={clsx(
                                      'flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold',
                                      version.status === 'complete' && QUALITY_COLORS[q],
                                      version.status === 'generating' &&
                                        'animate-pulse border-2 border-blue-400',
                                      version.status === 'failed' &&
                                        'border border-red-500/30 bg-red-500/20 text-red-400',
                                      version.status === 'pending' &&
                                        'border border-white/20 text-gray-500',
                                      // Highlight master badge when pending review
                                      q === 'master' &&
                                        isPendingReview &&
                                        version.status === 'complete' &&
                                        'ring-2 ring-orange-400/50 ring-offset-1 ring-offset-black'
                                    )}
                                    title={`${q} - ${version.status}${version.seed ? ` (seed: ${version.seed})` : ''}${isPendingReview && q === 'master' ? ' - PENDING REVIEW' : ''}`}
                                  >
                                    {version.status === 'complete' &&
                                      (q === 'draft' ? 'D' : q === 'review' ? 'R' : 'M')}
                                    {version.status === 'generating' && (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    )}
                                    {version.status === 'failed' && '!'}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Compare & Approve Button for pending review shots */}
                            {isPendingReview && (
                              <button
                                onClick={() => {
                                  setLightboxShotId(stack.shotId);
                                  setShowLightbox(true);
                                }}
                                className="flex items-center gap-1.5 rounded border border-orange-500/30 bg-orange-500/20 px-2 py-1 text-[10px] font-medium text-orange-400 transition-all hover:bg-orange-500/30"
                              >
                                <Eye className="h-3 w-3" />
                                Compare & Approve
                              </button>
                            )}

                            {/* Per-shot Compare Button (when not pending review) */}
                            {!isPendingReview && hasMultiplePasses && (
                              <button
                                onClick={() => {
                                  setLightboxShotId(stack.shotId);
                                  setShowLightbox(true);
                                }}
                                className="rounded p-1 text-cyan-400 transition-all hover:bg-cyan-500/20"
                                title="Compare versions"
                              >
                                <SplitSquareHorizontal className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Upgrade Button */}
                            {stack.canUpgrade && currentJob && !isPendingReview && !isApproved && (
                              <button
                                onClick={() =>
                                  handlePromoteShot(stack.shotId, stack.nextUpgradeQuality!)
                                }
                                disabled={promotingShot === stack.shotId}
                                className={clsx(
                                  'flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-all',
                                  QUALITY_COLORS[stack.nextUpgradeQuality!],
                                  'hover:scale-105',
                                  promotingShot === stack.shotId && 'cursor-wait opacity-50'
                                )}
                              >
                                {promotingShot === stack.shotId ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <ArrowUpCircle className="h-3 w-3" />
                                )}
                                → {stack.nextUpgradeQuality}
                                {stack.upgradeCost !== undefined && (
                                  <span className="opacity-70">
                                    (${stack.upgradeCost.toFixed(2)})
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* A/B Lightbox Modal - Dailies Review */}
      <ABLightbox
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
        projectId={projectId}
        sceneChainId={sceneChainId}
        initialShotId={lightboxShotId}
        onAcceptMaster={handleAcceptMaster}
        onRejectMaster={handleRejectMaster}
      />
    </div>
    </Tooltip.Provider>
  );
}
