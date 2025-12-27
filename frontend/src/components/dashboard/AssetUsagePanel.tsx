'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Layers, Sparkles, User, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import Image from 'next/image';

interface AssetUsageRecord {
    assetId: string;
    assetType: 'lora' | 'element' | 'character';
    name: string;
    triggerWord?: string;
    thumbnail?: string;
    usageCount: number;
    lastUsed: number;
    byDay: Array<{ date: string; count: number }>;
}

interface AssetUsagePanelProps {
    projectId: string;
    days?: number;
}

const ASSET_ICONS = {
    lora: Sparkles,
    element: Layers,
    character: User,
};

const ASSET_COLORS = {
    lora: 'text-purple-400 bg-purple-500/20',
    element: 'text-blue-400 bg-blue-500/20',
    character: 'text-amber-400 bg-amber-500/20',
};

export function AssetUsagePanel({ projectId, days = 30 }: AssetUsagePanelProps) {
    const [assets, setAssets] = useState<AssetUsageRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<'all' | 'lora' | 'element' | 'character'>('all');
    const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'usage' | 'recent'>('usage');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${projectId}/dashboard/asset-usage?days=${days}`);
            if (!res.ok) throw new Error('Failed to fetch asset usage');
            const json = await res.json();
            setAssets(json.assetUsage || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [projectId, days]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filter and sort assets
    const filteredAssets = assets
        .filter(a => activeFilter === 'all' || a.assetType === activeFilter)
        .sort((a, b) => {
            if (sortBy === 'usage') return b.usageCount - a.usageCount;
            return b.lastUsed - a.lastUsed;
        });

    // Calculate totals
    const totals = {
        lora: assets.filter(a => a.assetType === 'lora').length,
        element: assets.filter(a => a.assetType === 'element').length,
        character: assets.filter(a => a.assetType === 'character').length,
    };

    const maxUsage = Math.max(...assets.map(a => a.usageCount), 1);

    if (loading) {
        return (
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
                <div className="flex items-center justify-center gap-2 text-white/50">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Loading asset usage...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
                <p className="text-red-400">{error}</p>
                <button
                    onClick={fetchData}
                    className="mt-2 text-sm text-red-300 hover:text-red-200"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">Asset Usage</h3>
                    <p className="text-sm text-white/50">
                        {assets.length} assets used in last {days} days
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSortBy(sortBy === 'usage' ? 'recent' : 'usage')}
                        className="flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-white/70 hover:text-white"
                    >
                        <TrendingUp className="h-3 w-3" />
                        {sortBy === 'usage' ? 'By Usage' : 'By Recent'}
                    </button>
                    <button
                        onClick={fetchData}
                        className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="mb-4 flex gap-2">
                <button
                    onClick={() => setActiveFilter('all')}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        activeFilter === 'all'
                            ? 'bg-white/20 text-white'
                            : 'text-white/50 hover:bg-white/10 hover:text-white'
                    }`}
                >
                    All ({assets.length})
                </button>
                {(['lora', 'element', 'character'] as const).map(type => {
                    const Icon = ASSET_ICONS[type];
                    return (
                        <button
                            key={type}
                            onClick={() => setActiveFilter(type)}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                activeFilter === type
                                    ? ASSET_COLORS[type]
                                    : 'text-white/50 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            <span className="capitalize">{type}s</span>
                            <span className="ml-1 text-xs opacity-70">({totals[type]})</span>
                        </button>
                    );
                })}
            </div>

            {/* Asset list */}
            <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                    {filteredAssets.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-8 text-center text-white/40"
                        >
                            No {activeFilter === 'all' ? 'assets' : `${activeFilter}s`} found
                        </motion.div>
                    ) : (
                        filteredAssets.map((asset, index) => (
                            <motion.div
                                key={asset.assetId}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: index * 0.05 }}
                                className="overflow-hidden rounded-lg border border-white/5 bg-zinc-800/50"
                            >
                                {/* Main row */}
                                <button
                                    onClick={() => setExpandedAsset(
                                        expandedAsset === asset.assetId ? null : asset.assetId
                                    )}
                                    className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-white/5"
                                >
                                    {/* Thumbnail or icon */}
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ASSET_COLORS[asset.assetType]}`}>
                                        {asset.thumbnail ? (
                                            <Image
                                                src={asset.thumbnail}
                                                alt={asset.name}
                                                width={40}
                                                height={40}
                                                className="h-full w-full rounded-lg object-cover"
                                            />
                                        ) : (
                                            React.createElement(ASSET_ICONS[asset.assetType], {
                                                className: 'h-5 w-5',
                                            })
                                        )}
                                    </div>

                                    {/* Name and trigger word */}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-white">{asset.name}</p>
                                        {asset.triggerWord && (
                                            <p className="truncate text-xs text-purple-400">
                                                {asset.triggerWord}
                                            </p>
                                        )}
                                    </div>

                                    {/* Usage bar */}
                                    <div className="w-24">
                                        <div className="mb-1 flex justify-between text-xs">
                                            <span className="text-white/40">Uses</span>
                                            <span className="font-medium text-white">{asset.usageCount}</span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                                            <motion.div
                                                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(asset.usageCount / maxUsage) * 100}%` }}
                                                transition={{ duration: 0.5, delay: index * 0.05 }}
                                            />
                                        </div>
                                    </div>

                                    {/* Expand icon */}
                                    <div className="shrink-0 text-white/30">
                                        {expandedAsset === asset.assetId ? (
                                            <ChevronUp className="h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4" />
                                        )}
                                    </div>
                                </button>

                                {/* Expanded content */}
                                <AnimatePresence>
                                    {expandedAsset === asset.assetId && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden border-t border-white/5"
                                        >
                                            <div className="p-3">
                                                <p className="mb-2 text-xs text-white/40">Usage by day</p>
                                                <div className="flex h-12 items-end gap-1">
                                                    {asset.byDay.slice(-14).map((day, i) => {
                                                        const dayMax = Math.max(...asset.byDay.map(d => d.count), 1);
                                                        const height = (day.count / dayMax) * 100;
                                                        return (
                                                            <div
                                                                key={day.date}
                                                                className="group relative flex-1"
                                                            >
                                                                <motion.div
                                                                    className="w-full rounded-t bg-gradient-to-t from-purple-600 to-purple-400"
                                                                    initial={{ height: 0 }}
                                                                    animate={{ height: `${height}%` }}
                                                                    transition={{ delay: i * 0.03 }}
                                                                />
                                                                <div className="absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-zinc-700 px-2 py-1 text-xs text-white group-hover:block">
                                                                    {day.count} on {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <p className="mt-2 text-xs text-white/30">
                                                    Last used: {new Date(asset.lastUsed).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
