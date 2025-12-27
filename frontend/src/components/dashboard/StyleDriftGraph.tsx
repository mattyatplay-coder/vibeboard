'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Calendar } from 'lucide-react';

interface StyleDriftDataPoint {
    timestamp: number;
    date: string;
    lighting: {
        lowKey: number;
        highKey: number;
        chiaroscuro: number;
        natural: number;
    };
    framing: {
        closeUp: number;
        medium: number;
        wide: number;
    };
    colorTemp: {
        warm: number;
        cool: number;
        neutral: number;
    };
    generationCount: number;
}

interface StyleDriftGraphProps {
    projectId: string;
    days?: number;
    onDaysChange?: (days: number) => void;
}

type StyleCategory = 'lighting' | 'framing' | 'colorTemp';

const CATEGORY_COLORS = {
    lighting: {
        lowKey: '#f59e0b',     // Amber
        highKey: '#fbbf24',    // Yellow
        chiaroscuro: '#d97706', // Dark amber
        natural: '#78716c',    // Stone
    },
    framing: {
        closeUp: '#8b5cf6',    // Purple
        medium: '#a78bfa',     // Light purple
        wide: '#c4b5fd',       // Lighter purple
    },
    colorTemp: {
        warm: '#ef4444',       // Red
        cool: '#3b82f6',       // Blue
        neutral: '#6b7280',    // Gray
    },
};

const CATEGORY_LABELS = {
    lighting: {
        lowKey: 'Low Key',
        highKey: 'High Key',
        chiaroscuro: 'Chiaroscuro',
        natural: 'Natural',
    },
    framing: {
        closeUp: 'Close-Up',
        medium: 'Medium',
        wide: 'Wide',
    },
    colorTemp: {
        warm: 'Warm',
        cool: 'Cool',
        neutral: 'Neutral',
    },
};

