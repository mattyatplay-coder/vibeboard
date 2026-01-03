/**
 * Structured Logging Utility
 *
 * Provides consistent, structured logging across the application.
 * Uses pino for high-performance JSON logging in production.
 */

import pino from 'pino';

// Determine environment
const isDevelopment = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

// Create base logger configuration
const baseConfig: pino.LoggerOptions = {
  level: logLevel,
  // Add standard metadata to every log
  base: {
    pid: process.pid,
    service: 'vibeboard-backend',
    version: process.env.npm_package_version || '1.0.0',
  },
  // Redact sensitive fields
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'apiKey',
      'token',
      'secret',
      '*.password',
      '*.apiKey',
      '*.token',
      '*.secret',
      'FAL_KEY',
      'GROK_API_KEY',
      'OPENROUTER_API_KEY',
      'REPLICATE_API_TOKEN',
    ],
    censor: '[REDACTED]',
  },
  // Custom timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,
};

// In development, use pino-pretty for readable output
const developmentConfig: pino.LoggerOptions = {
  ...baseConfig,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname,service,version',
      messageFormat: '{msg}',
    },
  },
};

// Create the main logger
const logger = pino(isDevelopment ? developmentConfig : baseConfig);

/**
 * Create a child logger with additional context
 * Useful for adding request IDs, user IDs, or module names
 */
export function createLogger(context: Record<string, unknown>): pino.Logger {
  return logger.child(context);
}

/**
 * Module-specific loggers for consistent naming
 */
export const loggers = {
  // Core services
  generation: createLogger({ module: 'generation' }),
  training: createLogger({ module: 'training' }),
  llm: createLogger({ module: 'llm' }),

  // AI Providers
  falai: createLogger({ module: 'fal.ai' }),
  replicate: createLogger({ module: 'replicate' }),
  grok: createLogger({ module: 'grok' }),
  openrouter: createLogger({ module: 'openrouter' }),

  // Infrastructure
  database: createLogger({ module: 'database' }),
  api: createLogger({ module: 'api' }),
  auth: createLogger({ module: 'auth' }),
  export: createLogger({ module: 'export' }),

  // Features
  search: createLogger({ module: 'search' }),
  tracking: createLogger({ module: 'tracking' }),
  lighting: createLogger({ module: 'lighting' }),
  story: createLogger({ module: 'story' }),

  // Utilities
  retry: createLogger({ module: 'retry' }),
  circuitBreaker: createLogger({ module: 'circuit-breaker' }),
};

/**
 * Express request logging middleware
 */
export function requestLogger() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || generateRequestId();

    // Add request ID to request object for use in handlers
    req.requestId = requestId;

    // Create request-scoped logger
    req.log = createLogger({ requestId });

    // Log request
    req.log.info(
      {
        type: 'request',
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
      },
      `→ ${req.method} ${req.url}`
    );

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

      req.log[level](
        {
          type: 'response',
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
        },
        `← ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`
      );
    });

    next();
  };
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log performance metrics
 */
export function logPerformance(
  operation: string,
  startTime: number,
  metadata?: Record<string, unknown>
): void {
  const duration = Date.now() - startTime;
  const level = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug';

  logger[level](
    {
      type: 'performance',
      operation,
      duration,
      ...metadata,
    },
    `${operation} completed in ${duration}ms`
  );
}

/**
 * Log API call to external service
 */
export function logApiCall(
  service: string,
  operation: string,
  success: boolean,
  duration: number,
  metadata?: Record<string, unknown>
): void {
  const serviceLogger = loggers[service as keyof typeof loggers] || logger;
  const level = success ? 'info' : 'error';

  serviceLogger[level](
    {
      type: 'api_call',
      service,
      operation,
      success,
      duration,
      ...metadata,
    },
    `${service}: ${operation} ${success ? 'succeeded' : 'failed'} (${duration}ms)`
  );
}

/**
 * Log generation events
 */
export function logGeneration(
  event: 'started' | 'completed' | 'failed',
  generationId: string,
  metadata?: Record<string, unknown>
): void {
  const level = event === 'failed' ? 'error' : 'info';

  loggers.generation[level](
    {
      type: 'generation',
      event,
      generationId,
      ...metadata,
    },
    `Generation ${generationId} ${event}`
  );
}

/**
 * Log training events
 */
export function logTraining(
  event: 'started' | 'progress' | 'completed' | 'failed',
  jobId: string,
  metadata?: Record<string, unknown>
): void {
  const level = event === 'failed' ? 'error' : 'info';

  loggers.training[level](
    {
      type: 'training',
      event,
      jobId,
      ...metadata,
    },
    `Training ${jobId} ${event}`
  );
}

/**
 * Log circuit breaker state changes
 */
export function logCircuitBreaker(
  service: string,
  event: 'opened' | 'closed' | 'half-open',
  failures?: number
): void {
  const level = event === 'opened' ? 'warn' : 'info';

  loggers.circuitBreaker[level](
    {
      type: 'circuit_breaker',
      service,
      event,
      failures,
    },
    `Circuit breaker for ${service}: ${event}`
  );
}

// Export the base logger as default
export default logger;

// Also export pino types for consumers
export type { Logger } from 'pino';
