import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { GenerationService } from '../services/GenerationService';
import { videoStitcher, TransitionStyle } from '../services/VideoStitcher';
import { bakeMasterPass, ClipSpec, BakeOptions } from '../services/export/BakeMasterPass';
import path from 'path';
import fs from 'fs';

/**
 * Scene Chain Controller
 * Manages video extension workflows with character consistency
 */

const generationService = new GenerationService();

// GET /api/projects/:projectId/scene-chains
export const getSceneChains = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;

        const chains = await prisma.sceneChain.findMany({
            where: { projectId },
            include: {
                segments: {
                    orderBy: { orderIndex: 'asc' }
                },
                characters: {
                    include: {
                        character: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(chains);
    } catch (error) {
        console.error('Error fetching scene chains:', error);
        res.status(500).json({ error: 'Failed to fetch scene chains' });
    }
};

// POST /api/projects/:projectId/scene-chains
export const createSceneChain = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const {
            name,
            description,
            targetDuration,
            transitionStyle,
            styleGuideId,
            colorGrading,
            aspectRatio,
            preferredModel,
            characterIds
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Scene chain name is required' });
        }

        // Create the chain
        const chain = await prisma.sceneChain.create({
            data: {
                projectId,
                name,
                description: description || null,
                targetDuration: targetDuration ? parseInt(targetDuration) : null,
                transitionStyle: transitionStyle || 'smooth',
                styleGuideId: styleGuideId || null,
                colorGrading: colorGrading || null,
                aspectRatio: aspectRatio || '16:9',
                preferredModel: preferredModel || null,
                status: 'draft'
            }
        });

        // Add characters if provided
        if (characterIds && Array.isArray(characterIds) && characterIds.length > 0) {
            await prisma.sceneChainCharacter.createMany({
                data: characterIds.map((charId: string) => ({
                    sceneChainId: chain.id,
                    characterId: charId
                }))
            });
        }

        // Fetch the complete chain with relations
        const fullChain = await prisma.sceneChain.findUnique({
            where: { id: chain.id },
            include: {
                segments: true,
                characters: {
                    include: {
                        character: true
                    }
                }
            }
        });

        res.status(201).json(fullChain);
    } catch (error) {
        console.error('Error creating scene chain:', error);
        res.status(500).json({ error: 'Failed to create scene chain' });
    }
};

// GET /api/projects/:projectId/scene-chains/:id
export const getSceneChain = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const chain = await prisma.sceneChain.findUnique({
            where: { id },
            include: {
                segments: {
                    orderBy: { orderIndex: 'asc' }
                },
                characters: {
                    include: {
                        character: true
                    }
                }
            }
        });

        if (!chain) {
            return res.status(404).json({ error: 'Scene chain not found' });
        }

        res.json(chain);
    } catch (error) {
        console.error('Error fetching scene chain:', error);
        res.status(500).json({ error: 'Failed to fetch scene chain' });
    }
};

// PUT /api/projects/:projectId/scene-chains/:id
export const updateSceneChain = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            targetDuration,
            transitionStyle,
            styleGuideId,
            colorGrading,
            aspectRatio,
            preferredModel,
            status
        } = req.body;

        const updateData: any = {};

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (targetDuration !== undefined) updateData.targetDuration = parseInt(targetDuration);
        if (transitionStyle !== undefined) updateData.transitionStyle = transitionStyle;
        if (styleGuideId !== undefined) updateData.styleGuideId = styleGuideId;
        if (colorGrading !== undefined) updateData.colorGrading = colorGrading;
        if (aspectRatio !== undefined) updateData.aspectRatio = aspectRatio;
        if (preferredModel !== undefined) updateData.preferredModel = preferredModel;
        if (status !== undefined) updateData.status = status;

        const chain = await prisma.sceneChain.update({
            where: { id },
            data: updateData,
            include: {
                segments: {
                    orderBy: { orderIndex: 'asc' }
                },
                characters: {
                    include: {
                        character: true
                    }
                }
            }
        });

        res.json(chain);
    } catch (error) {
        console.error('Error updating scene chain:', error);
        res.status(500).json({ error: 'Failed to update scene chain' });
    }
};

