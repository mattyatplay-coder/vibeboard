'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useEngineConfigStore } from '@/lib/engineConfigStore';
import { ALL_MODELS, ModelInfo } from '@/lib/ModelRegistry';

// Helper to find model by ID
function getModelById(modelId: string): ModelInfo | undefined {
    return ALL_MODELS.find((m) => m.id === modelId);
}

/**
 * UX-006: Cost Breakdown Interface
 * Provides granular cost calculation for the popover
 */
export interface CostBreakdown {
    baseCost: number;
    duration: number;
    variations: number;
    total: number;
    formula: string;
    modelName: string;
    modelTier: string;
}

/**
 * UX-004: Producer Display Mode
 * 'widget' - Traditional floating widget (default)
 * 'toast' - Sonner toast notifications (less intrusive)
 */
export type ProducerDisplayMode = 'widget' | 'toast';

// Session storage key for persistence
const ACKNOWLEDGED_ALERTS_KEY = 'vibe_acknowledged_alerts';
const DISPLAY_MODE_KEY = 'vibe_producer_display_mode';

/**
 * Producer Alert Interface
 *
 * Alerts are prioritized by severity and displayed one at a time.
 * Users must acknowledge alerts before they're removed.
 */
export interface ProducerAlert {
    id: string;
    title: string;
    message: string;
    severity: 'Financial' | 'Consistency' | 'Technical';
    actionType?: 'switch_model' | 'hide_warning';
    actionValue?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

/**
 * Cost thresholds for alerts
 */
const COST_THRESHOLDS = {
    WARNING: 1.0, // $1.00 - Show financial warning
    DANGER: 5.0, // $5.00 - Show danger alert
};

/**
 * Draft models for cost-saving recommendations
 */
const DRAFT_MODEL_SUGGESTIONS: Record<string, string> = {
    'fal-ai/veo-3': 'fal-ai/wan-2.1-t2v-1.3b',
    'fal-ai/kling-video/v2/master': 'fal-ai/wan-2.1-t2v-1.3b',
    'fal-ai/minimax-video/video-01-subject-reference': 'fal-ai/wan-2.1-t2v-1.3b',
};

/**
 * useProducerAgent - The Cost Guardian Hook
 *
 * Monitors engine configuration and provides:
 * - Real-time cost estimation
 * - Financial alerts for budget overruns
 * - Technical alerts for GPU requirements
 * - Consistency alerts for character/style drift
 * - Anamorphic aspect ratio mismatch detection
 */
export const useProducerAgent = (variations: number = 1) => {
    const { currentModelId, currentDuration, currentAspectRatio, isVideo, setCurrentConfig } = useEngineConfigStore();
    const [alerts, setAlerts] = useState<ProducerAlert[]>([]);
    const [isEstimating, setIsEstimating] = useState(false);

    // UX-007: Persist acknowledged alerts to sessionStorage
    const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = sessionStorage.getItem(ACKNOWLEDGED_ALERTS_KEY);
                return saved ? new Set(JSON.parse(saved)) : new Set();
            } catch {
                return new Set();
            }
        }
        return new Set();
    });

    // UX-004: Display mode preference (widget vs toast)
    const [displayMode, setDisplayMode] = useState<ProducerDisplayMode>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = sessionStorage.getItem(DISPLAY_MODE_KEY);
                return (saved as ProducerDisplayMode) || 'widget';
            } catch {
                return 'widget';
            }
        }
        return 'widget';
    });

    // UX-007: Persist acknowledged alerts when they change
    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem(
                ACKNOWLEDGED_ALERTS_KEY,
                JSON.stringify(Array.from(acknowledgedAlerts))
            );
        }
    }, [acknowledgedAlerts]);

    // UX-004: Persist display mode preference
    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem(DISPLAY_MODE_KEY, displayMode);
        }
    }, [displayMode]);

    // Parse cost string to number (e.g., "$0.003" -> 0.003)
    const parseCostString = (costStr?: string): number => {
        if (!costStr) return 0.05; // Default fallback
        const match = costStr.match(/[\d.]+/);
        if (!match) return 0.05;
        const parsed = parseFloat(match[0]);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0.05;
    };

    // UX-006: Calculate detailed cost breakdown
    const costBreakdown = useMemo<CostBreakdown>(() => {
        const defaultBreakdown: CostBreakdown = {
            baseCost: 0,
            duration: 0,
            variations: variations || 1,
            total: 0,
            formula: '-',
            modelName: 'No model selected',
            modelTier: '-',
        };

        if (!currentModelId) return defaultBreakdown;

        const model = getModelById(currentModelId);
        if (!model) return defaultBreakdown;

        // Parse cost from model's cost string or use defaults
        const baseCost = parseCostString(model.cost);
        const durationSeconds = isVideo ? parseInt(String(currentDuration) || '5', 10) : 1;
        const numVariations = variations || 1;

        let total: number;
        let formula: string;

        if (isVideo) {
            // Video: base cost * duration multiplier
            total = baseCost * durationSeconds * numVariations;
            formula = `$${baseCost.toFixed(3)} × ${durationSeconds}s × ${numVariations} variation${numVariations > 1 ? 's' : ''}`;
        } else {
            // Image: base cost per image
            total = baseCost * numVariations;
            formula = `$${baseCost.toFixed(3)} × ${numVariations} variation${numVariations > 1 ? 's' : ''}`;
        }

        return {
            baseCost,
            duration: isVideo ? durationSeconds : 0,
            variations: numVariations,
            total,
            formula,
            modelName: model.name,
            modelTier: model.tier || 'standard',
        };
    }, [currentModelId, currentDuration, isVideo, variations]);

    // Legacy: totalCostEstimate for backwards compatibility
    const totalCostEstimate = costBreakdown.total;

    // Handle action execution
    const handleAction = useCallback((alertId: string, actionType?: string, actionValue?: string) => {
        if (actionType === 'switch_model' && actionValue) {
            setCurrentConfig({ modelId: actionValue });
        }
        // Always acknowledge after action
        setAcknowledgedAlerts((prev) => new Set([...prev, alertId]));
    }, [setCurrentConfig]);

    // Generate alerts based on current state
    useEffect(() => {
        const newAlerts: ProducerAlert[] = [];
        const model = currentModelId ? getModelById(currentModelId) : null;
        const aspectRatio = currentAspectRatio || '16:9';
        const modelId = currentModelId || '';

        // Financial Alerts
        if (totalCostEstimate >= COST_THRESHOLDS.DANGER) {
            const alertId = `financial-danger-${totalCostEstimate.toFixed(2)}`;
            if (!acknowledgedAlerts.has(alertId)) {
                const draftModel = DRAFT_MODEL_SUGGESTIONS[modelId] || 'fal-ai/wan-2.1-t2v-1.3b';
                newAlerts.push({
                    id: alertId,
                    title: '⚠️ High Cost Job',
                    message: `This job is estimated at $${totalCostEstimate.toFixed(2)}. Consider using a Draft model like Wan 2.1 for iteration, then upgrade to Master quality.`,
                    severity: 'Financial',
                    actionType: 'switch_model',
                    actionValue: draftModel,
                    action: {
                        label: 'Switch to Draft',
                        onClick: () => handleAction(alertId, 'switch_model', draftModel),
                    },
                });
            }
        } else if (totalCostEstimate >= COST_THRESHOLDS.WARNING) {
            const alertId = `financial-warning-${totalCostEstimate.toFixed(2)}`;
            if (!acknowledgedAlerts.has(alertId)) {
                newAlerts.push({
                    id: alertId,
                    title: 'Budget Check',
                    message: `This job costs $${totalCostEstimate.toFixed(2)}. You can save money by reducing duration or using fewer variations.`,
                    severity: 'Financial',
                    actionType: 'hide_warning',
                });
            }
        }

        // Technical Alerts - Pro tier models typically require more resources
        if (model && model.tier === 'pro') {
            const alertId = `technical-pro-${model.id}`;
            if (!acknowledgedAlerts.has(alertId)) {
                newAlerts.push({
                    id: alertId,
                    title: 'Pro Model Selected',
                    message: `${model.name} is a Pro-tier model with higher resource requirements. Consider using a fast-tier model for initial iterations.`,
                    severity: 'Technical',
                    actionType: 'hide_warning',
                });
            }
        }

        // Technical Alerts - Long Duration
        if (isVideo && currentDuration && parseInt(String(currentDuration)) > 10) {
            const alertId = `technical-duration-${currentDuration}`;
            if (!acknowledgedAlerts.has(alertId)) {
                newAlerts.push({
                    id: alertId,
                    title: 'Extended Duration',
                    message: `${currentDuration}s video generation may take several minutes and consume significant GPU time. Consider testing at 5s first.`,
                    severity: 'Technical',
                    actionType: 'hide_warning',
                });
            }
        }

        // Technical Alerts - Anamorphic Aspect Ratio Mismatch
        // Anamorphic lenses should use 21:9 or 2.39:1, not 16:9
        if (aspectRatio === '16:9' && modelId.toLowerCase().includes('anamorphic')) {
            const alertId = `technical-anamorphic-mismatch`;
            if (!acknowledgedAlerts.has(alertId)) {
                newAlerts.push({
                    id: alertId,
                    title: 'Anamorphic Aspect Mismatch',
                    message: 'Anamorphic lens selected with 16:9 aspect ratio. Consider switching to 21:9 for authentic cinematic look.',
                    severity: 'Technical',
                    actionType: 'hide_warning',
                });
            }
        }

        // Consistency Alerts - Missing Assets (placeholder for future implementation)
        // This would check if character references are set for character-dependent models
        // Example: if (model?.capability === 'character' && !hasCharacterReferences) { ... }

        // Sort by severity: Technical > Financial > Consistency
        const severityOrder = { Technical: 0, Financial: 1, Consistency: 2 };
        newAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        setAlerts(newAlerts);
    }, [totalCostEstimate, currentModelId, currentDuration, currentAspectRatio, isVideo, acknowledgedAlerts, handleAction]);

    // Clear/acknowledge an alert
    const clearAlert = useCallback((alertId: string) => {
        setAcknowledgedAlerts((prev) => new Set([...prev, alertId]));
    }, []);

    // UX-005: Clear/acknowledge all current alerts at once
    const clearAllAlerts = useCallback(() => {
        setAcknowledgedAlerts((prev) => {
            const newSet = new Set(prev);
            alerts.forEach((alert) => newSet.add(alert.id));
            return newSet;
        });
    }, [alerts]);

    // Reset acknowledged alerts (useful when configuration changes significantly)
    const resetAlerts = useCallback(() => {
        setAcknowledgedAlerts(new Set());
    }, []);

    // Add a custom alert (for external systems)
    const addAlert = useCallback((alert: Omit<ProducerAlert, 'id'>) => {
        const id = `custom-${Date.now()}`;
        setAlerts((prev) => [{ ...alert, id }, ...prev]);
    }, []);

    // UX-004: Toggle display mode
    const toggleDisplayMode = useCallback(() => {
        setDisplayMode((prev) => (prev === 'widget' ? 'toast' : 'widget'));
    }, []);

    // UX-004: Dispatch alerts as toasts when in toast mode
    useEffect(() => {
        if (displayMode !== 'toast') return;

        const topAlert = alerts[0];
        if (!topAlert) return;

        // Map severity to toast type
        const toastType = {
            Financial: 'warning',
            Technical: 'error',
            Consistency: 'info',
        }[topAlert.severity] as 'warning' | 'error' | 'info';

        // Show toast with action
        toast[toastType](topAlert.title, {
            description: topAlert.message,
            duration: 8000,
            action: topAlert.actionType === 'switch_model' && topAlert.action
                ? {
                    label: topAlert.action.label,
                    onClick: () => handleAction(topAlert.id, topAlert.actionType, topAlert.actionValue),
                }
                : {
                    label: 'Dismiss',
                    onClick: () => clearAlert(topAlert.id),
                },
        });

        // Auto-acknowledge after toast is shown (to prevent repeating)
        clearAlert(topAlert.id);
    }, [alerts, displayMode, handleAction, clearAlert]);

    return {
        alerts,
        clearAlert,
        clearAllAlerts,
        resetAlerts,
        addAlert,
        handleAction,
        totalCostEstimate,
        costBreakdown,
        isEstimating,
        displayMode,
        setDisplayMode,
        toggleDisplayMode,
    };
};
