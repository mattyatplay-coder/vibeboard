/**
 * Authentication Middleware - P0 Security
 *
 * Provides JWT-based authentication with:
 * - Token verification and user identity extraction
 * - Fail-closed behavior (no token = no access)
 * - Refresh token support for long-lived sessions
 * - Rate limiting integration
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { loggers } from '../utils/logger';

const log = loggers.api;

// Extend Express Request to include authenticated user
export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  monthlyGenerations: number;
  monthlyGenerationsLimit: number;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION';
const JWT_EXPIRES_IN = '15m'; // Short-lived access tokens
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// Warn if using default secret in production
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'CHANGE_THIS_IN_PRODUCTION') {
  log.fatal('JWT_SECRET must be set in production environment!');
  process.exit(1);
}

/**
 * Verify JWT and attach user to request
 * FAIL CLOSED: No valid token = 401
 */
export const withAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'NO_TOKEN',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED',
        });
        return;
      }
      res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    // Fetch user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub as string },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        monthlyGenerations: true,
        monthlyGenerationsLimit: true,
      },
    });

    if (!user) {
      res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        error: 'Account disabled',
        code: 'ACCOUNT_DISABLED',
      });
      return;
    }

    // Attach user to request
    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role,
      monthlyGenerations: user.monthlyGenerations,
      monthlyGenerationsLimit: user.monthlyGenerationsLimit,
    };

    next();
  } catch (error) {
    log.error({ error }, 'Auth middleware error');
    res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Optional auth - attaches user if token present, but doesn't require it
 * Useful for endpoints that behave differently for logged-in users
 */
export const withOptionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token, continue without user
    next();
    return;
  }

  // Token present, try to verify
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub as string },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        monthlyGenerations: true,
        monthlyGenerationsLimit: true,
      },
    });

    if (user && user.isActive) {
      (req as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role,
        monthlyGenerations: user.monthlyGenerations,
        monthlyGenerationsLimit: user.monthlyGenerationsLimit,
      };
    }
  } catch {
    // Invalid token, continue without user
  }

  next();
};

/**
 * Require specific role(s)
 * Must be used AFTER withAuth
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'NO_USER',
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        requiredRoles: allowedRoles,
      });
      return;
    }

    next();
  };
};

/**
 * Check if user has remaining generation quota
 * Must be used AFTER withAuth
 */
export const requireGenerationQuota = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'NO_USER',
    });
    return;
  }

  if (user.monthlyGenerations >= user.monthlyGenerationsLimit) {
    res.status(429).json({
      error: 'Monthly generation limit reached',
      code: 'QUOTA_EXCEEDED',
      used: user.monthlyGenerations,
      limit: user.monthlyGenerationsLimit,
    });
    return;
  }

  next();
};

// =============================================================================
// TOKEN GENERATION
// =============================================================================

interface TokenPayload {
  sub: string; // User ID
  email: string;
  role: string;
}

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(user: { id: string; email: string; role: string }): string {
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Generate refresh token and store in database
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  // Generate random token
  const crypto = await import('crypto');
  const token = crypto.randomBytes(64).toString('hex');

  // Store in database
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN);
  await prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  // Clean up old expired tokens for this user
  await prisma.refreshToken.deleteMany({
    where: {
      userId,
      expiresAt: { lt: new Date() },
    },
  });

  return token;
}

/**
 * Verify refresh token and return user
 */
export async function verifyRefreshToken(token: string): Promise<AuthenticatedUser | null> {
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token },
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    // Token not found or expired
    if (storedToken) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    }
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: storedToken.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      monthlyGenerations: true,
      monthlyGenerationsLimit: true,
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name || undefined,
    role: user.role,
    monthlyGenerations: user.monthlyGenerations,
    monthlyGenerationsLimit: user.monthlyGenerationsLimit,
  };
}

/**
 * Revoke a specific refresh token
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { token },
  });
}

/**
 * Revoke all refresh tokens for a user (logout everywhere)
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });
}

// =============================================================================
// PROJECT OWNERSHIP VERIFICATION
// =============================================================================

/**
 * Verify user owns the project specified in params
 * Must be used AFTER withAuth on routes with :projectId param
 */
export const verifyProjectOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = (req as AuthenticatedRequest).user;
  const { projectId } = req.params;

  if (!user) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'NO_USER',
    });
    return;
  }

  if (!projectId) {
    res.status(400).json({
      error: 'Project ID required',
      code: 'MISSING_PROJECT_ID',
    });
    return;
  }

  try {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
      select: { id: true },
    });

    if (!project) {
      // Return 404 to avoid leaking existence of other users' projects
      res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND',
      });
      return;
    }

    next();
  } catch (error) {
    log.error({ error, projectId, userId: user.id }, 'Project ownership check failed');
    res.status(500).json({
      error: 'Failed to verify project access',
      code: 'OWNERSHIP_CHECK_ERROR',
    });
  }
};

// =============================================================================
// DEVELOPMENT MODE HELPERS
// =============================================================================

/**
 * Development-only mock auth for local testing
 * NEVER use in production!
 */
export const withDevAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      error: 'Development auth not allowed in production',
      code: 'DEV_AUTH_IN_PROD',
    });
    return;
  }

  // Mock user for development
  (req as AuthenticatedRequest).user = {
    id: 'dev_user_001',
    email: 'dev@vibeboard.studio',
    name: 'Development User',
    role: 'admin', // Full access for dev
    monthlyGenerations: 0,
    monthlyGenerationsLimit: 999999,
  };

  next();
};
