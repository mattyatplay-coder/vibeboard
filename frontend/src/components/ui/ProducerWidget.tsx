'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  DollarSign,
  CheckCircle,
  Zap,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Bell,
  BellOff,
} from 'lucide-react';
import clsx from 'clsx';
import { useProducerAgent } from '@/hooks/useProducerAgent';
import { Tooltip } from '@/components/ui/Tooltip';
import { ProducerSparkline } from '@/components/ui/ProducerSparkline';

interface ProducerWidgetProps {
  collapsed?: boolean; // For sidebar mode
  /** Controlled expansion state from parent (for accordion behavior) */
  isExpanded?: boolean;
  /** Callback when toggle is clicked (for accordion behavior) */
  onToggle?: () => void;
  /** Super compact mode for header placement */
  compact?: boolean;
  /** Inline mode for toolbar placement - shows EST. COST label with chevron */
  inline?: boolean;
  /** Whether toolbar is in compact/stacked mode (affects toast positioning) */
  isCompactToolbar?: boolean;
}

/**
 * ProducerWidget - The Cost Guardian
 *
 * Displays real-time cost estimation and provides alerts for:
 * - Financial: Budget overruns
 * - Consistency: Character/style drift warnings
 * - Technical: VRAM/GPU requirements
 */
export function ProducerWidget({
  collapsed = false,
  isExpanded: controlledExpanded,
  onToggle,
  compact = false,
  inline = false,
  isCompactToolbar = false,
}: ProducerWidgetProps) {
  const {
    alerts,
    clearAlert,
    clearAllAlerts,
    handleAction,
    totalCostEstimate,
    costBreakdown,
    spendHistory,
    isEstimating,
    displayMode,
    toggleDisplayMode,
  } = useProducerAgent();
  const topAlert = alerts[0];

  // Use controlled state if provided, otherwise use internal state
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  // Handle toggle - prefer controlled behavior if onToggle provided
  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  // UX-004: Don't render widget if in toast mode (toasts are handled by the hook)
  if (displayMode === 'toast') {
    return (
      <div className="fixed right-4 bottom-4 z-50">
        <Tooltip content="Switch to Widget Mode" side="left">
          <button
            onClick={toggleDisplayMode}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-zinc-900/90 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-zinc-800/90"
          >
            <BellOff className="h-4 w-4 text-gray-400" />
          </button>
        </Tooltip>
      </div>
    );
  }

  // Alert severity colors
  const getAlertStyles = (severity: 'Financial' | 'Consistency' | 'Technical') => {
    switch (severity) {
      case 'Financial':
        return {
          bg: 'bg-amber-900/40',
          border: 'border-amber-500/50',
          icon: DollarSign,
          iconColor: 'text-amber-400',
          titleColor: 'text-amber-300',
        };
      case 'Consistency':
        return {
          bg: 'bg-purple-900/40',
          border: 'border-purple-500/50',
          icon: AlertCircle,
          iconColor: 'text-purple-400',
          titleColor: 'text-purple-300',
        };
      case 'Technical':
        return {
          bg: 'bg-red-900/40',
          border: 'border-red-500/50',
          icon: Zap,
          iconColor: 'text-red-400',
          titleColor: 'text-red-300',
        };
    }
  };

  // Handle action button click
  const onActionClick = () => {
    if (topAlert) {
      handleAction(topAlert.id, topAlert.actionType, topAlert.actionValue);
    }
  };

  // Compact header view - minimal pill showing just cost
  if (compact) {
    return (
      <Tooltip content={`Est. Job Cost: $${totalCostEstimate.toFixed(2)}`} side="bottom">
        <button
          onClick={onToggle}
          className={clsx(
            'flex h-8 items-center gap-1.5 rounded-lg border px-2 transition-all',
            alerts.length > 0
              ? 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20'
              : 'border-green-500/30 bg-green-500/10 hover:bg-green-500/20'
          )}
        >
          {alerts.length > 0 ? (
            <CheckCircle className="h-3.5 w-3.5 text-amber-400" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5 text-green-400" />
          )}
          <span
            className={clsx(
              'font-mono text-xs font-bold',
              alerts.length > 0 ? 'text-amber-400' : 'text-green-400'
            )}
          >
            ${totalCostEstimate.toFixed(2)}
          </span>
        </button>
      </Tooltip>
    );
  }

  // Inline toolbar view - EST. COST label with checkmark, dollar amount, and chevron (all on one line)
  if (inline) {
    return (
      <div className="relative">
        <button
          onClick={handleToggle}
          className="flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-2.5 transition-all hover:bg-white/5"
        >
          <CheckCircle className="h-3.5 w-3.5 text-green-400" />
          <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
            Est. Cost
          </span>
          <span
            className={clsx(
              'font-mono text-xs font-bold',
              alerts.length > 0 ? 'text-amber-400' : 'text-green-400'
            )}
          >
            ${isEstimating ? '...' : totalCostEstimate.toFixed(2)}
          </span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
          )}
        </button>

        {/* Expanded Toast Panel - positioned above toolbar border */}
        {expanded && (
          <div
            className={clsx(
              'animate-in fade-in slide-in-from-bottom-2 absolute z-50 w-72 rounded-xl border border-white/10 bg-[#1a1a1a] p-4 shadow-2xl',
              isCompactToolbar
                ? '-right-4 bottom-full mb-[7.5rem]'
                : '-right-4 bottom-full mb-[4.5rem]'
            )}
          >
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">Cost Breakdown</h4>
              <Tooltip content="Switch to Toast Mode" side="left">
                <button
                  onClick={toggleDisplayMode}
                  className="rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Bell className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>

            {/* Model Info */}
            <div className="rounded-lg border border-white/5 bg-white/5 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Model</span>
                <span className="font-medium text-white">{costBreakdown.modelName}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-gray-400">Tier</span>
                <span
                  className={clsx(
                    'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                    costBreakdown.modelTier === 'pro'
                      ? 'bg-purple-500/20 text-purple-300'
                      : costBreakdown.modelTier === 'fast'
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-gray-500/20 text-gray-300'
                  )}
                >
                  {costBreakdown.modelTier}
                </span>
              </div>
            </div>

            {/* Calculation Table */}
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Base Cost</span>
                <span className="font-mono text-white">${costBreakdown.baseCost.toFixed(3)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Variations</span>
                <span className="font-mono text-white">×{costBreakdown.variations}</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Formula</span>
                <span className="font-mono text-[10px] text-gray-300">{costBreakdown.formula}</span>
              </div>
            </div>

            {/* Total */}
            <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-gradient-to-r from-violet-500/10 to-blue-500/10 p-3">
              <span className="text-sm font-medium text-white">Estimated Total</span>
              <span
                className={clsx(
                  'font-mono text-xl font-bold',
                  costBreakdown.total >= 5
                    ? 'text-red-400'
                    : costBreakdown.total >= 1
                      ? 'text-amber-400'
                      : 'text-green-400'
                )}
              >
                ${costBreakdown.total.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Collapsed sidebar view - just show cost with icon
  if (collapsed) {
    return (
      <div className="px-2 py-2">
        <Tooltip content={`Est. Job Cost: $${totalCostEstimate.toFixed(2)}`} side="right">
          <div className="flex items-center justify-center gap-1">
            {alerts.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-400" />
            )}
            <span
              className={clsx(
                'font-mono text-sm font-bold',
                alerts.length > 0 ? 'text-amber-400' : 'text-green-400'
              )}
            >
              ${totalCostEstimate.toFixed(2)}
            </span>
          </div>
        </Tooltip>
      </div>
    );
  }

  // Sidebar expanded view - compact inline widget matching SpendingWidget style
  return (
    <div
      className={clsx(
        'overflow-hidden rounded-xl border bg-white/5 transition-colors',
        expanded ? 'border-violet-500/30' : 'border-white/10'
      )}
    >
      {/* Header */}
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between p-3 transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              alerts.length > 0 ? 'bg-amber-500/20' : 'bg-green-500/20'
            )}
          >
            {alerts.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-400" />
            )}
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
              Est. Cost
            </p>
            <p
              className={clsx(
                'font-mono text-lg font-bold',
                alerts.length > 0 ? 'text-amber-400' : 'text-green-400'
              )}
            >
              ${isEstimating ? '...' : totalCostEstimate.toFixed(2)}
            </p>
          </div>
        </div>
        {alerts.length > 0 && (
          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {alerts.length}
          </span>
        )}
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="space-y-3 border-t border-white/10 p-3">
          {/* Header with mode toggle */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Cost Breakdown</h4>
            <Tooltip content="Switch to Toast Mode" side="left">
              <button
                onClick={toggleDisplayMode}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Bell className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>

          {/* Model Info */}
          <div className="rounded-lg border border-white/5 bg-white/5 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Model</span>
              <span className="font-medium text-white">{costBreakdown.modelName}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-gray-400">Tier</span>
              <span
                className={clsx(
                  'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                  costBreakdown.modelTier === 'pro'
                    ? 'bg-purple-500/20 text-purple-300'
                    : costBreakdown.modelTier === 'fast'
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-gray-500/20 text-gray-300'
                )}
              >
                {costBreakdown.modelTier}
              </span>
            </div>
          </div>

          {/* Calculation Table */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Base Cost</span>
              <span className="font-mono text-white">${costBreakdown.baseCost.toFixed(3)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Variations</span>
              <span className="font-mono text-white">×{costBreakdown.variations}</span>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Formula</span>
              <span className="font-mono text-[10px] text-gray-300">{costBreakdown.formula}</span>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-gradient-to-r from-violet-500/10 to-blue-500/10 p-3">
            <span className="text-sm font-medium text-white">Estimated Total</span>
            <span
              className={clsx(
                'font-mono text-xl font-bold',
                costBreakdown.total >= 5
                  ? 'text-red-400'
                  : costBreakdown.total >= 1
                    ? 'text-amber-400'
                    : 'text-green-400'
              )}
            >
              ${costBreakdown.total.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
