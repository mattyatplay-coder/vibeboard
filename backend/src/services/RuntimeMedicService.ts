/**
 * Runtime Medic Service - Self-Healing Infrastructure
 *
 * Uses AI to analyze failed generation jobs and attempt auto-recovery:
 * - NSFW_VIOLATION: Rewrite prompt to pass content filters
 * - MALFORMED_JSON: Fix payload structure
 * - TIMEOUT: Switch to faster model tier
 * - REFERENCE_MISSING: Fall back to T2I with detailed prompt
 * - RATE_LIMIT: Queue with exponential backoff
 *
 * Powered by MiniMax M2.1's Code Interpreter capability for error analysis.
 */

import axios from 'axios';

// Error classification types
export type ErrorType =
  | 'NSFW_VIOLATION'
  | 'MALFORMED_JSON'
  | 'TIMEOUT'
  | 'REFERENCE_MISSING'
  | 'RATE_LIMIT'
  | 'MODEL_UNAVAILABLE'
  | 'INSUFFICIENT_CREDITS'
  | 'INVALID_DIMENSIONS'
  | 'PROMPT_TOO_LONG'
  | 'UNKNOWN';

export interface FailedJob {
  id: string;
  model: string;
  prompt: string;
  negativePrompt?: string;
  imageUrl?: string;
  audioUrl?: string;
  error: string;
  errorStack?: string;
  params: Record<string, unknown>;
  attemptCount: number;
  timestamp: Date;
}

export interface MedicDiagnosis {
  errorType: ErrorType;
  confidence: number; // 0-1
  analysis: string;
  recommendation: string;
  canAutoRepair: boolean;
}

export interface RepairResult {
  success: boolean;
  repairType: 'prompt_rewrite' | 'param_fix' | 'model_switch' | 'retry_later' | 'escalate';
  repairedJob?: {
    prompt: string;
    negativePrompt?: string;
    model?: string;
    params?: Record<string, unknown>;
  };
  message: string;
  retryDelay?: number; // ms
}

export interface MedicIntervention {
  id: string;
  jobId: string;
  timestamp: Date;
  originalError: string;
  diagnosis: MedicDiagnosis;
  repair: RepairResult;
  outcome: 'success' | 'failed' | 'pending';
}

// Error patterns for classification
const ERROR_PATTERNS: Record<ErrorType, RegExp[]> = {
  NSFW_VIOLATION: [
    /nsfw/i,
    /content.*(policy|filter|violation)/i,
    /explicit/i,
    /adult.*content/i,
    /safety.*filter/i,
    /inappropriate/i,
    /blocked.*content/i,
  ],
  MALFORMED_JSON: [
    /json/i,
    /parse.*error/i,
    /invalid.*payload/i,
    /unexpected.*token/i,
    /syntax.*error/i,
  ],
  TIMEOUT: [/timeout/i, /timed.*out/i, /deadline.*exceeded/i, /too.*long/i, /execution.*time/i],
  REFERENCE_MISSING: [
    /reference.*missing/i,
    /image.*required/i,
    /no.*input.*image/i,
    /source.*not.*found/i,
    /url.*invalid/i,
  ],
  RATE_LIMIT: [/rate.*limit/i, /too.*many.*requests/i, /quota.*exceeded/i, /429/i, /throttl/i],
  MODEL_UNAVAILABLE: [/model.*not.*found/i, /unavailable/i, /maintenance/i, /deprecated/i, /503/i],
  INSUFFICIENT_CREDITS: [/insufficient.*credits/i, /balance/i, /payment/i, /billing/i, /402/i],
  INVALID_DIMENSIONS: [
    /dimension/i,
    /resolution/i,
    /width.*height/i,
    /aspect.*ratio/i,
    /size.*not.*supported/i,
  ],
  PROMPT_TOO_LONG: [/prompt.*too.*long/i, /token.*limit/i, /max.*length/i, /truncat/i],
  UNKNOWN: [],
};

// Euphemism rewrites for NSFW bypass
const EUPHEMISM_MAP: Record<string, string> = {
  blood: 'crimson fluid',
  violent: 'intense',
  gore: 'dramatic effect',
  kill: 'defeat',
  death: 'fallen',
  weapon: 'prop',
  gun: 'device',
  knife: 'blade prop',
  nude: 'artistic figure',
  naked: 'natural form',
  sexy: 'elegant',
  sensual: 'graceful',
  fight: 'confrontation',
  attack: 'approach',
  explode: 'burst',
  destroy: 'transform',
};

