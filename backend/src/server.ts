import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import storyboardRoutes from './routes/storyboard.routes';
import trainingRoutes from './routes/trainingRoutes';
// providerRoutes is mounted within storyboardRoutes
import { errorHandler, rateLimit } from './middleware';

// Load environment variables
dotenv.config();

// =============================================================================
// EXPRESS APP SETUP
// =============================================================================

const app = express();
app.use((req, res, next) => {
  console.log(`[DEBUG] Incoming request: ${req.method} ${req.path}`);
  next();
});
const PORT = process.env.PORT || 3001;

// =============================================================================
// MIDDLEWARE
// =============================================================================

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow any localhost origin for development
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }

      // Check against specific allowed origins from env
      const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',');
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000');
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10000');
app.use(rateLimit(rateLimitWindow, rateLimitMax));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve uploaded files
import path from 'path';
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// =============================================================================
// ROUTES
// =============================================================================

// Health check (both with and without /api prefix)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'VibeBoard Storyboard API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    falConfigured: !!process.env.FAL_KEY,
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'VibeBoard Storyboard API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    falConfigured: !!process.env.FAL_KEY,
  });
});

// API routes
app.use('/api', storyboardRoutes);
app.use('/api/training', trainingRoutes);
// Note: providerRoutes is already mounted within storyboardRoutes at /api/providers

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

// =============================================================================
// SERVER START
// =============================================================================

const server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🎬 VibeBoard Storyboard Backend');
  console.log('='.repeat(60));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base URL: http://localhost:${PORT}/api`);
  console.log('='.repeat(60));
  console.log('📚 API Endpoints:');
  console.log('  Elements:');
  console.log('    POST   /api/elements');
  console.log('    GET    /api/elements');
  console.log('    GET    /api/elements/:elementId');
  console.log('    PATCH  /api/elements/:elementId');
  console.log('    DELETE /api/elements/:elementId');
  console.log('  Projects:');
  console.log('    POST   /api/projects');
  console.log('    GET    /api/projects');
  console.log('    GET    /api/projects/:projectId');
  console.log('    PATCH  /api/projects/:projectId');
  console.log('    DELETE /api/projects/:projectId');
  console.log('  Shots:');
  console.log('    POST   /api/shots');
  console.log('    GET    /api/shots/:shotId');
  console.log('    PATCH  /api/shots/:shotId');
  console.log('    DELETE /api/shots/:shotId');
  console.log('  Generation:');
  console.log('    POST   /api/shots/:shotId/generate');
  console.log('    GET    /api/shots/:shotId/status');
  console.log('  Training:');
  console.log('    POST   /api/training/jobs');
  console.log('    POST   /api/training/jobs/:id/start');
  console.log('    GET    /api/training/jobs');
  console.log('='.repeat(60));
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// UNHANDLED ERRORS
// =============================================================================

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

export default app;
