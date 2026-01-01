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

const router = Router({ mergeParams: true });

// --- Virtual Reshoot (InfCam) ---
// Re-renders video with a new camera trajectory while preserving subjects
router.post('/reshoot', vfxController.virtualReshoot);

// --- Focus Rescue (DiffCamera) ---
// AI-powered deblurring and sharpening for images and videos
router.post('/rescue-focus', vfxController.rescueFocus);

// --- Motion Fix ---
// Stabilization, speed changes, and frame interpolation
router.post('/motion-fix', vfxController.motionFix);

// --- Artifact Cleanup ---
// AI-powered removal of glitches, flicker, banding, and morph artifacts
router.post('/cleanup', vfxController.artifactCleanup);

// --- Job Management ---
// Get status of a specific VFX job
router.get('/jobs/:jobId', vfxController.getJobStatus);

// List all VFX jobs for a project
router.get('/jobs', vfxController.listJobs);

export default router;
