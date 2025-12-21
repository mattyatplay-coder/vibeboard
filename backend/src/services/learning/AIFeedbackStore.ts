import fs from 'fs';
import path from 'path';

/**
 * Feedback entry structure
 */
export interface FeedbackEntry {
    id: string;
    timestamp: string;
    context: 'generation-analysis' | 'magic-eraser' | 'prompt-enhancement';
    isHelpful: boolean;
    aiReasoning: string;         // What the AI said/suggested
    userCorrection?: string;     // What the user said was actually wrong
    objectType?: string;         // For magic eraser: tattoo, bikini, blemish, artifact, etc.
    maskPosition?: string;       // For magic eraser: "left hip", "shoulder", etc.
    imageDescription?: string;   // Brief description of the image context
}

/**
 * Learned pattern from negative feedback
 */
export interface LearnedPattern {
    id: string;
    learnedFrom: string;         // FeedbackEntry ID
    timestamp: string;
    context: string;
    pattern: string;             // The correction/lesson
    frequency: number;           // How many times this pattern has been seen
}

/**
 * AIFeedbackStore - Singleton service for storing and learning from user feedback
 *
 * This creates a simple file-based learning system that:
 * 1. Stores all feedback (thumbs up/down) with context
 * 2. Extracts patterns from negative feedback
 * 3. Injects learned patterns into future AI prompts
 */
export class AIFeedbackStore {
    private static instance: AIFeedbackStore;

    private feedbackPath: string;
    private patternsPath: string;
    private feedback: FeedbackEntry[] = [];
    private patterns: LearnedPattern[] = [];

    private constructor() {
        const dataDir = path.join(process.cwd(), 'data');

        // Ensure data directory exists
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.feedbackPath = path.join(dataDir, 'ai_feedback.json');
        this.patternsPath = path.join(dataDir, 'ai_patterns.json');

        this.loadData();
    }

    public static getInstance(): AIFeedbackStore {
        if (!AIFeedbackStore.instance) {
            AIFeedbackStore.instance = new AIFeedbackStore();
        }
        return AIFeedbackStore.instance;
    }

    private loadData(): void {
        try {
            if (fs.existsSync(this.feedbackPath)) {
                this.feedback = JSON.parse(fs.readFileSync(this.feedbackPath, 'utf-8'));
                console.log(`[AIFeedbackStore] Loaded ${this.feedback.length} feedback entries`);
            }
        } catch (e) {
            console.warn('[AIFeedbackStore] Failed to load feedback:', e);
            this.feedback = [];
        }

        try {
            if (fs.existsSync(this.patternsPath)) {
                this.patterns = JSON.parse(fs.readFileSync(this.patternsPath, 'utf-8'));
                console.log(`[AIFeedbackStore] Loaded ${this.patterns.length} learned patterns`);
            }
        } catch (e) {
            console.warn('[AIFeedbackStore] Failed to load patterns:', e);
            this.patterns = [];
        }
    }

    private saveData(): void {
        try {
            fs.writeFileSync(this.feedbackPath, JSON.stringify(this.feedback, null, 2));
            fs.writeFileSync(this.patternsPath, JSON.stringify(this.patterns, null, 2));
        } catch (e) {
            console.error('[AIFeedbackStore] Failed to save data:', e);
        }
    }

    /**
     * Add feedback from user
     */
    public addFeedback(entry: Omit<FeedbackEntry, 'id' | 'timestamp'>): FeedbackEntry {
        const newEntry: FeedbackEntry = {
            ...entry,
            id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString()
        };

        this.feedback.push(newEntry);

        // If negative feedback with a correction, learn from it
        if (!entry.isHelpful && entry.userCorrection) {
            this.learnFromMistake(newEntry);
        }

        this.saveData();
        console.log(`[AIFeedbackStore] Added feedback: ${newEntry.id} (helpful=${entry.isHelpful})`);

        return newEntry;
    }

    /**
     * Extract a pattern from negative feedback
     */
    private learnFromMistake(entry: FeedbackEntry): void {
        // Create a pattern from the correction
        const patternText = this.extractPattern(entry);

        if (!patternText) return;

        // Check if we already have a similar pattern
        const existing = this.patterns.find(p =>
            p.pattern.toLowerCase().includes(patternText.toLowerCase()) ||
            patternText.toLowerCase().includes(p.pattern.toLowerCase())
        );

        if (existing) {
            existing.frequency++;
            console.log(`[AIFeedbackStore] Reinforced pattern: "${existing.pattern}" (freq=${existing.frequency})`);
        } else {
            const newPattern: LearnedPattern = {
                id: `pat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                learnedFrom: entry.id,
                timestamp: new Date().toISOString(),
                context: entry.context,
                pattern: patternText,
                frequency: 1
            };
            this.patterns.push(newPattern);
            console.log(`[AIFeedbackStore] Learned new pattern: "${patternText}"`);
        }
    }

    /**
     * Extract a learnable pattern from feedback
     */
    private extractPattern(entry: FeedbackEntry): string | null {
        if (!entry.userCorrection) return null;

        const correction = entry.userCorrection.trim();

        // For magic eraser context, create specific patterns
        if (entry.context === 'magic-eraser') {
            if (entry.objectType) {
                return `When user masks a small dark spot, it is likely a ${entry.objectType} or editing artifact, NOT clothing removal`;
            }
            return `User correction: ${correction}`;
        }

        // For generation analysis
        if (entry.context === 'generation-analysis') {
            return `User noted: ${correction}`;
        }

        return correction;
    }

    /**
     * Get all learned hints for a specific context
     */
    public getLearnedHints(context: 'generation-analysis' | 'magic-eraser' | 'prompt-enhancement'): string[] {
        return this.patterns
            .filter(p => p.context === context)
            .sort((a, b) => b.frequency - a.frequency) // Most frequent first
            .slice(0, 5) // Top 5 patterns
            .map(p => p.pattern);
    }

    /**
     * Get all learned hints (regardless of context) for injection into prompts
     */
    public getAllLearnedHints(): string[] {
        return this.patterns
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 10)
            .map(p => p.pattern);
    }

    /**
     * Get feedback stats
     */
    public getStats(): {
        totalFeedback: number;
        helpful: number;
        unhelpful: number;
        helpfulRate: number;
        learnedPatterns: number;
        patterns: LearnedPattern[];
    } {
        const helpful = this.feedback.filter(f => f.isHelpful).length;
        const unhelpful = this.feedback.filter(f => !f.isHelpful).length;

        return {
            totalFeedback: this.feedback.length,
            helpful,
            unhelpful,
            helpfulRate: this.feedback.length > 0 ? helpful / this.feedback.length : 0,
            learnedPatterns: this.patterns.length,
            patterns: this.patterns
        };
    }

    /**
     * Get recent feedback entries
     */
    public getRecentFeedback(limit: number = 20): FeedbackEntry[] {
        return this.feedback
            .slice(-limit)
            .reverse();
    }
}