// DELETE /api/projects/:projectId/scene-chains/:id
export const deleteSceneChain = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Cascade delete will handle segments and character associations
        await prisma.sceneChain.delete({
            where: { id }
        });

        res.json({ success: true, message: 'Scene chain deleted' });
    } catch (error) {
        console.error('Error deleting scene chain:', error);
        res.status(500).json({ error: 'Failed to delete scene chain' });
    }
};

// POST /api/projects/:projectId/scene-chains/:id/segments
export const addSegment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            prompt,
            duration,
            sourceType,
            sourceId,
            sourceUrl,
            transitionType,
            orderIndex,
            firstFrameUrl,
            lastFrameUrl
        } = req.body;

        // Prompt is optional for frame-based workflows - will be added later
        const segmentPrompt = prompt || '';

        // Get the chain to verify it exists and get current segment count
        const chain = await prisma.sceneChain.findUnique({
            where: { id },
            include: { segments: true }
        });

        if (!chain) {
            return res.status(404).json({ error: 'Scene chain not found' });
        }

        // Determine order index
        const finalOrderIndex = orderIndex !== undefined
            ? parseInt(orderIndex)
            : chain.segments.length;

        const segment = await prisma.sceneChainSegment.create({
            data: {
                sceneChainId: id,
                prompt: segmentPrompt,
                duration: duration ? parseInt(duration) : 5,
                sourceType: sourceType || null,
                sourceId: sourceId || null,
                sourceUrl: sourceUrl || null,
                transitionType: transitionType || chain.transitionStyle,
                orderIndex: finalOrderIndex,
                status: 'pending',
                firstFrameUrl: firstFrameUrl || null,
                lastFrameUrl: lastFrameUrl || null
            }
        });

        res.status(201).json(segment);
    } catch (error) {
        console.error('Error adding segment:', error);
        res.status(500).json({ error: 'Failed to add segment' });
    }
};

// PUT /api/projects/:projectId/scene-chains/:chainId/segments/:segmentId
export const updateSegment = async (req: Request, res: Response) => {
    try {
        const { segmentId } = req.params;
        const {
            prompt,
            duration,
            sourceType,
            sourceId,
            sourceUrl,
            transitionType,
            orderIndex,
            status,
            firstFrameUrl,
            lastFrameUrl,
            // NLE Trimming fields (Phase 2)
            trimStart,
            trimEnd,
            // Audio L-Cut fields (Phase 3)
            audioUrl,
            audioTrimStart,
            audioTrimEnd,
            audioGain
        } = req.body;

        const updateData: any = {};

        if (prompt !== undefined) updateData.prompt = prompt;
        if (duration !== undefined) updateData.duration = parseInt(duration);
        if (sourceType !== undefined) updateData.sourceType = sourceType;
        if (sourceId !== undefined) updateData.sourceId = sourceId;
        if (sourceUrl !== undefined) updateData.sourceUrl = sourceUrl;
        if (transitionType !== undefined) updateData.transitionType = transitionType;
        if (orderIndex !== undefined) updateData.orderIndex = parseInt(orderIndex);
        if (status !== undefined) updateData.status = status;
        // Reference frame images for guiding generation
        if (firstFrameUrl !== undefined) updateData.firstFrameUrl = firstFrameUrl || null;
        if (lastFrameUrl !== undefined) updateData.lastFrameUrl = lastFrameUrl || null;
        // NLE Trimming fields
        if (trimStart !== undefined) updateData.trimStart = parseFloat(trimStart);
        if (trimEnd !== undefined) updateData.trimEnd = parseFloat(trimEnd);
        // Audio L-Cut fields
        if (audioUrl !== undefined) updateData.audioUrl = audioUrl || null;
        if (audioTrimStart !== undefined) updateData.audioTrimStart = parseFloat(audioTrimStart);
        if (audioTrimEnd !== undefined) updateData.audioTrimEnd = parseFloat(audioTrimEnd);
        if (audioGain !== undefined) updateData.audioGain = parseFloat(audioGain);

        const segment = await prisma.sceneChainSegment.update({
            where: { id: segmentId },
            data: updateData
        });

        res.json(segment);
    } catch (error) {
        console.error('Error updating segment:', error);
        res.status(500).json({ error: 'Failed to update segment' });
    }
};

