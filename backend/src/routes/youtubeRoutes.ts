/**
 * YouTube Routes - OAuth2 and Upload API endpoints
 */

import { Router, Request, Response } from 'express';
import {
  YouTubeUploadService,
  YOUTUBE_CATEGORIES,
} from '../services/delivery/YouTubeUploadService';
import { prisma } from '../prisma';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

const router = Router();
const youtubeService = YouTubeUploadService.getInstance();

// Multer config for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'youtube');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, MOV, AVI, and WebM are allowed.'));
    }
  },
});

// =============================================================================
// OAUTH2 ENDPOINTS
// =============================================================================

/**
 * GET /api/youtube/auth/init
 * Initialize OAuth2 with client credentials and get auth URL
 */
router.get('/auth/init', async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri =
      process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/api/youtube/callback';

    if (!clientId || !clientSecret) {
      res.status(400).json({
        success: false,
        error:
          'YouTube API credentials not configured. Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env',
      });
      return;
    }

    youtubeService.initializeOAuth({
      clientId,
      clientSecret,
      redirectUri,
    });

    const authUrl = youtubeService.getAuthUrl();

    res.json({
      success: true,
      authUrl,
      message: 'Redirect user to authUrl to authorize',
    });
  } catch (error) {
    console.error('[YouTube] Auth init error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize OAuth',
    });
  }
});

/**
 * GET /api/youtube/auth/callback
 * Handle OAuth2 callback with authorization code
 */
router.get('/auth/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, error } = req.query;

    if (error) {
      res.status(400).json({
        success: false,
        error: `OAuth error: ${error}`,
      });
      return;
    }

    if (!code || typeof code !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Authorization code is required',
      });
      return;
    }

    // Exchange code for tokens
    const tokens = await youtubeService.getTokensFromCode(code);

    // Set tokens
    youtubeService.setTokens(tokens);

    // Get channel info to verify
    const channelInfo = await youtubeService.getChannelInfo();

    // Store tokens in database (you might want to associate with user/project)
    await prisma.setting.upsert({
      where: { key: 'youtube_tokens' },
      update: { value: JSON.stringify(tokens) },
      create: { key: 'youtube_tokens', value: JSON.stringify(tokens) },
    });

    if (channelInfo) {
      await prisma.setting.upsert({
        where: { key: 'youtube_channel' },
        update: { value: JSON.stringify(channelInfo) },
        create: { key: 'youtube_channel', value: JSON.stringify(channelInfo) },
      });
    }

    // Redirect to frontend success page
    res.redirect('/settings?youtube=connected');
  } catch (error) {
    console.error('[YouTube] Callback error:', error);
    res.redirect('/settings?youtube=error');
  }
});

/**
 * GET /api/youtube/auth/status
 * Check if YouTube is connected
 */
router.get('/auth/status', async (req: Request, res: Response): Promise<void> => {
  try {
    // Try to load tokens from database
    const tokenSetting = await prisma.setting.findUnique({
      where: { key: 'youtube_tokens' },
    });

    const channelSetting = await prisma.setting.findUnique({
      where: { key: 'youtube_channel' },
    });

    if (!tokenSetting) {
      res.json({
        success: true,
        connected: false,
        message: 'YouTube not connected',
      });
      return;
    }

    // Reinitialize with stored tokens
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri =
      process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/api/youtube/callback';

    if (clientId && clientSecret) {
      youtubeService.initializeOAuth({ clientId, clientSecret, redirectUri });
      youtubeService.setTokens(JSON.parse(tokenSetting.value));
    }

    const channel = channelSetting ? JSON.parse(channelSetting.value) : null;

    res.json({
      success: true,
      connected: true,
      channel,
    });
  } catch (error) {
    console.error('[YouTube] Status check error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check status',
    });
  }
});

/**
 * POST /api/youtube/auth/disconnect
 * Disconnect YouTube account
 */
router.post('/auth/disconnect', async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.setting.deleteMany({
      where: {
        key: {
          in: ['youtube_tokens', 'youtube_channel'],
        },
      },
    });

    res.json({
      success: true,
      message: 'YouTube disconnected',
    });
  } catch (error) {
    console.error('[YouTube] Disconnect error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect',
    });
  }
});

// =============================================================================
// METADATA GENERATION
// =============================================================================

/**
 * POST /api/youtube/generate-metadata
 * Generate viral titles, description, and tags
 */
router.post('/generate-metadata', async (req: Request, res: Response): Promise<void> => {
  try {
    const { concept, archetype, hook, scriptSummary } = req.body;

    if (!concept || !archetype || !hook) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: concept, archetype, hook',
      });
      return;
    }

    const metadata = await youtubeService.generateMetadata(concept, archetype, hook, scriptSummary);

    res.json({
      success: true,
      metadata,
    });
  } catch (error) {
    console.error('[YouTube] Metadata generation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate metadata',
    });
  }
});

// =============================================================================
// UPLOAD ENDPOINTS
// =============================================================================

