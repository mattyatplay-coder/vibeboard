'use client';

import { AlertTriangle, DollarSign, CheckCircle, X, Zap, AlertCircle, ChevronDown, Bell, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import * as Popover from '@radix-ui/react-popover';
import { useProducerAgent, CostBreakdown } from '@/hooks/useProducerAgent';
import { Tooltip } from '@/components/ui/Tooltip';

/**
 * ProducerWidget - The Cost Guardian
 *
 * Displays real-time cost estimation and provides alerts for:
 * - Financial: Budget overruns
 * - Consistency: Character/style drift warnings
 * - Technical: VRAM/GPU requirements
 */
export function ProducerWidget() {
    const {
        alerts,
        clearAlert,
        clearAllAlerts,
        handleAction,
        totalCostEstimate,
        costBreakdown,
        isEstimating,
        displayMode,
        toggleDisplayMode,
    } = useProducerAgent();
    const topAlert = alerts[0];

    // UX-004: Don't render widget if in toast mode (toasts are handled by the hook)
    if (displayMode === 'toast') {
        return (
            <div className="fixed bottom-4 right-4 z-50">
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

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
            {/* UX-006: Cost Estimate Badge with Popover */}
            <Popover.Root>
                <Popover.Trigger asChild>
                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={clsx(
                            'flex items-center gap-2 rounded-full border px-4 py-2 shadow-lg backdrop-blur-sm transition-all hover:scale-105',
                            alerts.length > 0
                                ? 'border-amber-500/30 bg-amber-900/20 hover:border-amber-500/50'
                                : 'border-green-500/30 bg-green-900/20 hover:border-green-500/50'
                        )}
                    >
                        {alerts.length > 0 ? (
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                        ) : (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                        )}
                        <span className="text-xs font-medium text-gray-300">Est. Job Cost:</span>
                        <span
                            className={clsx(
                                'font-mono text-lg font-bold',
                                alerts.length > 0 ? 'text-amber-400' : 'text-green-400'
                            )}
                        >
                            ${isEstimating ? '...' : totalCostEstimate.toFixed(2)}
                        </span>
                        {alerts.length > 1 && (
                            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                {alerts.length}
                            </span>
                        )}
                        <ChevronDown className="h-3 w-3 text-gray-400" />
                    </motion.button>
                </Popover.Trigger>

                <Popover.Portal>
                    <Popover.Content
                        side="top"
                        align="end"
                        sideOffset={8}
                        className="z-50 w-72 rounded-xl border border-white/10 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-md"
                    >
                        {/* UX-006: Detailed Cost Breakdown */}
                        <div className="space-y-3">
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
                                    <span className={clsx(
                                        'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                                        costBreakdown.modelTier === 'pro' ? 'bg-purple-500/20 text-purple-300' :
                                        costBreakdown.modelTier === 'fast' ? 'bg-green-500/20 text-green-300' :
                                        'bg-gray-500/20 text-gray-300'
                                    )}>
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
                                {costBreakdown.duration > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Duration</span>
                                        <span className="font-mono text-white">{costBreakdown.duration}s</span>
                                    </div>
                                )}
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
                                <span className={clsx(
                                    'font-mono text-xl font-bold',
                                    costBreakdown.total >= 5 ? 'text-red-400' :
                                    costBreakdown.total >= 1 ? 'text-amber-400' :
                                    'text-green-400'
                                )}>
                                    ${costBreakdown.total.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <Popover.Arrow className="fill-zinc-900/95" />
                    </Popover.Content>
                </Popover.Portal>
            </Popover.Root>

            {/* Alert Card */}
            <AnimatePresence>
                {topAlert && (
                    <motion.div
                        key={topAlert.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className={clsx(
                            'w-80 rounded-xl border-l-4 p-4 shadow-2xl backdrop-blur-md',
                            getAlertStyles(topAlert.severity).bg,
                            getAlertStyles(topAlert.severity).border
                        )}
                    >
                        <div className="flex items-start gap-3">
                            {/* Icon */}
                            {(() => {
                                const AlertIcon = getAlertStyles(topAlert.severity).icon;
                                return (
                                    <AlertIcon
                                        className={clsx(
                                            'mt-0.5 h-5 w-5 flex-shrink-0',
                                            getAlertStyles(topAlert.severity).iconColor
                                        )}
                                    />
                                );
                            })()}

                            {/* Content */}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                    <h4
                                        className={clsx(
                                            'text-sm font-bold',
                                            getAlertStyles(topAlert.severity).titleColor
                                        )}
                                    >
                                        {topAlert.title}
                                    </h4>
                                    <button
                                        onClick={() => clearAlert(topAlert.id)}
                                        className="rounded p-0.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <p className="mt-1 text-xs leading-relaxed text-gray-300">
                                    {topAlert.message}
                                </p>

                                {/* Action buttons */}
                                <div className="mt-3 flex items-center gap-2">
                                    <button
                                        onClick={() => clearAlert(topAlert.id)}
                                        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
                                    >
                                        Acknowledge & Continue
                                    </button>
                                    {topAlert.actionType === 'switch_model' && topAlert.action && (
                                        <button
                                            onClick={onActionClick}
                                            className={clsx(
                                                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                                                'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
                                            )}
                                        >
                                            {topAlert.action.label}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Alert queue indicator */}
                        {alerts.length > 1 && (
                            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
                                <div className="flex items-center gap-1">
                                    {alerts.slice(0, 4).map((_, idx) => (
                                        <div
                                            key={idx}
                                            className={clsx(
                                                'h-1.5 w-1.5 rounded-full',
                                                idx === 0 ? 'bg-white' : 'bg-white/30'
                                            )}
                                        />
                                    ))}
                                    {alerts.length > 4 && (
                                        <span className="ml-1 text-[10px] text-white/50">
                                            +{alerts.length - 4} more
                                        </span>
                                    )}
                                </div>
                                {/* UX-005: Dismiss All button */}
                                <button
                                    onClick={clearAllAlerts}
                                    className="rounded px-2 py-0.5 text-[10px] font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                                >
                                    Dismiss All
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
