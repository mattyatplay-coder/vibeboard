/**
 * Authentication Routes - P0 Security
 *
 * Endpoints for:
 * - User registration (email/password)
 * - Login (email/password)
 * - Token refresh
 * - Logout (revoke tokens)
 * - Password reset (TODO)
 * - OAuth callbacks (Google, Apple - TODO)
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  withAuth,
  AuthenticatedRequest,
} from '../middleware/auth';
import { loggers } from '../utils/logger';

const log = loggers.api;
const router = Router();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// =============================================================================
// REGISTRATION
// =============================================================================

/**
 * Register a new user
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validation.error.issues,
      });
    }

    const { email, password, name } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered',
        code: 'EMAIL_EXISTS',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    log.info({ userId: user.id, email: user.email }, 'User registered');

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user.id);

    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    });
  } catch (error) {
    log.error({ error }, 'Registration failed');
    return res.status(500).json({
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR',
    });
  }
});

// =============================================================================
// LOGIN
// =============================================================================

/**
 * Login with email and password
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validation.error.issues,
      });
    }

    const { email, password } = validation.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!user || !user.passwordHash) {
      // Generic error to prevent user enumeration
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account disabled',
        code: 'ACCOUNT_DISABLED',
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    log.info({ userId: user.id, email: user.email }, 'User logged in');

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user.id);

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    });
  } catch (error) {
    log.error({ error }, 'Login failed');
    return res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR',
    });
  }
});

// =============================================================================
// TOKEN REFRESH
// =============================================================================

/**
 * Refresh access token using refresh token
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = refreshSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validation.error.issues,
      });
    }

    const { refreshToken } = validation.data;

    // Verify refresh token
    const user = await verifyRefreshToken(refreshToken);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    // Revoke old refresh token (rotation for security)
    await revokeRefreshToken(refreshToken);

    // Generate new tokens
    const accessToken = generateAccessToken(user);
    const newRefreshToken = await generateRefreshToken(user.id);

    return res.json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900, // 15 minutes in seconds
    });
  } catch (error) {
    log.error({ error }, 'Token refresh failed');
    return res.status(500).json({
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR',
    });
  }
});

// =============================================================================
// LOGOUT
// =============================================================================

/**
 * Logout - revoke current refresh token
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    log.error({ error }, 'Logout failed');
    return res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR',
    });
  }
});

/**
 * Logout everywhere - revoke all refresh tokens for user
 * POST /api/auth/logout-all
 */
router.post('/logout-all', withAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;

    await revokeAllUserTokens(user.id);

    log.info({ userId: user.id }, 'User logged out from all devices');

    return res.json({
      success: true,
      message: 'Logged out from all devices',
    });
  } catch (error) {
    log.error({ error }, 'Logout all failed');
    return res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ALL_ERROR',
    });
  }
});

// =============================================================================
// CURRENT USER
// =============================================================================

/**
 * Get current user info
 * GET /api/auth/me
 */
router.get('/me', withAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;

    // Fetch fresh user data
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        monthlyGenerations: true,
        monthlyGenerationsLimit: true,
        createdAt: true,
      },
    });

    if (!userData) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    return res.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    log.error({ error }, 'Get user failed');
    return res.status(500).json({
      error: 'Failed to get user',
      code: 'GET_USER_ERROR',
    });
  }
});

export default router;
