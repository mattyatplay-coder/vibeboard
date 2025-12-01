import { Router } from 'express';
import { GenerationService, ProviderType } from '../services/GenerationService';

const router = Router();

// GET /api/providers - List available providers with status
router.get('/', async (req, res) => {
    try {
        const service = new GenerationService();
        const providers = await service.getAvailableProviders();
        res.json(providers);
    } catch (error) {
        console.error("Error fetching providers:", error);
        res.status(500).json({ error: "Failed to fetch providers" });
    }
});

// GET /api/providers/estimate - Get cost estimate
router.get('/estimate', (req, res) => {
    try {
        const { provider, type, count } = req.query;

        if (!provider || !type) {
            return res.status(400).json({ error: "Missing provider or type" });
        }

        const service = new GenerationService();
        const cost = service.estimateCost(
            provider as ProviderType,
            type as 'image' | 'video',
            Number(count) || 1
        );
        res.json({ provider, type, count, estimatedCost: cost });
    } catch (error) {
        console.error("Error estimating cost:", error);
        res.status(500).json({ error: "Failed to estimate cost" });
    }
});

export default router;