// DELETE /api/projects/:projectId/scene-chains/:chainId/segments/:segmentId
export const deleteSegment = async (req: Request, res: Response) => {
    try {
        const { segmentId } = req.params;

        await prisma.sceneChainSegment.delete({
            where: { id: segmentId }
        });

        res.json({ success: true, message: 'Segment deleted' });
    } catch (error) {
        console.error('Error deleting segment:', error);
        res.status(500).json({ error: 'Failed to delete segment' });
    }
};

// POST /api/projects/:projectId/scene-chains/:id/reorder
export const reorderSegments = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { segmentOrder } = req.body; // Array of segment IDs in new order

        if (!Array.isArray(segmentOrder)) {
            return res.status(400).json({ error: 'segmentOrder must be an array of segment IDs' });
        }

        // Update each segment's orderIndex
        await Promise.all(
            segmentOrder.map((segmentId: string, index: number) =>
                prisma.sceneChainSegment.update({
                    where: { id: segmentId },
                    data: { orderIndex: index }
                })
            )
        );

        // Return updated chain
        const chain = await prisma.sceneChain.findUnique({
            where: { id },
            include: {
                segments: {
                    orderBy: { orderIndex: 'asc' }
                }
            }
        });

        res.json(chain);
    } catch (error) {
        console.error('Error reordering segments:', error);
        res.status(500).json({ error: 'Failed to reorder segments' });
    }
};

// POST /api/projects/:projectId/scene-chains/:id/characters
export const addCharacterToChain = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { characterId, overrideFaceWeight, overrideStyleWeight, overrideOutfitId } = req.body;

        if (!characterId) {
            return res.status(400).json({ error: 'characterId is required' });
        }

        // Check if already added
        const existing = await prisma.sceneChainCharacter.findUnique({
            where: { sceneChainId_characterId: { sceneChainId: id, characterId } }
        });

        if (existing) {
            return res.status(400).json({ error: 'Character already in chain' });
        }

        const association = await prisma.sceneChainCharacter.create({
            data: {
                sceneChainId: id,
                characterId,
                overrideFaceWeight: overrideFaceWeight ? parseFloat(overrideFaceWeight) : null,
                overrideStyleWeight: overrideStyleWeight ? parseFloat(overrideStyleWeight) : null,
                overrideOutfitId: overrideOutfitId || null
            },
            include: {
                character: true
            }
        });

        res.status(201).json(association);
    } catch (error) {
        console.error('Error adding character to chain:', error);
        res.status(500).json({ error: 'Failed to add character to chain' });
    }
};

// DELETE /api/projects/:projectId/scene-chains/:chainId/characters/:characterId
export const removeCharacterFromChain = async (req: Request, res: Response) => {
    try {
        const { id, characterId } = req.params;

        await prisma.sceneChainCharacter.delete({
            where: { sceneChainId_characterId: { sceneChainId: id, characterId } }
        });

        res.json({ success: true, message: 'Character removed from chain' });
    } catch (error) {
        console.error('Error removing character from chain:', error);
        res.status(500).json({ error: 'Failed to remove character from chain' });
    }
};

// POST /api/projects/:projectId/scene-chains/:id/generate
export const generateChain = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const startFromSegment = req.body?.startFromSegment;

        // Get the full chain
        const chain = await prisma.sceneChain.findUnique({
            where: { id },
            include: {
                segments: {
                    orderBy: { orderIndex: 'asc' }
                },
                characters: {
                    include: {
                        character: true
                    }
                }
            }
        });

        if (!chain) {
            return res.status(404).json({ error: 'Scene chain not found' });
        }

        if (chain.segments.length === 0) {
            return res.status(400).json({ error: 'Chain has no segments' });
        }

        // Update chain status
        await prisma.sceneChain.update({
            where: { id },
            data: { status: 'generating' }
        });

        // Prepare character references
        const characterReferences = chain.characters.map(cc => ({
            id: cc.character.id,
            name: cc.character.name,
            primaryImageUrl: cc.character.primaryImageUrl,
            referenceImages: JSON.parse(cc.character.referenceImages || '[]'),
            faceWeight: cc.overrideFaceWeight || cc.character.faceWeight,
            styleWeight: cc.overrideStyleWeight || cc.character.styleWeight,
            triggerWord: cc.character.triggerWord
        }));

        // Start generating from specified segment or first pending
        const startIndex = startFromSegment || 0;
        const segmentsToGenerate = chain.segments.slice(startIndex);

        // Return immediately, generation will happen asynchronously
        res.json({
            chainId: chain.id,
            status: 'generating',
            segmentsQueued: segmentsToGenerate.length,
            characterReferences: characterReferences.length,
            message: 'Chain generation started. Poll for status updates.'
        });

        // TODO: In a real implementation, this would queue jobs to a worker
        // For now, we'll do synchronous generation with status updates
        generateSegmentsSequentially(chain, segmentsToGenerate, characterReferences);

    } catch (error) {
        console.error('Error starting chain generation:', error);
        res.status(500).json({ error: 'Failed to start chain generation' });
    }
};

