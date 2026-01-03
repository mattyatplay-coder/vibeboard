'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  Zap,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  Trash2,
  Download,
  Image,
  Video,
} from 'lucide-react';
import { costTracker, CostSummary, GenerationRecord } from '@/lib/CostTracker';
import { formatCost, calculateGenerationCost } from '@/lib/ModelPricing';
import { PROVIDER_DEFINITIONS } from '@/lib/ModelRegistry';
import clsx from 'clsx';

interface SpendingWidgetProps {
  collapsed?: boolean;
  currentModelId?: string;
  currentDuration?: string;
  isVideo?: boolean;
  /** Controlled expansion state from parent (for accordion behavior) */
  isExpanded?: boolean;
  /** Callback when toggle is clicked (for accordion behavior) */
  onToggle?: () => void;
}

export function SpendingWidget({
  collapsed = false,
  currentModelId,
  currentDuration,
  isVideo,
  isExpanded: controlledExpanded,
  onToggle,
}: SpendingWidgetProps) {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  // Use controlled state if provided, otherwise use internal state
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Initial load
    setSummary(costTracker.getSummary());

    // Subscribe to updates
    const unsubscribe = costTracker.subscribe(() => {
      setSummary(costTracker.getSummary());
    });

    return unsubscribe;
  }, []);

  // Calculate estimated cost for current shot
  const shotEstimate = currentModelId
    ? calculateGenerationCost(currentModelId, {
        quantity: 1,
        durationSeconds: currentDuration
          ? parseInt(currentDuration.replace('s', ''), 10)
          : isVideo
            ? 5
            : undefined,
      })
    : 0;

  if (!summary) return null;

  const handleClear = () => {
    if (confirm('Clear all spending history? This cannot be undone.')) {
      costTracker.clearAll();
    }
  };

  const handleExport = () => {
    const data = costTracker.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vibeboard-spending-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Collapsed view - just show total
  if (collapsed) {
    return (
      <div className="px-2 py-2">
        <div className="flex items-center justify-center gap-1 text-emerald-400">
          <DollarSign className="h-4 w-4" />
          <span className="text-sm font-bold">{formatCost(summary.allTime)}</span>
        </div>
      </div>
    );
  }

  // Handle toggle - prefer controlled behavior if onToggle provided
  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  return (
    <div
      className={clsx(
        'overflow-hidden rounded-xl border bg-white/5 transition-colors',
        expanded ? 'border-cyan-500/30' : 'border-white/10'
      )}
    >
      {/* Header */}
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between p-3 transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Spending</p>
            <p className="text-lg font-bold text-emerald-400">{formatCost(summary.allTime)}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="space-y-4 border-t border-white/10 p-3">
          {/* Time Period Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-center">
              <Zap className="mx-auto mb-1 h-3 w-3 text-amber-400" />
              <p className="text-xs text-amber-400/80">Next Shot</p>
              <p className="text-sm font-semibold text-amber-400">
                {shotEstimate > 0 ? formatCost(shotEstimate) : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-white/5 p-2 text-center">
              <Clock className="mx-auto mb-1 h-3 w-3 text-gray-500" />
              <p className="text-xs text-gray-500">Today</p>
              <p className="text-sm font-semibold text-white">{formatCost(summary.today)}</p>
            </div>
            <div className="rounded-lg bg-white/5 p-2 text-center">
              <Calendar className="mx-auto mb-1 h-3 w-3 text-gray-500" />
              <p className="text-xs text-gray-500">Month</p>
              <p className="text-sm font-semibold text-white">{formatCost(summary.thisMonth)}</p>
            </div>
          </div>

          {/* By Provider */}
          {Object.keys(summary.byProvider).length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                By Provider
              </p>
              <div className="space-y-1">
                {Object.entries(summary.byProvider)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([provider, cost]) => {
                    const providerDef = PROVIDER_DEFINITIONS[provider];
                    const percentage = (cost / summary.allTime) * 100;
                    return (
                      <div key={provider} className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="mb-0.5 flex items-center justify-between text-xs">
                            <span
                              className={clsx('font-medium', providerDef?.color || 'text-gray-400')}
                            >
                              {providerDef?.name || provider}
                            </span>
                            <span className="text-gray-400">{formatCost(cost)}</span>
                          </div>
                          <div className="h-1 overflow-hidden rounded-full bg-white/10">
                            <div
                              className={clsx(
                                'h-full rounded-full',
                                providerDef?.bgColor?.replace('/10', '/50') || 'bg-gray-500'
                              )}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Recent Generations Toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex w-full items-center justify-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-300"
          >
            {showDetails ? 'Hide' : 'Show'} Recent ({summary.recentGenerations.length})
            {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {/* Recent Generations */}
          {showDetails && summary.recentGenerations.length > 0 && (
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {summary.recentGenerations.map(gen => (
                <GenerationRow key={gen.id} generation={gen} />
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 border-t border-white/10 pt-2">
            <button
              onClick={handleExport}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Download className="h-3 w-3" />
              Export
            </button>
            <button
              onClick={handleClear}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GenerationRow({ generation }: { generation: GenerationRecord }) {
  const time = new Date(generation.timestamp);
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1 text-xs">
      {generation.type === 'video' ? (
        <Video className="h-3 w-3 flex-shrink-0 text-purple-400" />
      ) : (
        <Image className="h-3 w-3 flex-shrink-0 text-emerald-400" />
      )}
      <span className="flex-1 truncate text-gray-300">{generation.modelName}</span>
      <span className="font-medium text-emerald-400">{formatCost(generation.cost)}</span>
      <span className="text-gray-600">{timeStr}</span>
    </div>
  );
}
