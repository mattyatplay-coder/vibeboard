/**
 * VFX Routes - Phase 5: Post-Production & VFX Suite
 *
 * Endpoints for the "Finishing and Repair" tools:
 * - Virtual Reshoot (InfCam): Re-render with new camera path
 * - Focus Rescue (DiffCamera): AI-powered deblurring
 * - Motion Fix: Stabilization and speed adjustments
 * - Artifact Cleanup: AI-powered glitch removal
 */

import { Router } from 'express';
import { vfxController } from '../controllers/vfxController';
import { withAuth, requireGenerationQuota } from '../middleware/auth';

const router = Router({ mergeParams: true });

// =============================================================================
// P0 SECURITY: All VFX routes require authentication
// AI-powered VFX operations use GPU/AI ($$) - requires quota
// =============================================================================

// --- Virtual Reshoot (InfCam) ---
// Re-renders video with a new camera trajectory while preserving subjects
// EXPENSIVE: GPU + AI rendering
router.post('/reshoot', withAuth, requireGenerationQuota, vfxController.virtualReshoot);

// --- Focus Rescue (DiffCamera) ---
// AI-powered deblurring and sharpening for images and videos
// EXPENSIVE: GPU + AI processing
router.post('/rescue-focus', withAuth, requireGenerationQuota, vfxController.rescueFocus);

// --- Motion Fix ---
// Stabilization, speed changes, and frame interpolation
// EXPENSIVE: GPU processing
router.post('/motion-fix', withAuth, requireGenerationQuota, vfxController.motionFix);

// --- Artifact Cleanup ---
// AI-powered removal of glitches, flicker, banding, and morph artifacts
// EXPENSIVE: GPU + AI processing
router.post('/cleanup', withAuth, requireGenerationQuota, vfxController.artifactCleanup);

// --- Job Management ---
// Get status of a specific VFX job (read-only, no quota)
router.get('/jobs/:jobId', withAuth, vfxController.getJobStatus);

// List all VFX jobs for a project (read-only, no quota)
router.get('/jobs', withAuth, vfxController.listJobs);

export default router;
