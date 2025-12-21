/**
 * CostTracker - Track generation costs across sessions
 * Persists to localStorage with daily/weekly/monthly aggregations
 */

import { calculateGenerationCost, formatCost } from './ModelPricing';

export interface GenerationRecord {
    id: string;
    modelId: string;
    modelName: string;
    provider: string;
    cost: number;
    type: 'image' | 'video';
    quantity?: number;
    durationSeconds?: number;
    timestamp: number;
}

export interface CostSummary {
    today: number;
    thisWeek: number;
    thisMonth: number;
    allTime: number;
    byProvider: Record<string, number>;
    byModel: Record<string, number>;
    recentGenerations: GenerationRecord[];
}

const STORAGE_KEY = 'vibeboard_cost_tracker';
const MAX_RECORDS = 1000; // Keep last 1000 generations

class CostTrackerService {
    private records: GenerationRecord[] = [];
    private listeners: Set<() => void> = new Set();

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage(): void {
        if (typeof window === 'undefined') return;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.records = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load cost tracker data:', e);
            this.records = [];
        }
    }

    private saveToStorage(): void {
        if (typeof window === 'undefined') return;
        try {
            // Keep only recent records
            if (this.records.length > MAX_RECORDS) {
                this.records = this.records.slice(-MAX_RECORDS);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
        } catch (e) {
            console.error('Failed to save cost tracker data:', e);
        }
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener());
    }

    /**
     * Record a new generation
     */
    recordGeneration(params: {
        modelId: string;
        modelName: string;
        provider: string;
        type: 'image' | 'video';
        quantity?: number;
        durationSeconds?: number;
    }): GenerationRecord {
        const cost = calculateGenerationCost(params.modelId, {
            quantity: params.quantity,
            durationSeconds: params.durationSeconds,
        });

        const record: GenerationRecord = {
            id: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            modelId: params.modelId,
            modelName: params.modelName,
            provider: params.provider,
            cost,
            type: params.type,
            quantity: params.quantity,
            durationSeconds: params.durationSeconds,
            timestamp: Date.now(),
        };

        this.records.push(record);
        this.saveToStorage();
        this.notifyListeners();

        return record;
    }

    /**
     * Get cost summary with aggregations
     */
    getSummary(): CostSummary {
        const now = Date.now();
        const startOfDay = new Date().setHours(0, 0, 0, 0);
        const startOfWeek = now - (7 * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

        let today = 0;
        let thisWeek = 0;
        let thisMonth = 0;
        let allTime = 0;
        const byProvider: Record<string, number> = {};
        const byModel: Record<string, number> = {};

        for (const record of this.records) {
            allTime += record.cost;
            byProvider[record.provider] = (byProvider[record.provider] || 0) + record.cost;
            byModel[record.modelName] = (byModel[record.modelName] || 0) + record.cost;

            if (record.timestamp >= startOfDay) {
                today += record.cost;
            }
            if (record.timestamp >= startOfWeek) {
                thisWeek += record.cost;
            }
            if (record.timestamp >= startOfMonth) {
                thisMonth += record.cost;
            }
        }

        return {
            today,
            thisWeek,
            thisMonth,
            allTime,
            byProvider,
            byModel,
            recentGenerations: this.records.slice(-10).reverse(),
        };
    }

    /**
     * Get total count of generations
     */
    getTotalGenerations(): number {
        return this.records.length;
    }

    /**
     * Get generations by date range
     */
    getGenerationsByDateRange(startTime: number, endTime: number): GenerationRecord[] {
        return this.records.filter(r => r.timestamp >= startTime && r.timestamp <= endTime);
    }

    /**
     * Clear all records
     */
    clearAll(): void {
        this.records = [];
        this.saveToStorage();
        this.notifyListeners();
    }

    /**
     * Subscribe to changes
     */
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Export data as JSON
     */
    exportData(): string {
        return JSON.stringify({
            exportDate: new Date().toISOString(),
            totalGenerations: this.records.length,
            summary: this.getSummary(),
            records: this.records,
        }, null, 2);
    }
}

// Singleton instance
export const costTracker = new CostTrackerService();

// React hook for using cost tracker
export function useCostTracker() {
    if (typeof window === 'undefined') {
        return {
            summary: {
                today: 0,
                thisWeek: 0,
                thisMonth: 0,
                allTime: 0,
                byProvider: {},
                byModel: {},
                recentGenerations: [],
            },
            recordGeneration: () => {},
            clearAll: () => {},
            formatCost,
        };
    }

    // This will be used in the component with useState/useEffect
    return {
        getSummary: () => costTracker.getSummary(),
        recordGeneration: costTracker.recordGeneration.bind(costTracker),
        clearAll: costTracker.clearAll.bind(costTracker),
        subscribe: costTracker.subscribe.bind(costTracker),
        formatCost,
    };
}