// Internal function to generate segments sequentially
async function generateSegmentsSequentially(
    chain: any,
    segments: any[],
    characterReferences: any[]
) {
    let previousOutputUrl: string | null = null;

    for (const segment of segments) {
        try {
            // Update segment status
            await prisma.sceneChainSegment.update({
                where: { id: segment.id },
                data: { status: 'generating' }
            });

            // Determine source URL
            const sourceUrl = segment.sourceUrl || previousOutputUrl;

            // Build generation options
            const options: any = {
                mode: sourceUrl ? 'image_to_video' : 'text_to_video',
                prompt: segment.prompt,
                duration: segment.duration,
                aspectRatio: chain.aspectRatio,
                falModel: chain.preferredModel || 'fal-ai/wan/v2.1/1.3b/text-to-video'
            };

            // Add source image if extending
            if (sourceUrl) {
                options.imageUrl = sourceUrl;
            }

            // Add character references as element references
            if (characterReferences.length > 0) {
                options.elementReferences = characterReferences.map(c => c.primaryImageUrl).filter(Boolean);
                options.elementStrength = characterReferences[0]?.faceWeight || 0.8;

                // Add trigger words to prompt if available
                const triggerWords = characterReferences
                    .filter(c => c.triggerWord)
                    .map(c => c.triggerWord);
                if (triggerWords.length > 0) {
                    options.prompt = `${triggerWords.join(', ')}, ${options.prompt}`;
                }
            }

            // Generate
            const result = await generationService.generateVideo(undefined, options);

            // Extract output URL - outputs is string[]
            let outputUrl: string | null = null;
            if (result.outputs && result.outputs.length > 0) {
                outputUrl = result.outputs[0];
            }

            // Update segment with result
            await prisma.sceneChainSegment.update({
                where: { id: segment.id },
                data: {
                    status: 'complete',
                    generationId: result.id, // Use 'id' from GenerationResult
                    outputUrl: outputUrl
                }
            });

            previousOutputUrl = outputUrl;

        } catch (error: any) {
            console.error(`Error generating segment ${segment.id}:`, error);

            await prisma.sceneChainSegment.update({
                where: { id: segment.id },
                data: {
                    status: 'failed',
                    failureReason: error.message || 'Unknown error'
                }
            });

            // Don't continue if a segment fails
            break;
        }
    }

    // Update chain status and stitch videos if all complete
    const finalSegments = await prisma.sceneChainSegment.findMany({
        where: { sceneChainId: chain.id },
        orderBy: { orderIndex: 'asc' }
    });

    const allComplete = finalSegments.every(s => s.status === 'complete');
    const anyFailed = finalSegments.some(s => s.status === 'failed');

    if (allComplete && finalSegments.length > 1) {
        // Stitch all segment videos into a final composite
        try {
            console.log(`[SceneChain] All ${finalSegments.length} segments complete. Starting video stitching...`);

            const videoUrls = finalSegments
                .map(s => s.outputUrl)
                .filter((url): url is string => url !== null && url !== undefined);

            if (videoUrls.length > 1) {
                // Get transition style from chain settings
                const transitionStyle = (chain.transitionStyle || 'smooth') as TransitionStyle;

                // Stitch the videos together with transitions
                const stitchedPath = await videoStitcher.stitchVideos(videoUrls, {
                    transitionStyle,
                    transitionDuration: 0.5 // Default 0.5s transitions
                });
                console.log(`[SceneChain] Videos stitched with ${transitionStyle} transitions to: ${stitchedPath}`);

                // Move stitched video to uploads folder
                const uploadsDir = path.join(process.cwd(), 'uploads', 'stitched');
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                }

                const finalFilename = `chain-${chain.id}-${Date.now()}.mp4`;
                const finalPath = path.join(uploadsDir, finalFilename);
                fs.copyFileSync(stitchedPath, finalPath);

                // Clean up temp files
                videoStitcher.cleanup(stitchedPath);

                const finalUrl = `/uploads/stitched/${finalFilename}`;

                // Update chain with final composite URL
                await prisma.sceneChain.update({
                    where: { id: chain.id },
                    data: {
                        status: 'complete',
                        finalVideoUrl: finalUrl
                    }
                });

                console.log(`[SceneChain] Chain ${chain.id} complete with final video: ${finalUrl}`);
            } else {
                // Only one video, just mark complete
                await prisma.sceneChain.update({
                    where: { id: chain.id },
                    data: { status: 'complete' }
                });
            }
        } catch (stitchError) {
            console.error('[SceneChain] Video stitching failed:', stitchError);
            // Still mark as complete since individual segments worked
            await prisma.sceneChain.update({
                where: { id: chain.id },
                data: {
                    status: 'complete',
                    // No finalVideoUrl - segments can still be viewed individually
                }
            });
        }
    } else {
        await prisma.sceneChain.update({
            where: { id: chain.id },
            data: {
                status: allComplete ? 'complete' : anyFailed ? 'failed' : 'draft'
            }
        });
    }
}