export function StyleDriftGraph({ projectId, days = 30, onDaysChange }: StyleDriftGraphProps) {
    const [data, setData] = useState<StyleDriftDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<StyleCategory>('lighting');
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${projectId}/dashboard/style-drift?days=${days}`);
            if (!res.ok) throw new Error('Failed to fetch style drift data');
            const json = await res.json();
            setData(json.styleDrift || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [projectId, days]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Calculate trend for the active category
    const trend = useMemo((): { direction: 'up' | 'down' | 'stable'; change: number } => {
        if (data.length < 2) return { direction: 'stable', change: 0 };

        const categoryData = data.map(d => d[activeCategory]);
        const firstHalf = categoryData.slice(0, Math.floor(categoryData.length / 2));
        const secondHalf = categoryData.slice(Math.floor(categoryData.length / 2));

        const avgFirst = Object.keys(firstHalf[0] || {}).reduce((acc, key) => {
            const sum = firstHalf.reduce((s, d) => s + (d as any)[key], 0);
            return { ...acc, [key]: sum / firstHalf.length };
        }, {} as Record<string, number>);

        const avgSecond = Object.keys(secondHalf[0] || {}).reduce((acc, key) => {
            const sum = secondHalf.reduce((s, d) => s + (d as any)[key], 0);
            return { ...acc, [key]: sum / secondHalf.length };
        }, {} as Record<string, number>);

        // Find the biggest change
        let maxChange = 0;
        let direction: 'up' | 'down' | 'stable' = 'stable';
        Object.keys(avgFirst).forEach(key => {
            const change = avgSecond[key] - avgFirst[key];
            if (Math.abs(change) > Math.abs(maxChange)) {
                maxChange = change;
                direction = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';
            }
        });

        return { direction, change: maxChange };
    }, [data, activeCategory]);

    // Calculate chart dimensions
    const chartHeight = 200;
    const chartWidth = 600;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    // Generate SVG paths for stacked area chart
    const generatePaths = useMemo(() => {
        if (data.length === 0) return [];

        const categoryKeys = Object.keys(CATEGORY_COLORS[activeCategory]) as string[];
        const paths: { key: string; path: string; color: string }[] = [];

        const xScale = (i: number) => padding.left + (i / (data.length - 1)) * innerWidth;
        const yScale = (v: number) => padding.top + innerHeight - (v / 100) * innerHeight;

        // Build stacked values
        const stackedData = data.map(d => {
            let cumulative = 0;
            return categoryKeys.map(key => {
                const value = (d[activeCategory] as any)[key] || 0;
                const start = cumulative;
                cumulative += value;
                return { key, start, end: cumulative, value };
            });
        });

        // Generate area paths for each layer
        categoryKeys.forEach((key, layerIndex) => {
            const points: string[] = [];

            // Top line (forward)
            for (let i = 0; i < data.length; i++) {
                const x = xScale(i);
                const y = yScale(stackedData[i][layerIndex].end);
                points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
            }

            // Bottom line (backward)
            for (let i = data.length - 1; i >= 0; i--) {
                const x = xScale(i);
                const y = yScale(stackedData[i][layerIndex].start);
                points.push(`L ${x} ${y}`);
            }

            points.push('Z');

            paths.push({
                key,
                path: points.join(' '),
                color: (CATEGORY_COLORS[activeCategory] as any)[key],
            });
        });

        return paths;
    }, [data, activeCategory, innerWidth, innerHeight, padding]);

    if (loading) {
        return (
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
                <div className="flex items-center justify-center gap-2 text-white/50">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Loading style drift data...</span>
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

    if (data.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 text-center">
                <p className="text-white/50">No indexed generations found for style drift analysis.</p>
                <p className="mt-2 text-sm text-white/30">Index some generations to see style trends.</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">Style Drift</h3>
                    <p className="text-sm text-white/50">Visual style changes over time</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Trend indicator */}
                    <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm ${
                        trend.direction === 'up' ? 'bg-green-500/20 text-green-400' :
                        trend.direction === 'down' ? 'bg-red-500/20 text-red-400' :
                        'bg-zinc-500/20 text-zinc-400'
                    }`}>
                        {trend.direction === 'up' ? <TrendingUp className="h-4 w-4" /> :
                         trend.direction === 'down' ? <TrendingDown className="h-4 w-4" /> :
                         <Minus className="h-4 w-4" />}
                        <span>{trend.direction === 'stable' ? 'Stable' : `${Math.abs(trend.change).toFixed(1)}%`}</span>
                    </div>

                    {/* Days selector */}
                    <div className="flex items-center gap-1 rounded-lg bg-zinc-800 p-1">
                        {[7, 14, 30].map(d => (
                            <button
                                key={d}
                                onClick={() => onDaysChange?.(d)}
                                className={`rounded px-2 py-1 text-xs transition-colors ${
                                    days === d
                                        ? 'bg-purple-500 text-white'
                                        : 'text-white/50 hover:text-white'
                                }`}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={fetchData}
                        className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Category tabs */}
            <div className="mb-4 flex gap-2">
                {(['lighting', 'framing', 'colorTemp'] as StyleCategory[]).map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                            activeCategory === cat
                                ? 'bg-purple-500/30 text-purple-300'
                                : 'text-white/50 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        {cat === 'colorTemp' ? 'Color Temp' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
            </div>

            {/* Chart */}
            <div className="relative">
                <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full"
                    style={{ maxHeight: '240px' }}
                >
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map(tick => (
                        <g key={tick}>
                            <line
                                x1={padding.left}
                                y1={padding.top + innerHeight - (tick / 100) * innerHeight}
                                x2={chartWidth - padding.right}
                                y2={padding.top + innerHeight - (tick / 100) * innerHeight}
                                stroke="rgba(255,255,255,0.1)"
                                strokeDasharray="4 4"
                            />
                            <text
                                x={padding.left - 8}
                                y={padding.top + innerHeight - (tick / 100) * innerHeight + 4}
                                textAnchor="end"
                                className="fill-white/30 text-[10px]"
                            >
                                {tick}%
                            </text>
                        </g>
                    ))}

                    {/* Stacked area paths */}
                    {generatePaths.map(({ key, path, color }) => (
                        <motion.path
                            key={key}
                            d={path}
                            fill={color}
                            fillOpacity={0.6}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                        />
                    ))}

                    {/* Hover points */}
                    {data.map((point, i) => {
                        const x = padding.left + (i / (data.length - 1)) * innerWidth;
                        return (
                            <g key={i}>
                                <rect
                                    x={x - (innerWidth / data.length) / 2}
                                    y={padding.top}
                                    width={innerWidth / data.length}
                                    height={innerHeight}
                                    fill="transparent"
                                    onMouseEnter={() => setHoveredPoint(i)}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                />
                                {hoveredPoint === i && (
                                    <line
                                        x1={x}
                                        y1={padding.top}
                                        x2={x}
                                        y2={padding.top + innerHeight}
                                        stroke="rgba(255,255,255,0.3)"
                                        strokeDasharray="4 4"
                                    />
                                )}
                            </g>
                        );
                    })}

                    {/* X-axis labels */}
                    {data.length > 0 && [0, Math.floor(data.length / 2), data.length - 1].map(i => {
                        if (!data[i]) return null;
                        const x = padding.left + (i / (data.length - 1)) * innerWidth;
                        return (
                            <text
                                key={i}
                                x={x}
                                y={chartHeight - 10}
                                textAnchor="middle"
                                className="fill-white/40 text-[10px]"
                            >
                                {new Date(data[i].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </text>
                        );
                    })}
                </svg>

                {/* Hover tooltip */}
                {hoveredPoint !== null && data[hoveredPoint] && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-lg border border-white/10 bg-zinc-800 p-3 shadow-xl"
                    >
                        <p className="mb-2 text-xs font-medium text-white/70">
                            {new Date(data[hoveredPoint].date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                            })}
                            <span className="ml-2 text-white/40">
                                ({data[hoveredPoint].generationCount} gens)
                            </span>
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {Object.entries(data[hoveredPoint][activeCategory]).map(([key, value]) => (
                                <div key={key} className="flex items-center gap-2 text-xs">
                                    <div
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: (CATEGORY_COLORS[activeCategory] as any)[key] }}
                                    />
                                    <span className="text-white/60">
                                        {(CATEGORY_LABELS[activeCategory] as any)[key]}:
                                    </span>
                                    <span className="font-medium text-white">
                                        {(value as number).toFixed(1)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4">
                {Object.entries(CATEGORY_LABELS[activeCategory]).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                        <div
                            className="h-3 w-3 rounded"
                            style={{ backgroundColor: (CATEGORY_COLORS[activeCategory] as any)[key] }}
                        />
                        <span className="text-white/60">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
