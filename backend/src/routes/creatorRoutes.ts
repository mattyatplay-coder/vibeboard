/**
 * Creator Routes - API endpoints for content creator script generation
 */

import { Router, Request, Response } from 'express';
import { CreatorScriptService, ContentScriptRequest } from '../services/story/CreatorScriptService';
import { ThumbnailGeneratorService, ThumbnailRequest } from '../services/content/ThumbnailGeneratorService';

const router = Router();
const scriptService = CreatorScriptService.getInstance();
const thumbnailService = ThumbnailGeneratorService.getInstance();

/**
 * POST /api/creator/generate-script
 * Generate a content creator script based on archetype and hook
 */
router.post('/generate-script', async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            genre,
            archetype,
            archetypeData,
            hook,
            concept,
            platform,
            duration,
            isAdult,
        } = req.body as ContentScriptRequest;

        // Validate required fields
        if (!genre || !archetype || !archetypeData || !concept) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: genre, archetype, archetypeData, concept',
            });
            return;
        }

        // Validate genre
        if (genre !== 'youtuber' && genre !== 'onlyfans') {
            res.status(400).json({
                success: false,
                error: 'Invalid genre. Must be "youtuber" or "onlyfans"',
            });
            return;
        }

        // Generate script
        const script = await scriptService.generateContentScript({
            genre,
            archetype,
            archetypeData,
            hook: hook || '',
            concept,
            platform,
            duration,
            isAdult: isAdult || genre === 'onlyfans',
        });

        res.json({
            success: true,
            script,
        });
    } catch (error) {
        console.error('Error generating creator script:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate script',
        });
    }
});

/**
 * POST /api/creator/generate-shot-list
 * Generate a shot list from an existing script
 */
router.post('/generate-shot-list', async (req: Request, res: Response): Promise<void> => {
    try {
        const { script } = req.body;

        if (!script) {
            res.status(400).json({
                success: false,
                error: 'Missing required field: script',
            });
            return;
        }

        const shotList = scriptService.generateShotList(script);

        res.json({
            success: true,
            shotList,
        });
    } catch (error) {
        console.error('Error generating shot list:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate shot list',
        });
    }
});

/**
 * POST /api/creator/generate-visual-prompts
 * Generate AI visual prompts from a script
 */
router.post('/generate-visual-prompts', async (req: Request, res: Response): Promise<void> => {
    try {
        const { script } = req.body;

        if (!script) {
            res.status(400).json({
                success: false,
                error: 'Missing required field: script',
            });
            return;
        }

        const prompts = await scriptService.generateVisualPrompts(script);

        res.json({
            success: true,
            prompts,
        });
    } catch (error) {
        console.error('Error generating visual prompts:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate visual prompts',
        });
    }
});

/**
 * GET /api/creator/archetypes/:genre
 * Get available archetypes for a genre
 */
