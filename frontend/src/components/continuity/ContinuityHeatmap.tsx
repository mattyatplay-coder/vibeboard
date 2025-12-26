"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, XCircle, Info, X, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { BACKEND_URL } from "@/lib/api";

interface DriftRegion {
    x: number;
    y: number;
    width: number;
    height: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
    category: 'color' | 'shape' | 'texture' | 'missing' | 'added' | 'position';
}

interface ContinuityResult {
    overallScore: number;
    driftDetected: boolean;
    driftRegions: DriftRegion[];
    summary: string;
    details: {
        colorConsistency: number;
        shapeConsistency: number;
        textureConsistency: number;
        characterMatch: number;
    };
    recommendations: string[];
}

interface ContinuityHeatmapProps {
    referenceImageUrl: string;
    generatedImageUrl: string;
    onClose?: () => void;
    characterNames?: string[];
}

export function ContinuityHeatmap({
    referenceImageUrl,
    generatedImageUrl,
    onClose,
    characterNames
}: ContinuityHeatmapProps) {
    const [result, setResult] = useState<ContinuityResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRegion, setSelectedRegion] = useState<DriftRegion | null>(null);
    const [showOverlay, setShowOverlay] = useState(true);

    useEffect(() => {
        checkContinuity();
    }, [referenceImageUrl, generatedImageUrl]);

    const checkContinuity = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${BACKEND_URL}/api/continuity/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    referenceImageUrl,
                    generatedImageUrl,
                    checkCharacters: characterNames && characterNames.length > 0,
                    characterNames
                })
            });

            if (!response.ok) {
                throw new Error('Failed to check continuity');
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    };

    const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
        switch (severity) {
            case 'low': return 'border-yellow-500/70 bg-yellow-500/20';
            case 'medium': return 'border-orange-500/70 bg-orange-500/20';
            case 'high': return 'border-red-500/70 bg-red-500/30';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 0.9) return 'text-green-400';
        if (score >= 0.7) return 'text-yellow-400';
        if (score >= 0.5) return 'text-orange-400';
        return 'text-red-400';
    };

    const getScoreIcon = (score: number) => {
        if (score >= 0.9) return <CheckCircle className="w-5 h-5 text-green-400" />;
        if (score >= 0.7) return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
        return <XCircle className="w-5 h-5 text-red-400" />;
    };

    return (
        <div className="bg-[#0a0a0a] rounded-xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-200">Continuity Check</span>
                    {result && (
                        <div className="flex items-center gap-2">
                            {getScoreIcon(result.overallScore)}
                            <span className={clsx("text-sm font-medium", getScoreColor(result.overallScore))}>
                                {Math.round(result.overallScore * 100)}% Match
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowOverlay(!showOverlay)}
                        className={clsx(
                            "px-2 py-1 rounded text-xs transition-colors",
                            showOverlay
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-white/5 text-gray-500"
                        )}
                    >
                        {showOverlay ? 'Hide' : 'Show'} Overlay
                    </button>
                    <button
                        onClick={checkContinuity}
                        disabled={isLoading}
                        className="p-1.5 text-gray-400 hover:text-white transition-colors"
                    >
                        <RefreshCw className={clsx("w-4 h-4", isLoading && "animate-spin")} />
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Image Comparison */}
            <div className="flex">
                {/* Reference Image */}
                <div className="flex-1 border-r border-white/10">
                    <div className="px-3 py-2 bg-white/5 border-b border-white/10">
                        <span className="text-xs text-gray-400">Reference</span>
                    </div>
                    <div className="aspect-video bg-black relative">
                        <img
                            src={referenceImageUrl}
                            alt="Reference"
                            className="w-full h-full object-contain"
                        />
                    </div>
                </div>

                {/* Generated Image with Heatmap */}
                <div className="flex-1">
                    <div className="px-3 py-2 bg-white/5 border-b border-white/10">
                        <span className="text-xs text-gray-400">Generated (with drift overlay)</span>
                    </div>
                    <div className="aspect-video bg-black relative overflow-hidden">
                        <img
                            src={generatedImageUrl}
                            alt="Generated"
                            className="w-full h-full object-contain"
                        />

                        {/* Loading Overlay */}
                        {isLoading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-sm text-gray-400">Analyzing...</span>
                                </div>
                            </div>
                        )}

                        {/* Drift Regions Overlay */}
                        <AnimatePresence>
                            {showOverlay && result && result.driftRegions.map((region, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    onClick={() => setSelectedRegion(region)}
                                    style={{
                                        left: `${region.x * 100}%`,
                                        top: `${region.y * 100}%`,
                                        width: `${region.width * 100}%`,
                                        height: `${region.height * 100}%`,
                                    }}
                                    className={clsx(
                                        "absolute border-2 rounded cursor-pointer transition-all hover:scale-105",
                                        getSeverityColor(region.severity),
                                        selectedRegion === region && "ring-2 ring-white/50"
                                    )}
                                >
                                    {/* Severity indicator */}
                                    <div className={clsx(
                                        "absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                                        region.severity === 'high' ? "bg-red-500 text-white" :
                                        region.severity === 'medium' ? "bg-orange-500 text-white" :
                                        "bg-yellow-500 text-black"
                                    )}>
                                        {index + 1}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Details Panel */}
            {result && (
                <div className="border-t border-white/10">
                    {/* Score Breakdown */}
                    <div className="px-4 py-3 bg-white/5 border-b border-white/10">
                        <div className="grid grid-cols-4 gap-4">
                            <ScoreBar label="Color" score={result.details.colorConsistency} />
                            <ScoreBar label="Shape" score={result.details.shapeConsistency} />
                            <ScoreBar label="Texture" score={result.details.textureConsistency} />
                            <ScoreBar label="Character" score={result.details.characterMatch} />
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="px-4 py-3 border-b border-white/10">
                        <p className="text-sm text-gray-300">{result.summary}</p>
                    </div>

                    {/* Selected Region Details */}
                    <AnimatePresence>
                        {selectedRegion && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 py-3 bg-white/5 border-b border-white/10">
                                    <div className="flex items-start gap-3">
                                        <div className={clsx(
                                            "px-2 py-1 rounded text-xs font-medium uppercase",
                                            selectedRegion.severity === 'high' ? "bg-red-500/20 text-red-400" :
                                            selectedRegion.severity === 'medium' ? "bg-orange-500/20 text-orange-400" :
                                            "bg-yellow-500/20 text-yellow-400"
                                        )}>
                                            {selectedRegion.severity} - {selectedRegion.category}
                                        </div>
                                        <p className="text-sm text-gray-300 flex-1">{selectedRegion.description}</p>
                                        <button
                                            onClick={() => setSelectedRegion(null)}
                                            className="p-1 text-gray-500 hover:text-white"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Recommendations */}
                    {result.recommendations.length > 0 && (
                        <div className="px-4 py-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Info className="w-4 h-4 text-blue-400" />
                                <span className="text-xs font-medium text-gray-400 uppercase">Recommendations</span>
                            </div>
                            <ul className="space-y-1">
                                {result.recommendations.map((rec, i) => (
                                    <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                                        <span className="text-blue-400 mt-1">•</span>
                                        {rec}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/20">
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}
        </div>
    );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
    const getColor = (s: number) => {
        if (s >= 0.9) return 'bg-green-500';
        if (s >= 0.7) return 'bg-yellow-500';
        if (s >= 0.5) return 'bg-orange-500';
        return 'bg-red-500';
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="text-xs font-medium text-gray-300">{Math.round(score * 100)}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={clsx("h-full rounded-full", getColor(score))}
                />
            </div>
        </div>
    );
}