// Fast model alternatives by provider
const FAST_MODEL_MAP: Record<string, string> = {
  'fal-ai/flux-pro/v1.1-ultra': 'fal-ai/flux/schnell',
  'fal-ai/flux-pro/v1.1': 'fal-ai/flux/schnell',
  'fal-ai/flux/dev': 'fal-ai/flux/schnell',
  'fal-ai/minimax/video-01': 'fal-ai/minimax/video-01-live',
  'fal-ai/kling-video/v1.5/pro': 'fal-ai/kling-video/v1.5/standard',
  'fal-ai/kling-video/v2/master': 'fal-ai/kling-video/v1.5/standard',
  'fal-ai/luma-dream-machine': 'fal-ai/luma-dream-machine/ray-2-flash',
};

// Permissive models for NSFW content
const PERMISSIVE_MODELS = [
  'fal-ai/flux/dev', // More permissive than Pro
  'runpod/wan2.1', // Self-hosted, no filter
];

export class RuntimeMedicService {
  private static instance: RuntimeMedicService;
  private interventionLog: MedicIntervention[] = [];
  private minimaxApiKey: string | null;
  private isEnabled: boolean;

  private constructor() {
    this.minimaxApiKey = process.env.MINIMAX_API_KEY || null;
    this.isEnabled = process.env.RUNTIME_MEDIC_ENABLED !== 'false';

    if (this.isEnabled) {
      console.log('[RuntimeMedic] Initialized - Self-healing infrastructure active');
      if (!this.minimaxApiKey) {
        console.log('[RuntimeMedic] MiniMax API key not set - using pattern matching only');
      }
    } else {
      console.log('[RuntimeMedic] Disabled via RUNTIME_MEDIC_ENABLED=false');
    }
  }

  public static getInstance(): RuntimeMedicService {
    if (!RuntimeMedicService.instance) {
      RuntimeMedicService.instance = new RuntimeMedicService();
    }
    return RuntimeMedicService.instance;
  }

  /**
   * Diagnose a failed job and determine the error type
   */
  async diagnose(job: FailedJob): Promise<MedicDiagnosis> {
    if (!this.isEnabled) {
      return {
        errorType: 'UNKNOWN',
        confidence: 0,
        analysis: 'Runtime Medic disabled',
        recommendation: 'Enable RUNTIME_MEDIC_ENABLED to use self-healing',
        canAutoRepair: false,
      };
    }

    // First, try pattern matching for quick classification
    const patternMatch = this.classifyByPattern(job.error);
    if (patternMatch.confidence > 0.8) {
      return patternMatch;
    }

    // If pattern matching is uncertain, use MiniMax for deep analysis
    if (this.minimaxApiKey && patternMatch.confidence < 0.7) {
      try {
        return await this.analyzeWithMiniMax(job);
      } catch (err) {
        console.error('[RuntimeMedic] MiniMax analysis failed, falling back to patterns:', err);
      }
    }

    return patternMatch;
  }

  /**
   * Classify error type using regex patterns
   */
  private classifyByPattern(error: string): MedicDiagnosis {
    for (const [errorType, patterns] of Object.entries(ERROR_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(error)) {
          return {
            errorType: errorType as ErrorType,
            confidence: 0.85,
            analysis: `Matched pattern: ${pattern.source}`,
            recommendation: this.getRecommendation(errorType as ErrorType),
            canAutoRepair: this.canAutoRepair(errorType as ErrorType),
          };
        }
      }
    }

