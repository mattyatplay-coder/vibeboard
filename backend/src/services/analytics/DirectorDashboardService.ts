/**
 * DirectorDashboardService
 *
 * Analytics service for the Director's Dashboard providing insights into:
 * - Style Drift: Tracking how visual elements change over time
 * - Asset Usage: Tracking LoRA, Element, and Character appearances
 * - Generation Health: Success rates, error patterns
 * - Cost Analytics: Spending by model, provider, time period
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface StyleDriftDataPoint {
    timestamp: number;
    date: string;
    lighting: {
        lowKey: number;
        highKey: number;
        chiaroscuro: number;
        natural: number;
    };
    framing: {
        closeUp: number;  // ECU + CU + MCU
        medium: number;   // MS + MWS
        wide: number;     // WS + EWS
    };
    colorTemp: {
        warm: number;
        cool: number;
        neutral: number;
    };
    generationCount: number;
}

export interface AssetUsageRecord {
    assetId: string;
    assetType: 'lora' | 'element' | 'character';
    name: string;
    triggerWord?: string;
    thumbnail?: string;
    usageCount: number;
    lastUsed: number;
    byDay: Array<{ date: string; count: number }>;
}

export interface GenerationHealthMetrics {
    totalGenerations: number;
    successRate: number;
    averageRenderTime: number;
    errorPatterns: Array<{ error: string; count: number }>;
    byProvider: Array<{ provider: string; count: number; successRate: number }>;
    byModel: Array<{ model: string; count: number; avgCost: number }>;
}

export interface DashboardSummary {
    styleDrift: StyleDriftDataPoint[];
    assetUsage: AssetUsageRecord[];
    health: GenerationHealthMetrics;
    costByDay: Array<{ date: string; cost: number; count: number }>;
}

export class DirectorDashboardService {
    private static instance: DirectorDashboardService;

    private constructor() {}

    static getInstance(): DirectorDashboardService {
        if (!DirectorDashboardService.instance) {
            DirectorDashboardService.instance = new DirectorDashboardService();
        }
        return DirectorDashboardService.instance;
    }

    /**
     * Get style drift data for a project over time
     * Analyzes how lighting, framing, and color temperature shift across generations
     */
    async getStyleDrift(projectId: string, days: number = 30): Promise<StyleDriftDataPoint[]> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const generations = await prisma.generation.findMany({
            where: {
                projectId,
                status: 'succeeded',
                indexedAt: { not: null },
                visualDescription: { not: null },
                createdAt: { gte: startDate },
            },
            select: {
                createdAt: true,
                visualDescription: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        // Group by day
        const byDay: Record<string, StyleDriftDataPoint> = {};

        for (const gen of generations) {
            const dateStr = gen.createdAt.toISOString().split('T')[0];

            if (!byDay[dateStr]) {
                byDay[dateStr] = {
                    timestamp: new Date(dateStr).getTime(),
                    date: dateStr,
                    lighting: { lowKey: 0, highKey: 0, chiaroscuro: 0, natural: 0 },
                    framing: { closeUp: 0, medium: 0, wide: 0 },
                    colorTemp: { warm: 0, cool: 0, neutral: 0 },
                    generationCount: 0,
                };
            }

            const point = byDay[dateStr];
            point.generationCount++;

            if (gen.visualDescription) {
                try {
                    const desc = JSON.parse(gen.visualDescription);

                    // Lighting style
                    const lightingStyle = (desc.lighting?.style || '').toLowerCase();
                    if (lightingStyle.includes('low-key') || lightingStyle.includes('low key')) {
                        point.lighting.lowKey++;
                    } else if (lightingStyle.includes('high-key') || lightingStyle.includes('high key')) {
                        point.lighting.highKey++;
                    } else if (lightingStyle.includes('chiaroscuro')) {
                        point.lighting.chiaroscuro++;
                    } else {
                        point.lighting.natural++;
                    }

                    // Framing (shot size)
                    const shotSize = (desc.framing?.shotSize || '').toUpperCase();
                    if (['ECU', 'CU', 'MCU'].includes(shotSize)) {
                        point.framing.closeUp++;
                    } else if (['MS', 'MWS'].includes(shotSize)) {
                        point.framing.medium++;
                    } else if (['WS', 'EWS'].includes(shotSize)) {
                        point.framing.wide++;
                    }

                    // Color temperature
                    const colorTemp = (desc.lighting?.colorTemp || '').toLowerCase();
                    if (colorTemp.includes('warm') || colorTemp.includes('golden')) {
                        point.colorTemp.warm++;
                    } else if (colorTemp.includes('cool') || colorTemp.includes('blue')) {
                        point.colorTemp.cool++;
                    } else {
                        point.colorTemp.neutral++;
                    }
                } catch {
                    // Skip malformed JSON
                }
            }
        }

        // Convert percentages
        const result = Object.values(byDay).map(point => {
            const total = point.generationCount || 1;
            return {
                ...point,
                lighting: {
                    lowKey: (point.lighting.lowKey / total) * 100,
                    highKey: (point.lighting.highKey / total) * 100,
                    chiaroscuro: (point.lighting.chiaroscuro / total) * 100,
                    natural: (point.lighting.natural / total) * 100,
                },
                framing: {
                    closeUp: (point.framing.closeUp / total) * 100,
                    medium: (point.framing.medium / total) * 100,
                    wide: (point.framing.wide / total) * 100,
                },
                colorTemp: {
                    warm: (point.colorTemp.warm / total) * 100,
                    cool: (point.colorTemp.cool / total) * 100,
                    neutral: (point.colorTemp.neutral / total) * 100,
                },
            };
        });

        return result.sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Get asset usage statistics - tracks LoRAs, Elements, Characters
     */
    async getAssetUsage(projectId: string, days: number = 30): Promise<AssetUsageRecord[]> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const results: AssetUsageRecord[] = [];

        // Track LoRA usage (from usedLoras JSON field)
        const generationsWithLoras = await prisma.generation.findMany({
            where: {
                projectId,
                status: 'succeeded',
                usedLoras: { not: null },
                createdAt: { gte: startDate },
            },
            select: {
                createdAt: true,
                usedLoras: true,
            },
        });

        const loraUsage: Record<string, { count: number; lastUsed: number; byDay: Record<string, number>; name: string; triggerWord?: string }> = {};

        for (const gen of generationsWithLoras) {
            try {
                const loras = JSON.parse(gen.usedLoras || '[]');
                const dateStr = gen.createdAt.toISOString().split('T')[0];
                const timestamp = gen.createdAt.getTime();

                for (const lora of loras) {
                    const loraId = lora.id || lora.name;
                    if (!loraUsage[loraId]) {
                        loraUsage[loraId] = {
                            count: 0,
                            lastUsed: 0,
                            byDay: {},
                            name: lora.name || loraId,
                            triggerWord: lora.triggerWord,
                        };
                    }

                    loraUsage[loraId].count++;
                    loraUsage[loraId].lastUsed = Math.max(loraUsage[loraId].lastUsed, timestamp);
                    loraUsage[loraId].byDay[dateStr] = (loraUsage[loraId].byDay[dateStr] || 0) + 1;
                }
            } catch {
                // Skip malformed JSON
            }
        }

        for (const [loraId, data] of Object.entries(loraUsage)) {
            results.push({
                assetId: loraId,
                assetType: 'lora',
                name: data.name,
                triggerWord: data.triggerWord,
                usageCount: data.count,
                lastUsed: data.lastUsed,
                byDay: Object.entries(data.byDay).map(([date, count]) => ({ date, count })),
            });
        }

        // Track Element usage (from sourceElementIds)
        const generationsWithElements = await prisma.generation.findMany({
            where: {
                projectId,
                status: 'succeeded',
                sourceElementIds: { not: null },
                createdAt: { gte: startDate },
            },
            select: {
                createdAt: true,
                sourceElementIds: true,
            },
        });

        const elementUsage: Record<string, { count: number; lastUsed: number; byDay: Record<string, number> }> = {};

        for (const gen of generationsWithElements) {
            try {
                const elementIds = JSON.parse(gen.sourceElementIds || '[]');
                const dateStr = gen.createdAt.toISOString().split('T')[0];
                const timestamp = gen.createdAt.getTime();

                for (const elementId of elementIds) {
                    if (!elementUsage[elementId]) {
                        elementUsage[elementId] = { count: 0, lastUsed: 0, byDay: {} };
                    }

                    elementUsage[elementId].count++;
                    elementUsage[elementId].lastUsed = Math.max(elementUsage[elementId].lastUsed, timestamp);
                    elementUsage[elementId].byDay[dateStr] = (elementUsage[elementId].byDay[dateStr] || 0) + 1;
                }
            } catch {
                // Skip malformed JSON
            }
        }

        // Get element names
        const elementIds = Object.keys(elementUsage);
        if (elementIds.length > 0) {
            const elements = await prisma.element.findMany({
                where: { id: { in: elementIds } },
                select: { id: true, name: true, fileUrl: true },
            });

            const elementMap = new Map(elements.map(e => [e.id, e]));

            for (const [elementId, data] of Object.entries(elementUsage)) {
                const element = elementMap.get(elementId);
                results.push({
                    assetId: elementId,
                    assetType: 'element',
                    name: element?.name || `Element ${elementId.slice(0, 8)}`,
                    thumbnail: element?.fileUrl,
                    usageCount: data.count,
                    lastUsed: data.lastUsed,
                    byDay: Object.entries(data.byDay).map(([date, count]) => ({ date, count })),
                });
            }
        }

        // Sort by usage count descending
        return results.sort((a, b) => b.usageCount - a.usageCount);
    }

    /**
     * Get generation health metrics
     */
    async getGenerationHealth(projectId: string, days: number = 30): Promise<GenerationHealthMetrics> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const generations = await prisma.generation.findMany({
            where: {
                projectId,
                createdAt: { gte: startDate },
            },
            select: {
                status: true,
                failureReason: true,
                provider: true,
                engine: true,
                inferenceTime: true,
                actualCost: true,
            },
        });

        const totalGenerations = generations.length;
        const succeeded = generations.filter(g => g.status === 'succeeded').length;
        const successRate = totalGenerations > 0 ? (succeeded / totalGenerations) * 100 : 0;

        // Average render time (only successful generations with time data)
        const withTime = generations.filter(g => g.status === 'succeeded' && g.inferenceTime);
        const averageRenderTime = withTime.length > 0
            ? withTime.reduce((sum, g) => sum + (g.inferenceTime || 0), 0) / withTime.length
            : 0;

        // Error patterns
        const errorCounts: Record<string, number> = {};
        for (const gen of generations) {
            if (gen.status === 'failed' && gen.failureReason) {
                const reason = gen.failureReason.substring(0, 100); // Truncate for grouping
                errorCounts[reason] = (errorCounts[reason] || 0) + 1;
            }
        }
        const errorPatterns = Object.entries(errorCounts)
            .map(([error, count]) => ({ error, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // By provider
        const providerStats: Record<string, { total: number; succeeded: number }> = {};
        for (const gen of generations) {
            const provider = gen.provider || gen.engine || 'unknown';
            if (!providerStats[provider]) {
                providerStats[provider] = { total: 0, succeeded: 0 };
            }
            providerStats[provider].total++;
            if (gen.status === 'succeeded') {
                providerStats[provider].succeeded++;
            }
        }
        const byProvider = Object.entries(providerStats).map(([provider, stats]) => ({
            provider,
            count: stats.total,
            successRate: stats.total > 0 ? (stats.succeeded / stats.total) * 100 : 0,
        }));

        // By model (from engine field which stores model ID)
        const modelStats: Record<string, { total: number; totalCost: number }> = {};
        for (const gen of generations) {
            if (gen.status === 'succeeded') {
                const model = gen.engine || 'unknown';
                if (!modelStats[model]) {
                    modelStats[model] = { total: 0, totalCost: 0 };
                }
                modelStats[model].total++;
                modelStats[model].totalCost += gen.actualCost || 0;
            }
        }
        const byModel = Object.entries(modelStats).map(([model, stats]) => ({
            model,
            count: stats.total,
            avgCost: stats.total > 0 ? stats.totalCost / stats.total : 0,
        })).sort((a, b) => b.count - a.count);

        return {
            totalGenerations,
            successRate,
            averageRenderTime,
            errorPatterns,
            byProvider,
            byModel,
        };
    }

    /**
     * Get cost analytics by day
     */
    async getCostByDay(projectId: string, days: number = 30): Promise<Array<{ date: string; cost: number; count: number }>> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const generations = await prisma.generation.findMany({
            where: {
                projectId,
                status: 'succeeded',
                createdAt: { gte: startDate },
            },
            select: {
                createdAt: true,
                actualCost: true,
            },
        });

        const byDay: Record<string, { cost: number; count: number }> = {};

        for (const gen of generations) {
            const dateStr = gen.createdAt.toISOString().split('T')[0];
            if (!byDay[dateStr]) {
                byDay[dateStr] = { cost: 0, count: 0 };
            }
            byDay[dateStr].cost += gen.actualCost || 0;
            byDay[dateStr].count++;
        }

        return Object.entries(byDay)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * Get full dashboard summary
     */
    async getDashboardSummary(projectId: string, days: number = 30): Promise<DashboardSummary> {
        const [styleDrift, assetUsage, health, costByDay] = await Promise.all([
            this.getStyleDrift(projectId, days),
            this.getAssetUsage(projectId, days),
            this.getGenerationHealth(projectId, days),
            this.getCostByDay(projectId, days),
        ]);

        return {
            styleDrift,
            assetUsage,
            health,
            costByDay,
        };
    }
}