// GET /api/projects/:projectId/scene-chains/:id/status
export const getChainStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const chain = await prisma.sceneChain.findUnique({
            where: { id },
            include: {
                segments: {
                    orderBy: { orderIndex: 'asc' },
                    select: {
                        id: true,
                        orderIndex: true,
                        status: true,
                        outputUrl: true,
                        failureReason: true
                    }
                }
            }
        });

        if (!chain) {
            return res.status(404).json({ error: 'Scene chain not found' });
        }

        const completed = chain.segments.filter(s => s.status === 'complete').length;
        const failed = chain.segments.filter(s => s.status === 'failed').length;
        const generating = chain.segments.filter(s => s.status === 'generating').length;
        const pending = chain.segments.filter(s => s.status === 'pending').length;

        res.json({
            chainId: chain.id,
            chainStatus: chain.status,
            finalVideoUrl: (chain as any).finalVideoUrl || null,
            progress: {
                total: chain.segments.length,
                completed,
                failed,
                generating,
                pending
            },
            segments: chain.segments
        });
    } catch (error) {
        console.error('Error fetching chain status:', error);
        res.status(500).json({ error: 'Failed to fetch chain status' });
    }
};

// POST /api/projects/:projectId/scene-chains/:id/stitch
// Manually stitch all complete segments into a final video
export const stitchChain = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { transitionStyle: requestTransition, transitionDuration } = req.body;

        const chain = await prisma.sceneChain.findUnique({
            where: { id },
            include: {
                segments: {
                    orderBy: { orderIndex: 'asc' }
                }
            }
        });

        if (!chain) {
            return res.status(404).json({ error: 'Scene chain not found' });
        }

        // Get all complete segments with output URLs
        const completeSegments = chain.segments.filter(
            s => s.status === 'complete' && s.outputUrl
        );

        if (completeSegments.length < 2) {
            return res.status(400).json({
                error: 'Need at least 2 complete segments to stitch',
                completeCount: completeSegments.length
            });
        }

        const videoUrls = completeSegments
            .map(s => s.outputUrl)
            .filter((url): url is string => url !== null);

        // Use request transition style, fall back to chain setting, then default
        const transitionStyle = (requestTransition || chain.transitionStyle || 'smooth') as TransitionStyle;
        const duration = transitionDuration ? parseFloat(transitionDuration) : 0.5;

        console.log(`[SceneChain] Manually stitching ${videoUrls.length} videos for chain ${id} with ${transitionStyle} transitions`);

        // Stitch videos with transitions
        const stitchedPath = await videoStitcher.stitchVideos(videoUrls, {
            transitionStyle,
            transitionDuration: duration
        });
        console.log(`[SceneChain] Videos stitched to: ${stitchedPath}`);

        // Move to uploads folder
        const uploadsDir = path.join(process.cwd(), 'uploads', 'stitched');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const finalFilename = `chain-${chain.id}-${Date.now()}.mp4`;
        const finalPath = path.join(uploadsDir, finalFilename);
        fs.copyFileSync(stitchedPath, finalPath);

        // Clean up temp files
        videoStitcher.cleanup(stitchedPath);

        const finalUrl = `/uploads/stitched/${finalFilename}`;

        // Update chain
        await prisma.sceneChain.update({
            where: { id },
            data: { finalVideoUrl: finalUrl }
        });

        res.json({
            success: true,
            finalVideoUrl: finalUrl,
            segmentsStitched: videoUrls.length
        });

    } catch (error) {
        console.error('Error stitching chain:', error);
        res.status(500).json({ error: 'Failed to stitch videos' });
    }
};