/**
 * GET /api/youtube/categories
 * Get available YouTube categories
 */
router.get('/categories', (req: Request, res: Response): void => {
  res.json({
    success: true,
    categories: Object.entries(YOUTUBE_CATEGORIES).map(([name, id]) => ({
      id,
      name,
    })),
  });
});

/**
 * POST /api/youtube/upload
 * Upload video to YouTube
 */
router.post(
  '/upload',
  upload.single('video'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!youtubeService.isAuthenticated()) {
        res.status(401).json({
          success: false,
          error: 'YouTube not connected. Please authenticate first.',
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No video file provided',
        });
        return;
      }

      const {
        title,
        description,
        tags,
        categoryId = '22', // People & Blogs default
        privacyStatus = 'private',
        madeForKids = 'false',
        thumbnailPath,
      } = req.body;

      if (!title) {
        res.status(400).json({
          success: false,
          error: 'Title is required',
        });
        return;
      }

      const result = await youtubeService.uploadVideo(
        req.file.path,
        {
          title,
          description: description || '',
          tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
          categoryId,
          privacyStatus: privacyStatus as 'private' | 'unlisted' | 'public',
          madeForKids: madeForKids === 'true',
        },
        thumbnailPath
      );

      // Clean up uploaded file
      fs.unlink(req.file.path, () => {});

      if (result.success) {
        res.json({
          success: true,
          videoId: result.videoId,
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('[YouTube] Upload error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }
);

/**
 * POST /api/youtube/upload-from-path
 * Upload an already-existing video file to YouTube (e.g., exported video)
 */
router.post('/upload-from-path', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!youtubeService.isAuthenticated()) {
      res.status(401).json({
        success: false,
        error: 'YouTube not connected. Please authenticate first.',
      });
      return;
    }

    const {
      videoPath,
      title,
      description,
      tags,
      categoryId = '22',
      privacyStatus = 'private',
      madeForKids = false,
      thumbnailPath,
    } = req.body;

    if (!videoPath || !title) {
      res.status(400).json({
        success: false,
        error: 'videoPath and title are required',
      });
      return;
    }

    // Resolve path (could be relative or absolute)
    const resolvedPath = path.isAbsolute(videoPath)
      ? videoPath
      : path.join(process.cwd(), videoPath);

    if (!fs.existsSync(resolvedPath)) {
      res.status(404).json({
        success: false,
        error: `Video file not found: ${videoPath}`,
      });
      return;
    }

    const result = await youtubeService.uploadVideo(
      resolvedPath,
      {
        title,
        description: description || '',
        tags: tags || [],
        categoryId,
        privacyStatus,
        madeForKids,
      },
      thumbnailPath
    );

    if (result.success) {
      res.json({
        success: true,
        videoId: result.videoId,
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[YouTube] Upload from path error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    });
  }
});

// =============================================================================
// VIDEO MANAGEMENT
// =============================================================================

/**
 * GET /api/youtube/videos
 * Get list of uploaded videos
 */
router.get('/videos', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!youtubeService.isAuthenticated()) {
      res.status(401).json({
        success: false,
        error: 'YouTube not connected',
      });
      return;
    }

    const maxResults = parseInt(req.query.maxResults as string) || 10;
    const videos = await youtubeService.getUploadedVideos(maxResults);

    res.json({
      success: true,
      videos: videos.map(v => ({
        id: v.id,
        title: v.snippet?.title,
        description: v.snippet?.description,
        thumbnailUrl: v.snippet?.thumbnails?.medium?.url,
        publishedAt: v.snippet?.publishedAt,
        privacyStatus: v.status?.privacyStatus,
        viewCount: v.statistics?.viewCount,
        likeCount: v.statistics?.likeCount,
      })),
    });
  } catch (error) {
    console.error('[YouTube] Get videos error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get videos',
    });
  }
});

/**
 * PATCH /api/youtube/videos/:videoId
 * Update video metadata
 */
router.patch('/videos/:videoId', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!youtubeService.isAuthenticated()) {
      res.status(401).json({
        success: false,
        error: 'YouTube not connected',
      });
      return;
    }

    const { videoId } = req.params;
    const updates = req.body;

    const success = await youtubeService.updateVideoMetadata(videoId, updates);

    if (success) {
      res.json({
        success: true,
        message: 'Video updated',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update video',
      });
    }
  } catch (error) {
    console.error('[YouTube] Update video error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update video',
    });
  }
});

/**
 * DELETE /api/youtube/videos/:videoId
 * Delete a video
 */
router.delete('/videos/:videoId', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!youtubeService.isAuthenticated()) {
      res.status(401).json({
        success: false,
        error: 'YouTube not connected',
      });
      return;
    }

    const { videoId } = req.params;
    const success = await youtubeService.deleteVideo(videoId);

    if (success) {
      res.json({
        success: true,
        message: 'Video deleted',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete video',
      });
    }
  } catch (error) {
    console.error('[YouTube] Delete video error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete video',
    });
  }
});

export default router;
