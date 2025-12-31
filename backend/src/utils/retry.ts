/**
 * Retry Utility with Exponential Backoff
 *
 * Provides resilient API call handling with configurable retry logic.
 */

import { loggers, logCircuitBreaker } from './logger';

export interface RetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries?: number;
    /** Initial delay in ms before first retry (default: 1000) */
    initialDelayMs?: number;
    /** Maximum delay in ms (default: 30000) */
    maxDelayMs?: number;
    /** Backoff multiplier (default: 2) */
    backoffMultiplier?: number;
    /** Jitter factor 0-1 to add randomness (default: 0.1) */
    jitterFactor?: number;
    /** Custom function to determine if error is retryable */
    isRetryable?: (error: any) => boolean;
    /** Callback for each retry attempt */
    onRetry?: (error: any, attempt: number, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
    isRetryable: defaultIsRetryable,
    onRetry: () => {},
};

/**
 * Default logic to determine if an error is retryable
 */
function defaultIsRetryable(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        return true;
    }

    // HTTP status codes that are typically transient
    const status = error.status || error.statusCode || error.response?.status;
    if (status) {
        // 429 Too Many Requests, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout
        if ([429, 502, 503, 504].includes(status)) {
            return true;
        }
        // Don't retry client errors (4xx except 429) or other server errors
        return false;
    }

    // Axios-specific timeout
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return true;
    }

    // OpenAI/Fal.ai specific rate limit errors
    if (error.message?.includes('rate limit') || error.message?.includes('Rate limit')) {
        return true;
    }

    // Default: retry unknown errors (conservative)
    return true;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
    const exponentialDelay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);

    // Add jitter to prevent thundering herd
    const jitter = cappedDelay * options.jitterFactor * Math.random();
    return Math.floor(cappedDelay + jitter);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic and exponential backoff
 *
 * @example
 * const result = await withRetry(
 *     () => fetchFromAPI(url),
 *     { maxRetries: 3, onRetry: (err, attempt) => console.log(`Retry ${attempt}...`) }
 * );
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts: Required<RetryOptions> = { ...DEFAULT_OPTIONS, ...options };
    let lastError: any;

    for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Check if we've exhausted retries
            if (attempt > opts.maxRetries) {
                break;
            }

            // Check if error is retryable
            if (!opts.isRetryable(error)) {
                throw error;
            }

            // Calculate delay and wait
            const delayMs = calculateDelay(attempt, opts);
            opts.onRetry(error, attempt, delayMs);
            await sleep(delayMs);
        }
    }

    throw lastError;
}

/**
 * Decorator factory for adding retry logic to class methods
 *
 * @example
 * class APIClient {
 *     @Retry({ maxRetries: 3 })
 *     async fetchData() { ... }
 * }
 */
export function Retry(options: RetryOptions = {}) {
    return function (
        _target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            return withRetry(
                () => originalMethod.apply(this, args),
                {
                    ...options,
                    onRetry: (error, attempt, delayMs) => {
                        loggers.retry.warn({
                            method: propertyKey,
                            attempt,
                            delayMs,
                            error: error.message,
                        }, `Retry ${propertyKey} attempt ${attempt} after ${delayMs}ms`);
                        options.onRetry?.(error, attempt, delayMs);
                    },
                }
            );
        };

        return descriptor;
    };
}

/**
 * Circuit Breaker State
 */
type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerOptions {
    /** Number of failures before opening circuit (default: 5) */
    failureThreshold?: number;
    /** Time in ms to wait before trying again (default: 60000) */
    resetTimeoutMs?: number;
    /** Number of successful calls to close circuit from half-open (default: 2) */
    successThreshold?: number;
}

/**
 * Simple Circuit Breaker implementation
 * Prevents repeated calls to a failing service
 */
export class CircuitBreaker {
    private state: CircuitState = 'closed';
    private failures = 0;
    private successes = 0;
    private lastFailureTime = 0;
    private readonly options: Required<CircuitBreakerOptions>;

    constructor(
        private readonly name: string,
        options: CircuitBreakerOptions = {}
    ) {
        this.options = {
            failureThreshold: options.failureThreshold ?? 5,
            resetTimeoutMs: options.resetTimeoutMs ?? 60000,
            successThreshold: options.successThreshold ?? 2,
        };
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === 'open') {
            // Check if enough time has passed to try again
            if (Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs) {
                this.state = 'half-open';
                this.successes = 0;
                logCircuitBreaker(this.name, 'half-open');
            } else {
                throw new Error(`Circuit breaker ${this.name} is open. Service unavailable.`);
            }
        }

        try {
            const result = await fn();

            if (this.state === 'half-open') {
                this.successes++;
                if (this.successes >= this.options.successThreshold) {
                    this.state = 'closed';
                    this.failures = 0;
                    logCircuitBreaker(this.name, 'closed');
                }
            } else {
                // Reset failures on success in closed state
                this.failures = 0;
            }

            return result;
        } catch (error) {
            this.failures++;
            this.lastFailureTime = Date.now();

            if (this.state === 'half-open') {
                // Any failure in half-open goes back to open
                this.state = 'open';
                logCircuitBreaker(this.name, 'opened', this.failures);
            } else if (this.failures >= this.options.failureThreshold) {
                this.state = 'open';
                logCircuitBreaker(this.name, 'opened', this.failures);
            }

            throw error;
        }
    }

    getState(): CircuitState {
        return this.state;
    }

    reset(): void {
        this.state = 'closed';
        this.failures = 0;
        this.successes = 0;
    }
}

/**
 * Global circuit breakers for external services
 */
export const circuitBreakers = {
    falai: new CircuitBreaker('fal.ai', { failureThreshold: 5, resetTimeoutMs: 60000 }),
    replicate: new CircuitBreaker('replicate', { failureThreshold: 5, resetTimeoutMs: 60000 }),
    grok: new CircuitBreaker('grok', { failureThreshold: 3, resetTimeoutMs: 30000 }),
    openrouter: new CircuitBreaker('openrouter', { failureThreshold: 3, resetTimeoutMs: 30000 }),
};