// POST /api/projects/:projectId/scene-chains/:id/segments/:segmentId/frame
// Upload a reference frame image for a segment
export const uploadSegmentFrame = async (req: Request, res: Response) => {
    try {
        const { segmentId } = req.params;
        const { frameType } = req.body; // 'first' or 'last'

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (!frameType || !['first', 'last'].includes(frameType)) {
            return res.status(400).json({ error: 'frameType must be "first" or "last"' });
        }

        // Ensure uploads directory exists
        const uploadsDir = path.join(process.cwd(), 'uploads', 'frames');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const ext = path.extname(req.file.originalname) || '.png';
        const filename = `${segmentId}-${frameType}-${Date.now()}${ext}`;
        const filePath = path.join(uploadsDir, filename);

        // Write file
        fs.writeFileSync(filePath, req.file.buffer);

        // Create URL path
        const fileUrl = `/uploads/frames/${filename}`;

        // Update segment with frame URL
        const updateData = frameType === 'first'
            ? { firstFrameUrl: fileUrl }
            : { lastFrameUrl: fileUrl };

        const segment = await prisma.sceneChainSegment.update({
            where: { id: segmentId },
            data: updateData
        });

        res.json({
            success: true,
            frameType,
            fileUrl,
            segment
        });
    } catch (error) {
        console.error('Error uploading segment frame:', error);
        res.status(500).json({ error: 'Failed to upload frame' });
    }
};

// GET /api/projects/:projectId/scene-chains/:id/segments/:segmentId
// Get a single segment
export const getSegment = async (req: Request, res: Response) => {
    try {
        const { segmentId } = req.params;

        const segment = await prisma.sceneChainSegment.findUnique({
            where: { id: segmentId }
        });

        if (!segment) {
            return res.status(404).json({ error: 'Segment not found' });
        }

        res.json(segment);
    } catch (error) {
        console.error('Error fetching segment:', error);
        res.status(500).json({ error: 'Failed to fetch segment' });
    }
};

// POST /api/projects/:projectId/scene-chains/:id/segments/:segmentId/generate
// Generate video for a single segment
export const generateSegment = async (req: Request, res: Response) => {
    try {
        const { id, segmentId } = req.params;
        const { aspectRatio } = req.body;

        // Get the segment
        const segment = await prisma.sceneChainSegment.findUnique({
            where: { id: segmentId },
            include: {
                sceneChain: {
                    include: {
                        characters: {
                            include: {
                                character: true
                            }
                        }
                    }
                }
            }
        });

        if (!segment) {
            return res.status(404).json({ error: 'Segment not found' });
        }

        if (!segment.prompt || !segment.prompt.trim()) {
            return res.status(400).json({ error: 'Segment has no prompt' });
        }

        // Update segment status
        await prisma.sceneChainSegment.update({
            where: { id: segmentId },
            data: { status: 'generating' }
        });

        // Return immediately
        res.json({
            segmentId,
            status: 'generating',
            message: 'Segment generation started'
        });

        // Generate asynchronously
        generateSingleSegment(segment, aspectRatio || segment.sceneChain.aspectRatio);

    } catch (error) {
        console.error('Error starting segment generation:', error);
        res.status(500).json({ error: 'Failed to start segment generation' });
    }
};