router.get('/archetypes/:genre', async (req: Request, res: Response): Promise<void> => {
    try {
        const { genre } = req.params;

        // These match the frontend CreatorArchetypes.ts data
        const YOUTUBE_ARCHETYPES = {
            vlogger: {
                label: 'Vlogger / Lifestyle',
                description: 'High energy, handheld, jump cuts, storytelling.',
                styleHint: 'Wide angle 16mm, handheld shake, fast pacing, direct address to camera, jump cuts every 3-5 seconds.',
                recommendedLens: '16mm',
                lightingPreset: 'ring_light',
                audioPreset: 'broadcaster',
            },
            tech_reviewer: {
                label: 'Tech / Product',
                description: 'Crisp 8K studio, slow pans, clean audio, depth of field.',
                styleHint: '50mm Macro, softbox lighting, clean audio, slow pans, product B-roll with shallow depth of field.',
                recommendedLens: '50mm Macro',
                lightingPreset: 'tech_studio',
                audioPreset: 'studio_clean',
            },
            video_essay: {
                label: 'Video Essay',
                description: 'Archival footage, motion graphics, voiceover-led.',
                styleHint: 'Mixed media, archival scale, motion graphics overlays, Ken Burns effect on stills, voiceover-driven narrative.',
                recommendedLens: '35mm',
                lightingPreset: 'soft_neutral',
                audioPreset: 'voiceover',
            },
            gamer: {
                label: 'Gamer / Streamer',
                description: 'Face-cam overlay, high saturation, reaction shots.',
                styleHint: 'Webcam angle, RGB lighting, green screen background, high contrast, reaction cuts, picture-in-picture gameplay.',
                recommendedLens: '24mm',
                lightingPreset: 'rgb_streamer',
                audioPreset: 'gaming_mic',
            },
            shorts: {
                label: 'Shorts / TikTok',
                description: '9:16 vertical, fast cuts, text overlays, hooks in 1 second.',
                styleHint: 'Vertical framing 9:16, ultra-fast pacing, text overlays, hook in first second, trending audio sync.',
                recommendedLens: '24mm',
                lightingPreset: 'ring_light',
                audioPreset: 'punchy',
            },
            tutorial: {
                label: 'Tutorial / How-To',
                description: 'Screen recording mixed with face cam, step-by-step pacing.',
                styleHint: 'Clean framing, screen recording with face-cam corner, numbered steps, clear audio, zoom-ins on important elements.',
                recommendedLens: '35mm',
                lightingPreset: 'soft_key',
                audioPreset: 'studio_clean',
            },
            podcast: {
                label: 'Podcast / Interview',
                description: 'Multi-cam setup, conversation-driven, minimal movement.',
                styleHint: 'Multi-camera setup, two-shot and singles, minimal movement, focus on speakers, over-the-shoulder cutaways.',
                recommendedLens: '85mm',
                lightingPreset: 'three_point',
                audioPreset: 'broadcast',
            },
            custom: {
                label: 'Custom Persona',
                description: 'Define a specific style or paste a transcript to analyze.',
                styleHint: 'Custom - user-defined style will be injected here.',
                recommendedLens: '35mm',
                lightingPreset: 'natural',
                audioPreset: 'balanced',
            },
        };

        const ADULT_ARCHETYPES = {
            gfe: {
                label: 'GFE / Vlog',
                description: 'POV, handheld, intimate connection, direct address.',
                styleHint: '24mm wide angle, eye-level framing, ring light with warm color temp 3200K, handheld intimacy, direct eye contact.',
                recommendedLens: '24mm',
                lightingPreset: 'ring_light_warm',
                audioPreset: 'intimate',
            },
            cosplay: {
                label: 'Cosplay / Teaser',
                description: 'High production value, costume focus, slow motion reveals.',
                styleHint: '50mm portrait lens, RGB rim lighting, slow pan reveals, high contrast, costume detail shots, dramatic poses.',
                recommendedLens: '50mm',
                lightingPreset: 'rgb_rim',
                audioPreset: 'cinematic',
            },
            boudoir: {
                label: 'Boudoir / Artistic',
                description: 'Soft lighting, elegant poses, film-like color grade.',
                styleHint: '85mm portrait lens, large softbox key, film grain overlay, muted color palette, elegant poses, negative space.',
                recommendedLens: '85mm',
                lightingPreset: 'beauty_soft',
                audioPreset: 'ambient',
            },
            b_roll: {
                label: 'Aesthetic / B-Roll',
                description: 'Atmospheric, music-driven, montage style.',
                styleHint: 'Macro lens, shallow depth of field, soft focus, dream-like quality, slow motion, music-synced cuts.',
                recommendedLens: 'Macro',
                lightingPreset: 'natural_soft',
                audioPreset: 'music_bed',
            },
            pov: {
                label: 'POV Experience',
                description: 'First-person perspective, immersive framing.',
                styleHint: 'Wide angle 16mm, first-person POV, handheld movement, subjective camera, direct interaction with lens.',
                recommendedLens: '16mm',
                lightingPreset: 'practical',
                audioPreset: 'close_mic',
            },
            custom: {
                label: 'Custom Persona',
                description: 'Upload a specific creator\'s voice/style guide.',
                styleHint: 'Custom - user-defined style will be injected here.',
                recommendedLens: '35mm',
                lightingPreset: 'natural',
                audioPreset: 'balanced',
            },
        };

        if (genre === 'youtuber') {
            res.json({ success: true, archetypes: YOUTUBE_ARCHETYPES });
        } else if (genre === 'onlyfans') {
            res.json({ success: true, archetypes: ADULT_ARCHETYPES });
        } else {
            res.status(400).json({
                success: false,
                error: 'Invalid genre. Must be "youtuber" or "onlyfans"',
            });
        }
    } catch (error) {
        console.error('Error fetching archetypes:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch archetypes',
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// THUMBNAIL GENERATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/creator/generate-thumbnail
 * Generate a YouTube-optimized thumbnail
 */
router.post('/generate-thumbnail', async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            projectId,
            videoTitle,
            videoDescription,
            archetype,
            genre,
            referenceImageUrl,
            generateVariants,
            variantCount,
            customStyle,
        } = req.body as ThumbnailRequest;

        // Validate required fields
        if (!projectId || !videoTitle || !archetype || !genre) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, videoTitle, archetype, genre',
            });
            return;
        }

        // Validate genre
        if (genre !== 'youtuber' && genre !== 'onlyfans') {
            res.status(400).json({
                success: false,
                error: 'Invalid genre. Must be "youtuber" or "onlyfans"',
            });
            return;
        }

        // Generate thumbnail
        const result = await thumbnailService.generateThumbnail({
            projectId,
            videoTitle,
            videoDescription: videoDescription || '',
            archetype: archetype as ThumbnailRequest['archetype'],
            genre,
            referenceImageUrl,
            generateVariants,
            variantCount,
            customStyle,
        });

        res.json({
            success: true,
            thumbnail: result,
        });
    } catch (error) {
        console.error('Error generating thumbnail:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate thumbnail',
        });
    }
});

/**
 * GET /api/creator/thumbnail-styles/:genre
 * Get available thumbnail styles for a genre
 */
router.get('/thumbnail-styles/:genre', async (req: Request, res: Response): Promise<void> => {
    try {
        const { genre } = req.params;

        if (genre !== 'youtuber' && genre !== 'onlyfans') {
            res.status(400).json({
                success: false,
                error: 'Invalid genre. Must be "youtuber" or "onlyfans"',
            });
            return;
        }

        const styles = thumbnailService.getArchetypeStyles(genre as 'youtuber' | 'onlyfans');

        res.json({
            success: true,
            styles,
        });
    } catch (error) {
        console.error('Error fetching thumbnail styles:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch thumbnail styles',
        });
    }
});

export default router;
