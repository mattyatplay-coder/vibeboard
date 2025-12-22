import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { StoryboardError, ErrorCode, AuthUser } from '../types/storyboard.types';

// =============================================================================
// REQUEST TYPE EXTENSIONS
// =============================================================================

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// =============================================================================
// AUTHENTICATION MIDDLEWARE (JWT)
// =============================================================================

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // TODO: Implement JWT authentication
    // For now, use mock user for testing

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new StoryboardError(
        ErrorCode.UNAUTHORIZED,
        'Missing or invalid authorization header',
        401
      );
    }

    const token = authHeader.substring(7);

    // MOCK: In production, verify JWT token here
    // const decoded = jwt.verify(token, process.env.JWT_SECRET!);

    // For development, use a mock user
    req.user = {
      id: 'user_default',
      email: 'user@example.com',
      name: 'Test User',
    };

    next();
  } catch (error) {
    if (error instanceof StoryboardError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    } else {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Authentication failed',
        },
      });
    }
  }
};

// =============================================================================
// OPTIONAL AUTHENTICATION (for public endpoints)
// =============================================================================

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // MOCK: In production, verify JWT token here
      req.user = {
        id: 'mock-user-id',
        email: 'user@example.com',
        name: 'Test User',
      };
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// =============================================================================
// REQUEST VALIDATION MIDDLEWARE
// =============================================================================

export const validateRequest = (schema: { body?: any; query?: any; params?: any }) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate body
      if (schema.body) {
        validateObject(req.body, schema.body, 'body');
      }

      // Validate query
      if (schema.query) {
        validateObject(req.query, schema.query, 'query');
      }

      // Validate params
      if (schema.params) {
        validateObject(req.params, schema.params, 'params');
      }

      next();
    } catch (error) {
      if (error instanceof StoryboardError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Validation failed',
          },
        });
      }
    }
  };
};

const validateObject = (obj: any, schema: any, location: string): void => {
  for (const [key, rules] of Object.entries(schema)) {
    const value = obj[key];
    const fieldRules = rules as any;

    // Check required
    if (fieldRules.required && (value === undefined || value === null)) {
      throw new StoryboardError(
        ErrorCode.MISSING_REQUIRED_FIELD,
        `${location}.${key} is required`,
        400
      );
    }

    // Skip validation if not required and value is missing
    if (!fieldRules.required && (value === undefined || value === null)) {
      continue;
    }

    // Check type
    if (fieldRules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== fieldRules.type) {
        throw new StoryboardError(
          ErrorCode.INVALID_INPUT,
          `${location}.${key} must be of type ${fieldRules.type}`,
          400
        );
      }
    }

    // Check enum
    if (fieldRules.enum && !fieldRules.enum.includes(value)) {
      throw new StoryboardError(
        ErrorCode.INVALID_INPUT,
        `${location}.${key} must be one of: ${fieldRules.enum.join(', ')}`,
        400
      );
    }

    // Check min/max for numbers
    if (typeof value === 'number') {
      if (fieldRules.min !== undefined && value < fieldRules.min) {
        throw new StoryboardError(
          ErrorCode.INVALID_INPUT,
          `${location}.${key} must be at least ${fieldRules.min}`,
          400
        );
      }
      if (fieldRules.max !== undefined && value > fieldRules.max) {
        throw new StoryboardError(
          ErrorCode.INVALID_INPUT,
          `${location}.${key} must be at most ${fieldRules.max}`,
          400
        );
      }
    }

    // Check minLength/maxLength for strings
    if (typeof value === 'string') {
      if (fieldRules.minLength !== undefined && value.length < fieldRules.minLength) {
        throw new StoryboardError(
          ErrorCode.INVALID_INPUT,
          `${location}.${key} must be at least ${fieldRules.minLength} characters`,
          400
        );
      }
      if (fieldRules.maxLength !== undefined && value.length > fieldRules.maxLength) {
        throw new StoryboardError(
          ErrorCode.INVALID_INPUT,
          `${location}.${key} must be at most ${fieldRules.maxLength} characters`,
          400
        );
      }
    }

    // Check array items
    if (Array.isArray(value) && fieldRules.items) {
      value.forEach((item, index) => {
        validateObject({ item }, { item: fieldRules.items }, `${location}.${key}[${index}]`);
      });
    }
  }
};

// =============================================================================
// FILE UPLOAD MIDDLEWARE
// =============================================================================

// Multer configuration for memory storage
const storage = multer.memoryStorage();

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`));
  }
};

export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB for videos
  },
}).single('file');

export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB for videos
    files: 4, // Max 4 views per element
  },
}).array('images', 4);

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('Error:', err);

  if (err instanceof StoryboardError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  } else if (err instanceof multer.MulterError) {
    res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.UPLOAD_FAILED,
        message: err.message,
      },
    });
  } else {
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Internal server error',
      },
    });
  }
};

// =============================================================================
// RATE LIMITING (Simple in-memory implementation)
// =============================================================================

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export const rateLimit = (
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  max: number = 100
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      record = {
        count: 0,
        resetAt: now + windowMs,
      };
      rateLimitStore.set(key, record);
    }

    record.count++;

    if (record.count > max) {
      res.status(429).json({
        success: false,
        error: {
          code: ErrorCode.SERVICE_UNAVAILABLE,
          message: 'Too many requests, please try again later',
        },
      });
      return;
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(record.resetAt).toISOString());

    next();
  };
};

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Every minute
