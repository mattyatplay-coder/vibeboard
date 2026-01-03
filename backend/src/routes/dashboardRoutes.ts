/**
 * Director's Dashboard API Routes
 *
 * Provides endpoints for analytics and insights:
 * - Style Drift: How visual style changes over time
 * - Asset Usage: LoRA, Element, Character tracking
 * - Generation Health: Success rates, errors, performance
 * - Cost Analytics: Spending breakdown
 */

import { Router, Request, Response } from 'express';
import { DirectorDashboardService } from '../services/analytics/DirectorDashboardService';

const router = Router();

/**
 * GET /api/projects/:projectId/dashboard/summary
 * Get full dashboard summary with all metrics
 */
router.get('/projects/:projectId/dashboard/summary', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { days } = req.query;

    const service = DirectorDashboardService.getInstance();
    const summary = await service.getDashboardSummary(projectId, parseInt(days as string) || 30);

    res.json(summary);
  } catch (error: any) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:projectId/dashboard/style-drift
 * Get style drift data over time
 */
router.get('/projects/:projectId/dashboard/style-drift', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { days } = req.query;

    const service = DirectorDashboardService.getInstance();
    const styleDrift = await service.getStyleDrift(projectId, parseInt(days as string) || 30);

    res.json({
      projectId,
      days: parseInt(days as string) || 30,
      dataPoints: styleDrift.length,
      styleDrift,
    });
  } catch (error: any) {
    console.error('Style drift error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:projectId/dashboard/asset-usage
 * Get asset usage statistics
 */
router.get('/projects/:projectId/dashboard/asset-usage', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { days, type } = req.query;

    const service = DirectorDashboardService.getInstance();
    let assetUsage = await service.getAssetUsage(projectId, parseInt(days as string) || 30);

    // Filter by asset type if specified
    if (type && ['lora', 'element', 'character'].includes(type as string)) {
      assetUsage = assetUsage.filter(a => a.assetType === type);
    }

    res.json({
      projectId,
      days: parseInt(days as string) || 30,
      totalAssets: assetUsage.length,
      assetUsage,
    });
  } catch (error: any) {
    console.error('Asset usage error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:projectId/dashboard/health
 * Get generation health metrics
 */
router.get('/projects/:projectId/dashboard/health', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { days } = req.query;

    const service = DirectorDashboardService.getInstance();
    const health = await service.getGenerationHealth(projectId, parseInt(days as string) || 30);

    res.json({
      projectId,
      days: parseInt(days as string) || 30,
      ...health,
    });
  } catch (error: any) {
    console.error('Health metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:projectId/dashboard/costs
 * Get cost breakdown by day
 */
router.get('/projects/:projectId/dashboard/costs', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { days } = req.query;

    const service = DirectorDashboardService.getInstance();
    const costByDay = await service.getCostByDay(projectId, parseInt(days as string) || 30);

    // Calculate totals
    const totalCost = costByDay.reduce((sum, day) => sum + day.cost, 0);
    const totalGenerations = costByDay.reduce((sum, day) => sum + day.count, 0);
    const avgCostPerGen = totalGenerations > 0 ? totalCost / totalGenerations : 0;

    res.json({
      projectId,
      days: parseInt(days as string) || 30,
      totalCost,
      totalGenerations,
      avgCostPerGeneration: avgCostPerGen,
      costByDay,
    });
  } catch (error: any) {
    console.error('Cost analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
