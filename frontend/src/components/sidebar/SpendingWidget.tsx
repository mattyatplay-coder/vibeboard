"use client";

import { useState, useEffect } from 'react';
import { DollarSign, Zap, Clock, Calendar, ChevronDown, ChevronUp, Trash2, Download, Image, Video } from 'lucide-react';
import { costTracker, CostSummary, GenerationRecord } from '@/lib/CostTracker';
import { formatCost, calculateGenerationCost } from '@/lib/ModelPricing';
import { PROVIDER_DEFINITIONS } from '@/lib/ModelRegistry';
import clsx from 'clsx';

interface SpendingWidgetProps {
    collapsed?: boolean;
    currentModelId?: string;
    currentDuration?: string;
    isVideo?: boolean;
}

export function SpendingWidget({ collapsed = false, currentModelId, currentDuration, isVideo }: SpendingWidgetProps) {
    const [summary, setSummary] = useState<CostSummary | null>(null);
    const [expanded, setExpanded] = useState(false);
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
            durationSeconds: currentDuration ? parseInt(currentDuration.replace('s', ''), 10) : (isVideo ? 5 : undefined),
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
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm font-bold">{formatCost(summary.allTime)}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-left">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Spending</p>
                        <p className="text-lg font-bold text-emerald-400">{formatCost(summary.allTime)}</p>
                    </div>
                </div>
                {expanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
            </button>

            {/* Expanded Content */}
            {expanded && (
                <div className="border-t border-white/10 p-3 space-y-4">
                    {/* Time Period Stats */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-center">
                            <Zap className="w-3 h-3 text-amber-400 mx-auto mb-1" />
                            <p className="text-xs text-amber-400/80">Next Shot</p>
                            <p className="text-sm font-semibold text-amber-400">{shotEstimate > 0 ? formatCost(shotEstimate) : '—'}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 text-center">
                            <Clock className="w-3 h-3 text-gray-500 mx-auto mb-1" />
                            <p className="text-xs text-gray-500">Today</p>
                            <p className="text-sm font-semibold text-white">{formatCost(summary.today)}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 text-center">
                            <Calendar className="w-3 h-3 text-gray-500 mx-auto mb-1" />
                            <p className="text-xs text-gray-500">Month</p>
                            <p className="text-sm font-semibold text-white">{formatCost(summary.thisMonth)}</p>
                        </div>
                    </div>

                    {/* By Provider */}
                    {Object.keys(summary.byProvider).length > 0 && (
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">By Provider</p>
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
                                                    <div className="flex items-center justify-between text-xs mb-0.5">
                                                        <span className={clsx("font-medium", providerDef?.color || "text-gray-400")}>
                                                            {providerDef?.name || provider}
                                                        </span>
                                                        <span className="text-gray-400">{formatCost(cost)}</span>
                                                    </div>
                                                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className={clsx("h-full rounded-full", providerDef?.bgColor?.replace('/10', '/50') || "bg-gray-500")}
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
                        className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1"
                    >
                        {showDetails ? 'Hide' : 'Show'} Recent ({summary.recentGenerations.length})
                        {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {/* Recent Generations */}
                    {showDetails && summary.recentGenerations.length > 0 && (
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                            {summary.recentGenerations.map((gen) => (
                                <GenerationRow key={gen.id} generation={gen} />
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-white/10">
                        <button
                            onClick={handleExport}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <Download className="w-3 h-3" />
                            Export
                        </button>
                        <button
                            onClick={handleClear}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-3 h-3" />
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
        <div className="flex items-center gap-2 text-xs py-1 px-2 bg-white/5 rounded-lg">
            {generation.type === 'video' ? (
                <Video className="w-3 h-3 text-purple-400 flex-shrink-0" />
            ) : (
                <Image className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            )}
            <span className="flex-1 truncate text-gray-300">{generation.modelName}</span>
            <span className="text-emerald-400 font-medium">{formatCost(generation.cost)}</span>
            <span className="text-gray-600">{timeStr}</span>
        </div>
    );
}