// Internal function to generate a single segment
async function generateSingleSegment(segment: any, aspectRatio: string) {
    const chain = segment.sceneChain;

    try {
        // Prepare character references
        const characterReferences = chain.characters?.map((cc: any) => ({
            primaryImageUrl: cc.character.primaryImageUrl,
            faceWeight: cc.overrideFaceWeight || cc.character.faceWeight,
            triggerWord: cc.character.triggerWord
        })) || [];

        // Determine if this is image-to-video or text-to-video
        const hasSourceImage = segment.firstFrameUrl || segment.sourceUrl;

        // Build generation options
        const options: any = {
            mode: hasSourceImage ? 'image_to_video' : 'text_to_video',
            prompt: segment.prompt,
            duration: segment.duration,
            aspectRatio: aspectRatio,
            falModel: chain.preferredModel || 'fal-ai/wan/v2.1/1.3b/text-to-video'
        };

        // Add source image if available (first frame reference takes priority)
        if (segment.firstFrameUrl) {
            // Convert relative URL to absolute if needed
            const imageUrl = segment.firstFrameUrl.startsWith('http')
                ? segment.firstFrameUrl
                : `${process.env.BACKEND_URL || 'http://localhost:3001'}${segment.firstFrameUrl}`;
            options.imageUrl = imageUrl;
            options.mode = 'image_to_video';
            options.falModel = chain.preferredModel || 'fal-ai/wan/v2.1/1.3b/image-to-video';
        }

        // Add character references as element references
        if (characterReferences.length > 0) {
            options.elementReferences = characterReferences.map((c: any) => c.primaryImageUrl).filter(Boolean);
            options.elementStrength = characterReferences[0]?.faceWeight || 0.8;

            // Add trigger words to prompt
            const triggerWords = characterReferences
                .filter((c: any) => c.triggerWord)
                .map((c: any) => c.triggerWord);
            if (triggerWords.length > 0) {
                options.prompt = `${triggerWords.join(', ')}, ${options.prompt}`;
            }
        }

        // Generate
        const result = await generationService.generateVideo(undefined, options);

        // Extract output URL - handle various result formats
        let outputUrl: string | null = null;
        if (result.outputs && result.outputs.length > 0) {
            const firstOutput = result.outputs[0];
            // Handle both string and object formats
            if (typeof firstOutput === 'string') {
                outputUrl = firstOutput;
            } else if (firstOutput && typeof firstOutput === 'object') {
                outputUrl = (firstOutput as any).url || (firstOutput as any).video?.url || null;
            }
        }

        // Ensure we only pass serializable data to Prisma
        const generationId = typeof result.id === 'string' ? result.id : String(result.id || '');

        // Update segment with result
        await prisma.sceneChainSegment.update({
            where: { id: segment.id },
            data: {
                status: 'complete',
                generationId: generationId || null,
                outputUrl: outputUrl
            }
        });

    } catch (error: any) {
        console.error(`Error generating segment ${segment.id}:`, error);

        await prisma.sceneChainSegment.update({
            where: { id: segment.id },
            data: {
                status: 'failed',
                failureReason: error.message || 'Unknown error'
            }
        });
    }
}

// =============================================================================
// NLE TIMELINE BAKE ENDPOINTS (Phase 4)
// =============================================================================

