import { Router } from 'express';
import { GenerationService, ProviderType } from '../services/GenerationService';
import { frameExtractor } from '../services/FrameExtractor';

const router = Router();

// GET /api/providers - List available providers with status
router.get('/', async (req, res) => {
  try {
    const service = new GenerationService();
    const providers = await service.getAvailableProviders();
    res.json(providers);
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// GET /api/providers/estimate - Get cost estimate
router.get('/estimate', (req, res) => {
  try {
    const { provider, type, count } = req.query;

    if (!provider || !type) {
      return res.status(400).json({ error: 'Missing provider or type' });
    }

    const service = new GenerationService();
    const cost = service.estimateCost(
      provider as ProviderType,
      type as 'image' | 'video',
      Number(count) || 1
    );
    res.json({ provider, type, count, estimatedCost: cost });
  } catch (error) {
    console.error('Error estimating cost:', error);
    res.status(500).json({ error: 'Failed to estimate cost' });
  }
});

// POST /api/providers/extract-frame - Extract frame from video
// Used for storyboard continuity (grab last frame as start frame for next generation)
router.post('/extract-frame', async (req, res) => {
  try {
    const { videoUrl, position = 'last', timestamp } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Missing videoUrl' });
    }

    const validPositions = ['first', 'last', 'middle', 'timestamp'];
    if (!validPositions.includes(position)) {
      return res
        .status(400)
        .json({ error: `Invalid position. Must be one of: ${validPositions.join(', ')}` });
    }

    if (position === 'timestamp' && timestamp === undefined) {
      return res.status(400).json({ error: "Timestamp required when position is 'timestamp'" });
    }

    const frame = await frameExtractor.extractFrame({
      videoUrl,
      framePosition: position,
      timestamp: position === 'timestamp' ? Number(timestamp) : undefined,
    });

    res.json({
      success: true,
      frame,
    });
  } catch (error: any) {
    console.error('Error extracting frame:', error);
    res.status(500).json({ error: error.message || 'Failed to extract frame' });
  }
});

// POST /api/providers/extract-bookend-frames - Extract first and last frames
// Useful for comparing video start/end or for start/end keyframe workflows
router.post('/extract-bookend-frames', async (req, res) => {
  try {
    const { videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Missing videoUrl' });
    }

    const frames = await frameExtractor.extractBookendFrames(videoUrl);

    res.json({
      success: true,
      frames,
    });
  } catch (error: any) {
    console.error('Error extracting bookend frames:', error);
    res.status(500).json({ error: error.message || 'Failed to extract frames' });
  }
});

export default router;