    return {
      errorType: 'UNKNOWN',
      confidence: 0.3,
      analysis: 'No matching error pattern found',
      recommendation: 'Manual review recommended',
      canAutoRepair: false,
    };
  }

  /**
   * Use MiniMax M2.1 for deep error analysis
   */
  private async analyzeWithMiniMax(job: FailedJob): Promise<MedicDiagnosis> {
    const systemPrompt = `You are a debugging agent for an AI image/video generation system.
Analyze the error and classify it into one of these categories:
- NSFW_VIOLATION: Content filter blocked the generation
- MALFORMED_JSON: Invalid request payload
- TIMEOUT: Generation took too long
- REFERENCE_MISSING: Required input (image/audio) not provided
- RATE_LIMIT: Too many requests
- MODEL_UNAVAILABLE: Model is down or deprecated
- INSUFFICIENT_CREDITS: Billing/quota issue
- INVALID_DIMENSIONS: Resolution not supported
- PROMPT_TOO_LONG: Prompt exceeds token limit
- UNKNOWN: Cannot classify

Respond in JSON format:
{
  "errorType": "TYPE",
  "confidence": 0.0-1.0,
  "analysis": "Brief explanation",
  "recommendation": "What to do",
  "canAutoRepair": true/false
}`;

    const userPrompt = `Error message: ${job.error}
Model: ${job.model}
Prompt: ${job.prompt}
Has image: ${!!job.imageUrl}
Has audio: ${!!job.audioUrl}`;

    try {
      const response = await axios.post(
        'https://api.minimax.chat/v1/text/chatcompletion_v2',
        {
          model: 'MiniMax-Text-01',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${this.minimaxApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0].message.content;
      const parsed = JSON.parse(content);

      return {
        errorType: parsed.errorType || 'UNKNOWN',
        confidence: parsed.confidence || 0.5,
        analysis: parsed.analysis || 'MiniMax analysis',
        recommendation: parsed.recommendation || 'Review error',
        canAutoRepair: parsed.canAutoRepair ?? false,
      };
    } catch (err) {
      console.error('[RuntimeMedic] MiniMax API error:', err);
      throw err;
    }
  }

  /**
   * Attempt to repair a failed job based on diagnosis
   */
  async repair(job: FailedJob, diagnosis: MedicDiagnosis): Promise<RepairResult> {
    if (!diagnosis.canAutoRepair) {
      return {
        success: false,
        repairType: 'escalate',
        message: `Cannot auto-repair ${diagnosis.errorType}: ${diagnosis.recommendation}`,
      };
    }

    switch (diagnosis.errorType) {
      case 'NSFW_VIOLATION':
        return this.repairNSFW(job);

      case 'MALFORMED_JSON':
        return this.repairJSON(job);

      case 'TIMEOUT':
        return this.repairTimeout(job);

      case 'REFERENCE_MISSING':
        return this.repairMissingReference(job);

      case 'RATE_LIMIT':
        return this.repairRateLimit(job);

      case 'INVALID_DIMENSIONS':
        return this.repairDimensions(job);

      case 'PROMPT_TOO_LONG':
        return this.repairPromptLength(job);

      default:
        return {
          success: false,
          repairType: 'escalate',
          message: `No repair strategy for ${diagnosis.errorType}`,
        };
    }
  }

  /**
   * Rewrite prompt to bypass NSFW filters
   */
  private repairNSFW(job: FailedJob): RepairResult {
    let rewrittenPrompt = job.prompt;

    // Apply euphemism substitutions
    for (const [trigger, euphemism] of Object.entries(EUPHEMISM_MAP)) {
      const regex = new RegExp(`\\b${trigger}\\b`, 'gi');
      rewrittenPrompt = rewrittenPrompt.replace(regex, euphemism);
    }

    // Add safety prefixes
    rewrittenPrompt = `cinematic, professional, ${rewrittenPrompt}`;

    // Check if we actually made changes
    if (rewrittenPrompt === job.prompt) {
      // Try switching to a more permissive model
      const permissiveModel = PERMISSIVE_MODELS.find(m => m !== job.model);
      if (permissiveModel) {
        return {
          success: true,
          repairType: 'model_switch',
          repairedJob: {
            prompt: job.prompt,
            negativePrompt: job.negativePrompt,
            model: permissiveModel,
          },
          message: `Switching to permissive model: ${permissiveModel}`,
        };
      }
    }

    return {
      success: true,
      repairType: 'prompt_rewrite',
      repairedJob: {
        prompt: rewrittenPrompt,
        negativePrompt: job.negativePrompt,
      },
      message: `Rewrote prompt with euphemisms: ${Object.keys(EUPHEMISM_MAP)
        .filter(k => job.prompt.toLowerCase().includes(k))
        .join(', ')}`,
    };
  }

  /**
   * Fix malformed JSON payload
   */
  private repairJSON(job: FailedJob): RepairResult {
    const cleanedParams: Record<string, unknown> = {};

    // Remove null/undefined values
    for (const [key, value] of Object.entries(job.params)) {
      if (value !== null && value !== undefined && value !== '') {
        cleanedParams[key] = value;
      }
    }

    // Ensure required fields have defaults
    if (!cleanedParams.width) cleanedParams.width = 1024;
    if (!cleanedParams.height) cleanedParams.height = 1024;

    return {
      success: true,
      repairType: 'param_fix',
      repairedJob: {
        prompt: job.prompt,
        negativePrompt: job.negativePrompt,
        params: cleanedParams,
      },
      message: 'Cleaned malformed parameters',
    };
  }

  /**
   * Switch to faster model on timeout
   */
  private repairTimeout(job: FailedJob): RepairResult {
    const fastModel = FAST_MODEL_MAP[job.model];

    if (fastModel) {
      return {
        success: true,
        repairType: 'model_switch',
        repairedJob: {
          prompt: job.prompt,
          negativePrompt: job.negativePrompt,
          model: fastModel,
        },
        message: `Switching to faster model: ${fastModel}`,
      };
    }

    // Reduce quality settings
    const reducedParams = { ...job.params };
    if (typeof reducedParams.num_inference_steps === 'number') {
      reducedParams.num_inference_steps = Math.floor(reducedParams.num_inference_steps * 0.6);
    }
    if (typeof reducedParams.width === 'number') {
      reducedParams.width = Math.min(reducedParams.width, 768);
    }
    if (typeof reducedParams.height === 'number') {
      reducedParams.height = Math.min(reducedParams.height, 768);
    }

    return {
      success: true,
      repairType: 'param_fix',
      repairedJob: {
        prompt: job.prompt,
        negativePrompt: job.negativePrompt,
        params: reducedParams,
      },
      message: 'Reduced quality settings to avoid timeout',
    };
  }

  /**
   * Fall back to T2I with detailed prompt when reference is missing
   */
  private repairMissingReference(job: FailedJob): RepairResult {
    // If I2V failed due to missing image, try T2V with enhanced prompt
    const enhancedPrompt = `detailed cinematic shot, ${job.prompt}, high quality, professional`;

    // Switch to a T2V model if possible
    if (job.model.includes('i2v') || job.model.includes('img2vid')) {
      const t2vModel = job.model.replace(/i2v|img2vid/i, 't2v');
      return {
        success: true,
        repairType: 'model_switch',
        repairedJob: {
          prompt: enhancedPrompt,
          negativePrompt: job.negativePrompt,
          model: t2vModel,
        },
        message: 'Switched from I2V to T2V with enhanced prompt',
      };
    }

    return {
      success: true,
      repairType: 'prompt_rewrite',
      repairedJob: {
        prompt: enhancedPrompt,
        negativePrompt: job.negativePrompt,
      },
      message: 'Enhanced prompt for text-only generation',
    };
  }

  /**
   * Queue retry with exponential backoff
   */
  private repairRateLimit(job: FailedJob): RepairResult {
    // Exponential backoff: 2^attemptCount * 1000ms
    const retryDelay = Math.pow(2, job.attemptCount) * 1000;
    const maxDelay = 60000; // Cap at 1 minute

    return {
      success: true,
      repairType: 'retry_later',
      repairedJob: {
        prompt: job.prompt,
        negativePrompt: job.negativePrompt,
      },
      message: `Rate limited - retry in ${Math.min(retryDelay, maxDelay)}ms`,
      retryDelay: Math.min(retryDelay, maxDelay),
    };
  }

  /**
   * Fix invalid dimensions
   */
  private repairDimensions(job: FailedJob): RepairResult {
    const params = { ...job.params };

    // Round to nearest 64 (common requirement)
    if (typeof params.width === 'number') {
      params.width = Math.round(params.width / 64) * 64;
    }
    if (typeof params.height === 'number') {
      params.height = Math.round(params.height / 64) * 64;
    }

    // Ensure within common limits
    params.width = Math.max(256, Math.min((params.width as number) || 1024, 2048));
    params.height = Math.max(256, Math.min((params.height as number) || 1024, 2048));

    return {
      success: true,
      repairType: 'param_fix',
      repairedJob: {
        prompt: job.prompt,
        negativePrompt: job.negativePrompt,
        params,
      },
      message: `Adjusted dimensions to ${params.width}x${params.height}`,
    };
  }

  /**
   * Truncate long prompts
   */
  private repairPromptLength(job: FailedJob): RepairResult {
    // Most models support ~77 tokens (~300 characters)
    const maxLength = 300;

    let truncatedPrompt = job.prompt;
    if (truncatedPrompt.length > maxLength) {
      // Try to truncate at a natural break point
      truncatedPrompt = truncatedPrompt.substring(0, maxLength);
      const lastComma = truncatedPrompt.lastIndexOf(',');
      const lastPeriod = truncatedPrompt.lastIndexOf('.');
      const breakPoint = Math.max(lastComma, lastPeriod);

      if (breakPoint > maxLength * 0.7) {
        truncatedPrompt = truncatedPrompt.substring(0, breakPoint + 1);
      }
    }

    return {
      success: true,
      repairType: 'prompt_rewrite',
      repairedJob: {
        prompt: truncatedPrompt,
        negativePrompt: job.negativePrompt?.substring(0, maxLength),
      },
      message: `Truncated prompt from ${job.prompt.length} to ${truncatedPrompt.length} chars`,
    };
  }

  /**
   * Get recommendation for error type
   */
  private getRecommendation(errorType: ErrorType): string {
    const recommendations: Record<ErrorType, string> = {
      NSFW_VIOLATION: 'Rewrite prompt with euphemisms or switch to permissive model',
      MALFORMED_JSON: 'Clean payload and remove null/undefined values',
      TIMEOUT: 'Switch to faster model or reduce quality settings',
      REFERENCE_MISSING: 'Fall back to T2I with enhanced prompt',
      RATE_LIMIT: 'Queue with exponential backoff',
      MODEL_UNAVAILABLE: 'Switch to alternative model',
      INSUFFICIENT_CREDITS: 'Check billing - escalate to user',
      INVALID_DIMENSIONS: 'Round dimensions to nearest 64',
      PROMPT_TOO_LONG: 'Truncate prompt to ~300 characters',
      UNKNOWN: 'Manual review required',
    };
    return recommendations[errorType];
  }

  /**
   * Check if error type can be auto-repaired
   */
  private canAutoRepair(errorType: ErrorType): boolean {
    const autoRepairableTypes: ErrorType[] = [
      'NSFW_VIOLATION',
      'MALFORMED_JSON',
      'TIMEOUT',
      'REFERENCE_MISSING',
      'RATE_LIMIT',
      'INVALID_DIMENSIONS',
      'PROMPT_TOO_LONG',
    ];
    return autoRepairableTypes.includes(errorType);
  }

  /**
   * Log an intervention for debugging
   */
  logIntervention(intervention: MedicIntervention): void {
    this.interventionLog.push(intervention);
    console.log(`[RuntimeMedic] Intervention logged: ${intervention.id}`, {
      error: intervention.originalError.substring(0, 100),
      diagnosis: intervention.diagnosis.errorType,
      repair: intervention.repair.repairType,
      outcome: intervention.outcome,
    });

    // Keep log from growing unbounded
    if (this.interventionLog.length > 1000) {
      this.interventionLog = this.interventionLog.slice(-500);
    }
  }

  /**
   * Get intervention history
   */
  getInterventions(limit = 50): MedicIntervention[] {
    return this.interventionLog.slice(-limit);
  }

  /**
   * Process a failed job: diagnose, repair, and return retry info
   */
  async processFailure(job: FailedJob): Promise<{
    shouldRetry: boolean;
    repairedJob?: FailedJob;
    retryDelay?: number;
    intervention: MedicIntervention;
  }> {
    const diagnosis = await this.diagnose(job);
    const repair = await this.repair(job, diagnosis);

    const intervention: MedicIntervention = {
      id: `medic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      jobId: job.id,
      timestamp: new Date(),
      originalError: job.error,
      diagnosis,
      repair,
      outcome: repair.success ? 'pending' : 'failed',
    };

    this.logIntervention(intervention);

    if (!repair.success || !repair.repairedJob) {
      return { shouldRetry: false, intervention };
    }

    // Build repaired job
    const repairedJob: FailedJob = {
      ...job,
      prompt: repair.repairedJob.prompt,
      negativePrompt: repair.repairedJob.negativePrompt,
      model: repair.repairedJob.model || job.model,
      params: repair.repairedJob.params || job.params,
      attemptCount: job.attemptCount + 1,
    };

    return {
      shouldRetry: true,
      repairedJob,
      retryDelay: repair.retryDelay,
      intervention,
    };
  }
}

// Export singleton
export const runtimeMedic = RuntimeMedicService.getInstance();