// POST /api/projects/:projectId/scene-chains/:id/bake
// Bake the timeline with all trim/audio edits applied via FFmpeg
export const bakeChain = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            fps = 24,
            codec = 'h264',
            quality = 'master',
            includeAudio = true,
            outputFormat = 'mp4'
        } = req.body;

        // Get chain with all segments
        const chain = await prisma.sceneChain.findUnique({
            where: { id },
            include: {
                segments: {
                    orderBy: { orderIndex: 'asc' }
                }
            }
        });

        if (!chain) {
            return res.status(404).json({ error: 'Scene chain not found' });
        }

        // Filter to only complete segments with output URLs
        const completeSegments = chain.segments.filter(
            s => s.status === 'complete' && s.outputUrl
        );

        if (completeSegments.length === 0) {
            return res.status(400).json({
                error: 'No complete segments to bake',
                totalSegments: chain.segments.length
            });
        }

        // Convert segments to ClipSpec format
        const clips: ClipSpec[] = completeSegments.map((seg) => {
            // Ensure URL is absolute
            const videoUrl = seg.outputUrl!.startsWith('http')
                ? seg.outputUrl!
                : `${process.env.BACKEND_URL || 'http://localhost:3001'}${seg.outputUrl}`;

            const audioUrl = seg.audioUrl
                ? (seg.audioUrl.startsWith('http')
                    ? seg.audioUrl
                    : `${process.env.BACKEND_URL || 'http://localhost:3001'}${seg.audioUrl}`)
                : undefined;

            return {
                id: seg.id,
                videoUrl,
                duration: seg.duration,
                trimStart: seg.trimStart,
                trimEnd: seg.trimEnd,
                audioUrl,
                audioTrimStart: seg.audioTrimStart,
                audioTrimEnd: seg.audioTrimEnd,
                audioGain: seg.audioGain,
                transitionType: (seg.transitionType as any) || 'cut',
                transitionDuration: 0.5
            };
        });

        console.log(`[BakeChain] Starting bake for chain ${id} with ${clips.length} clips`);

        // Execute bake
        const result = await bakeMasterPass.bake(clips, {
            fps,
            codec,
            quality,
            includeAudio,
            outputFormat
        });

        if (!result.success) {
            return res.status(500).json({
                error: 'Bake failed',
                logs: result.logs
            });
        }

        // Move output to uploads folder
        const uploadsDir = path.join(process.cwd(), 'uploads', 'baked');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const finalFilename = `bake-${chain.id}-${Date.now()}.${outputFormat}`;
        const finalPath = path.join(uploadsDir, finalFilename);
        fs.copyFileSync(result.outputPath, finalPath);

        // Cleanup temp files
        bakeMasterPass.cleanup(result.outputPath);

        const finalUrl = `/uploads/baked/${finalFilename}`;

        // Update chain with baked video URL
        await prisma.sceneChain.update({
            where: { id },
            data: { finalVideoUrl: finalUrl }
        });

        console.log(`[BakeChain] Bake complete: ${finalUrl}`);

        res.json({
            success: true,
            finalVideoUrl: finalUrl,
            duration: result.duration,
            resolution: result.resolution,
            fileSize: result.fileSize,
            clipsProcessed: clips.length,
            logs: result.logs
        });

    } catch (error: any) {
        console.error('Error baking chain:', error);
        res.status(500).json({
            error: 'Failed to bake timeline',
            message: error.message
        });
    }
};

// POST /api/projects/:projectId/scene-chains/:id/bake-preview
// Quick preview bake (draft quality, no audio) for scrubbing
export const bakePreview = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { startTime, endTime } = req.body;

        // Get chain with segments
        const chain = await prisma.sceneChain.findUnique({
            where: { id },
            include: {
                segments: {
                    orderBy: { orderIndex: 'asc' }
                }
            }
        });

        if (!chain) {
            return res.status(404).json({ error: 'Scene chain not found' });
        }

        // Filter to complete segments
        const completeSegments = chain.segments.filter(
            s => s.status === 'complete' && s.outputUrl
        );

        if (completeSegments.length === 0) {
            return res.status(400).json({ error: 'No complete segments' });
        }

        // If time range specified, filter segments within range
        let segmentsToProcess = completeSegments;
        if (startTime !== undefined && endTime !== undefined) {
            let accumulatedTime = 0;
            segmentsToProcess = [];

            for (const seg of completeSegments) {
                const effectiveDuration = seg.duration - seg.trimStart - seg.trimEnd;
                const segStart = accumulatedTime;
                const segEnd = accumulatedTime + effectiveDuration;

                // Include if overlaps with requested range
                if (segEnd > startTime && segStart < endTime) {
                    segmentsToProcess.push(seg);
                }

                accumulatedTime += effectiveDuration;
            }
        }

        // Convert to clips
        const clips: ClipSpec[] = segmentsToProcess.map((seg) => ({
            id: seg.id,
            videoUrl: seg.outputUrl!.startsWith('http')
                ? seg.outputUrl!
                : `${process.env.BACKEND_URL || 'http://localhost:3001'}${seg.outputUrl}`,
            duration: seg.duration,
            trimStart: seg.trimStart,
            trimEnd: seg.trimEnd,
            transitionType: 'cut' // Fast cuts for preview
        }));

        // Quick draft bake
        const result = await bakeMasterPass.bake(clips, {
            fps: 24,
            codec: 'h264',
            quality: 'draft',
            includeAudio: false,
            outputFormat: 'mp4'
        });

        // Return preview directly (don't save to uploads)
        res.json({
            success: true,
            previewPath: result.outputPath,
            duration: result.duration,
            clipsProcessed: clips.length
        });

    } catch (error: any) {
        console.error('Error creating preview:', error);
        res.status(500).json({ error: 'Failed to create preview' });
    }
};
