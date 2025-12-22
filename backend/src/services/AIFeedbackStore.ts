import fs from 'fs';
import path from 'path';

interface FeedbackEntry {
  id: string;
  timestamp: string;
  isHelpful: boolean;
  maskPosition: string; // e.g., "upper-left", "lower-center"
  aiReasoning: string; // What the AI said
  userCorrection?: string; // What the user actually wanted (if provided)
  objectType?: string; // tattoo, bikini, blemish, etc. (inferred or provided)
}

interface LearnedPattern {
  maskPosition: string;
  commonMistakes: string[]; // What AI often gets wrong at this position
  corrections: string[]; // What it should have said
  confidence: number; // How sure we are (based on feedback count)
}

class AIFeedbackStore {
  private feedbackFile: string;
  private patternsFile: string;
  private feedback: FeedbackEntry[] = [];
  private patterns: Map<string, LearnedPattern> = new Map();

  constructor() {
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.feedbackFile = path.join(dataDir, 'ai_feedback.json');
    this.patternsFile = path.join(dataDir, 'ai_patterns.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.feedbackFile)) {
        this.feedback = JSON.parse(fs.readFileSync(this.feedbackFile, 'utf-8'));
      }
      if (fs.existsSync(this.patternsFile)) {
        const patternsArray = JSON.parse(fs.readFileSync(this.patternsFile, 'utf-8'));
        this.patterns = new Map(patternsArray.map((p: LearnedPattern) => [p.maskPosition, p]));
      }
    } catch (err) {
      console.error('[AIFeedbackStore] Error loading data:', err);
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.feedbackFile, JSON.stringify(this.feedback, null, 2));
      fs.writeFileSync(
        this.patternsFile,
        JSON.stringify(Array.from(this.patterns.values()), null, 2)
      );
    } catch (err) {
      console.error('[AIFeedbackStore] Error saving data:', err);
    }
  }

  /**
   * Record feedback from user
   */
  addFeedback(entry: Omit<FeedbackEntry, 'id' | 'timestamp'>) {
    const fullEntry: FeedbackEntry = {
      ...entry,
      id: `fb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    this.feedback.push(fullEntry);

    // Update patterns based on negative feedback
    if (!entry.isHelpful) {
      this.learnFromMistake(fullEntry);
    }

    this.save();
    console.log(
      `[AIFeedbackStore] Recorded feedback: ${entry.isHelpful ? '✅' : '❌'} at ${entry.maskPosition}`
    );
  }

  /**
   * Learn from a mistake - update patterns
   */
  private learnFromMistake(entry: FeedbackEntry) {
    const pos = entry.maskPosition || 'unknown';
    let pattern = this.patterns.get(pos);

    if (!pattern) {
      pattern = {
        maskPosition: pos,
        commonMistakes: [],
        corrections: [],
        confidence: 0,
      };
    }

    // Extract what the AI got wrong from its reasoning
    const reasoning = entry.aiReasoning.toLowerCase();

    // Detect common misidentifications
    if (
      reasoning.includes('bikini') ||
      reasoning.includes('string') ||
      reasoning.includes('strap')
    ) {
      if (!pattern.commonMistakes.includes('misidentifies as bikini/strap')) {
        pattern.commonMistakes.push('misidentifies as bikini/strap');
      }
    }
    if (reasoning.includes('tattoo')) {
      if (!pattern.commonMistakes.includes('misidentifies as tattoo')) {
        pattern.commonMistakes.push('misidentifies as tattoo');
      }
    }
    if (reasoning.includes('shoulder') || reasoning.includes('arm')) {
      if (!pattern.commonMistakes.includes('confuses body part location')) {
        pattern.commonMistakes.push('confuses body part location');
      }
    }

    // If user provided what they actually wanted, record it
    if (entry.userCorrection) {
      if (!pattern.corrections.includes(entry.userCorrection)) {
        pattern.corrections.push(entry.userCorrection);
      }
    }

    // Increase confidence with more feedback
    pattern.confidence = Math.min(1, pattern.confidence + 0.1);

    this.patterns.set(pos, pattern);
  }

  /**
   * Get learned corrections for a given mask position
   * Returns hints to inject into the AI prompt
   */
  getLearnedCorrections(maskPosition: string): string | null {
    const pattern = this.patterns.get(maskPosition);

    if (!pattern || pattern.confidence < 0.2) {
      return null; // Not enough data yet
    }

    let hints: string[] = [];

    if (pattern.commonMistakes.length > 0) {
      hints.push(`WARNING: At ${maskPosition}, the AI has previously made these mistakes:`);
      pattern.commonMistakes.forEach(m => hints.push(`  - ${m}`));
      hints.push('DO NOT repeat these mistakes. Look more carefully at the actual content.');
    }

    if (pattern.corrections.length > 0) {
      hints.push(
        `Previous users at this position actually wanted to remove: ${pattern.corrections.join(', ')}`
      );
    }

    return hints.length > 0 ? hints.join('\n') : null;
  }

  /**
   * Get all learned patterns as hints for analysis prompts
   * This is used by generation analysis to learn from past mistakes
   */
  getAllLearnedHints(): string | null {
    // Get patterns specific to generation-analysis
    const analysisPattern = this.patterns.get('generation-analysis');

    // Also get recent corrections from feedback
    const recentCorrections = this.feedback
      .filter(f => !f.isHelpful && f.userCorrection && f.maskPosition === 'generation-analysis')
      .slice(-5) // Last 5 corrections
      .map(f => f.userCorrection)
      .filter((c): c is string => !!c);

    if (!analysisPattern && recentCorrections.length === 0) {
      return null;
    }

    const hints: string[] = [];

    if (analysisPattern && analysisPattern.corrections.length > 0) {
      hints.push('=== LEARNED FROM PAST FEEDBACK ===');
      hints.push('Previous users have corrected the AI on these issues:');
      analysisPattern.corrections.slice(-5).forEach(c => {
        hints.push(`  - "${c}"`);
      });
      hints.push('Pay special attention to these kinds of details that the AI has missed before.');
      hints.push('=== END LEARNED FEEDBACK ===');
    }

    if (recentCorrections.length > 0 && hints.length === 0) {
      hints.push('=== LEARNED FROM PAST FEEDBACK ===');
      hints.push('Users have previously noted these issues were missed:');
      recentCorrections.forEach(c => {
        hints.push(`  - "${c}"`);
      });
      hints.push('=== END LEARNED FEEDBACK ===');
    }

    return hints.length > 0 ? hints.join('\n') : null;
  }

  /**
   * Get statistics about feedback
   */
  getStats() {
    const total = this.feedback.length;
    const helpful = this.feedback.filter(f => f.isHelpful).length;
    const unhelpful = total - helpful;

    return {
      totalFeedback: total,
      helpful,
      unhelpful,
      helpfulRate: total > 0 ? ((helpful / total) * 100).toFixed(1) + '%' : 'N/A',
      learnedPatterns: this.patterns.size,
      patterns: Array.from(this.patterns.values()),
    };
  }

  /**
   * Clear all learned data (for testing/reset)
   */
  clear() {
    this.feedback = [];
    this.patterns.clear();
    this.save();
  }
}

// Singleton instance
export const aiFeedbackStore = new AIFeedbackStore();
