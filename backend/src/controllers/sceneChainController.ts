import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { GenerationService } from '../services/GenerationService';
import { videoStitcher, TransitionStyle } from '../services/VideoStitcher';
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
          orderBy: { orderIndex: 'asc' },
        },
        characters: {
          include: {
            character: true,
          },
        },
      },
      // Order by orderIndex (for explicit ordering from script lab) then by createdAt (for creation order)
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
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
      masterStyleContext, // DUAL-ENGINE: Master style context for the entire chain
      orderIndex, // Scene order from script lab
      characterIds,
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
        masterStyleContext: masterStyleContext || null, // DUAL-ENGINE: Inherited by all segments
        preferredModel: preferredModel || null,
        orderIndex: orderIndex !== undefined ? parseInt(orderIndex) : null, // Scene order from script lab
        status: 'draft',
      },
    });

    // Add characters if provided
    if (characterIds && Array.isArray(characterIds) && characterIds.length > 0) {
      await prisma.sceneChainCharacter.createMany({
        data: characterIds.map((charId: string) => ({
          sceneChainId: chain.id,
          characterId: charId,
        })),
      });
    }

    // Fetch the complete chain with relations
    const fullChain = await prisma.sceneChain.findUnique({
      where: { id: chain.id },
      include: {
        segments: true,
        characters: {
          include: {
            character: true,
          },
        },
      },
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
          orderBy: { orderIndex: 'asc' },
        },
        characters: {
          include: {
            character: true,
          },
        },
      },
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
      masterStyleContext, // DUAL-ENGINE: Master style context for the entire chain
      status,
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
    if (masterStyleContext !== undefined) updateData.masterStyleContext = masterStyleContext;
    if (status !== undefined) updateData.status = status;

    const chain = await prisma.sceneChain.update({
      where: { id },
      data: updateData,
      include: {
        segments: {
          orderBy: { orderIndex: 'asc' },
        },
        characters: {
          include: {
            character: true,
          },
        },
      },
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
      where: { id },
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
      lastFrameUrl,
      firstFramePrompt,
      lastFramePrompt,
      negativePrompt, // AI-generated negative prompt for I2I surgical removal
      styleContext, // DUAL-ENGINE: Segment-specific style override
    } = req.body;

    // Prompt is optional for frame-based workflows - will be added later
    const segmentPrompt = prompt || '';

    // Get the chain to verify it exists and get current segment count
    const chain = await prisma.sceneChain.findUnique({
      where: { id },
      include: { segments: true },
    });

    if (!chain) {
      return res.status(404).json({ error: 'Scene chain not found' });
    }

    // Determine order index
    const finalOrderIndex = orderIndex !== undefined ? parseInt(orderIndex) : chain.segments.length;

    const segment = await prisma.sceneChainSegment.create({
      data: {
        sceneChainId: id,
        prompt: segmentPrompt,
        duration: duration ? parseInt(duration) : 5,
        styleContext: styleContext || null, // DUAL-ENGINE: Override chain's masterStyleContext
        sourceType: sourceType || null,
        sourceId: sourceId || null,
        sourceUrl: sourceUrl || null,
        transitionType: transitionType || chain.transitionStyle,
        orderIndex: finalOrderIndex,
        status: 'pending',
        firstFrameUrl: firstFrameUrl || null,
        lastFrameUrl: lastFrameUrl || null,
        firstFramePrompt: firstFramePrompt || null,
        lastFramePrompt: lastFramePrompt || null,
        negativePrompt: negativePrompt || null, // AI-generated for I2I
      },
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
      firstFramePrompt,
      lastFramePrompt,
      negativePrompt, // For surgical removal of unwanted elements in I2I
      styleContext, // DUAL-ENGINE: Segment-specific style override
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
    // Frame prompts for image generation
    if (firstFramePrompt !== undefined) updateData.firstFramePrompt = firstFramePrompt || null;
    if (lastFramePrompt !== undefined) updateData.lastFramePrompt = lastFramePrompt || null;
    // Negative prompt for surgical removal of unwanted elements (I2I)
    if (negativePrompt !== undefined) updateData.negativePrompt = negativePrompt || null;
    // DUAL-ENGINE: Segment-specific style context (overrides chain's masterStyleContext)
    if (styleContext !== undefined) updateData.styleContext = styleContext || null;

    const segment = await prisma.sceneChainSegment.update({
      where: { id: segmentId },
      data: updateData,
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
      where: { id: segmentId },
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
          data: { orderIndex: index },
        })
      )
    );

    // Return updated chain
    const chain = await prisma.sceneChain.findUnique({
      where: { id },
      include: {
        segments: {
          orderBy: { orderIndex: 'asc' },
        },
      },
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
      where: { sceneChainId_characterId: { sceneChainId: id, characterId } },
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
        overrideOutfitId: overrideOutfitId || null,
      },
      include: {
        character: true,
      },
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
      where: { sceneChainId_characterId: { sceneChainId: id, characterId } },
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
          orderBy: { orderIndex: 'asc' },
        },
        characters: {
          include: {
            character: true,
          },
        },
      },
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
      data: { status: 'generating' },
    });

    // Prepare character references
    const characterReferences = chain.characters.map(cc => ({
      id: cc.character.id,
      name: cc.character.name,
      primaryImageUrl: cc.character.primaryImageUrl,
      referenceImages: JSON.parse(cc.character.referenceImages || '[]'),
      faceWeight: cc.overrideFaceWeight || cc.character.faceWeight,
      styleWeight: cc.overrideStyleWeight || cc.character.styleWeight,
      triggerWord: cc.character.triggerWord,
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
      message: 'Chain generation started. Poll for status updates.',
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
        data: { status: 'generating' },
      });

      // Determine source URL
      const sourceUrl = segment.sourceUrl || previousOutputUrl;

      // Build generation options
      const options: any = {
        mode: sourceUrl ? 'image_to_video' : 'text_to_video',
        prompt: segment.prompt,
        duration: segment.duration,
        aspectRatio: chain.aspectRatio,
        falModel: chain.preferredModel || 'fal-ai/wan/v2.1/1.3b/text-to-video',
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
        const triggerWords = characterReferences.filter(c => c.triggerWord).map(c => c.triggerWord);
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
          outputUrl: outputUrl,
        },
      });

      previousOutputUrl = outputUrl;
    } catch (error: any) {
      console.error(`Error generating segment ${segment.id}:`, error);

      await prisma.sceneChainSegment.update({
        where: { id: segment.id },
        data: {
          status: 'failed',
          failureReason: error.message || 'Unknown error',
        },
      });

      // Don't continue if a segment fails
      break;
    }
  }

  // Update chain status and stitch videos if all complete
  const finalSegments = await prisma.sceneChainSegment.findMany({
    where: { sceneChainId: chain.id },
    orderBy: { orderIndex: 'asc' },
  });

  const allComplete = finalSegments.every(s => s.status === 'complete');
  const anyFailed = finalSegments.some(s => s.status === 'failed');

  if (allComplete && finalSegments.length > 1) {
    // Stitch all segment videos into a final composite
    try {
      console.log(
        `[SceneChain] All ${finalSegments.length} segments complete. Starting video stitching...`
      );

      const videoUrls = finalSegments
        .map(s => s.outputUrl)
        .filter((url): url is string => url !== null && url !== undefined);

      if (videoUrls.length > 1) {
        // Get transition style from chain settings
        const transitionStyle = (chain.transitionStyle || 'smooth') as TransitionStyle;

        // Stitch the videos together with transitions
        const stitchedPath = await videoStitcher.stitchVideos(videoUrls, {
          transitionStyle,
          transitionDuration: 0.5, // Default 0.5s transitions
        });
        console.log(
          `[SceneChain] Videos stitched with ${transitionStyle} transitions to: ${stitchedPath}`
        );

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
            finalVideoUrl: finalUrl,
          },
        });

        console.log(`[SceneChain] Chain ${chain.id} complete with final video: ${finalUrl}`);
      } else {
        // Only one video, just mark complete
        await prisma.sceneChain.update({
          where: { id: chain.id },
          data: { status: 'complete' },
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
        },
      });
    }
  } else {
    await prisma.sceneChain.update({
      where: { id: chain.id },
      data: {
        status: allComplete ? 'complete' : anyFailed ? 'failed' : 'draft',
      },
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
            failureReason: true,
          },
        },
      },
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
        pending,
      },
      segments: chain.segments,
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
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!chain) {
      return res.status(404).json({ error: 'Scene chain not found' });
    }

    // Get all complete segments with output URLs
    const completeSegments = chain.segments.filter(s => s.status === 'complete' && s.outputUrl);

    if (completeSegments.length < 2) {
      return res.status(400).json({
        error: 'Need at least 2 complete segments to stitch',
        completeCount: completeSegments.length,
      });
    }

    const videoUrls = completeSegments
      .map(s => s.outputUrl)
      .filter((url): url is string => url !== null);

    // Use request transition style, fall back to chain setting, then default
    const transitionStyle = (requestTransition ||
      chain.transitionStyle ||
      'smooth') as TransitionStyle;
    const duration = transitionDuration ? parseFloat(transitionDuration) : 0.5;

    console.log(
      `[SceneChain] Manually stitching ${videoUrls.length} videos for chain ${id} with ${transitionStyle} transitions`
    );

    // Stitch videos with transitions
    const stitchedPath = await videoStitcher.stitchVideos(videoUrls, {
      transitionStyle,
      transitionDuration: duration,
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
      data: { finalVideoUrl: finalUrl },
    });

    res.json({
      success: true,
      finalVideoUrl: finalUrl,
      segmentsStitched: videoUrls.length,
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
    const updateData =
      frameType === 'first' ? { firstFrameUrl: fileUrl } : { lastFrameUrl: fileUrl };

    const segment = await prisma.sceneChainSegment.update({
      where: { id: segmentId },
      data: updateData,
    });

    res.json({
      success: true,
      frameType,
      fileUrl,
      segment,
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
      where: { id: segmentId },
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
                character: true,
              },
            },
          },
        },
      },
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
      data: { status: 'generating' },
    });

    // Return immediately
    res.json({
      segmentId,
      status: 'generating',
      message: 'Segment generation started',
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
    const characterReferences =
      chain.characters?.map((cc: any) => ({
        primaryImageUrl: cc.character.primaryImageUrl,
        faceWeight: cc.overrideFaceWeight || cc.character.faceWeight,
        triggerWord: cc.character.triggerWord,
      })) || [];

    // Determine if this is image-to-video or text-to-video
    const hasSourceImage = segment.firstFrameUrl || segment.sourceUrl;

    // Build generation options
    const options: any = {
      mode: hasSourceImage ? 'image_to_video' : 'text_to_video',
      prompt: segment.prompt,
      duration: segment.duration,
      aspectRatio: aspectRatio,
      falModel: chain.preferredModel || 'fal-ai/wan/v2.1/1.3b/text-to-video',
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
      options.elementReferences = characterReferences
        .map((c: any) => c.primaryImageUrl)
        .filter(Boolean);
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

    // Debug log the result structure
    const debugResult = result as any;
    console.log(`[SceneChain] Result structure:`, {
      hasOutputs: !!result.outputs,
      outputsLength: result.outputs?.length,
      firstOutputType: result.outputs?.[0] ? typeof result.outputs[0] : 'undefined',
      resultUrl: debugResult.url,
      resultVideoUrl: debugResult.video?.url,
    });

    // Try multiple extraction patterns
    if (result.outputs && result.outputs.length > 0) {
      const firstOutput = result.outputs[0];
      if (typeof firstOutput === 'string') {
        outputUrl = firstOutput;
      } else if (firstOutput && typeof firstOutput === 'object') {
        // Ensure we're getting a string, not a function
        const urlCandidate = (firstOutput as any).url || (firstOutput as any).video?.url;
        if (typeof urlCandidate === 'string') {
          outputUrl = urlCandidate;
        }
      }
    }

    // Fallback to direct result properties (cast to any for flexible access)
    const resultAny = result as any;
    if (!outputUrl && typeof resultAny.url === 'string') {
      outputUrl = resultAny.url;
    }
    if (!outputUrl && typeof resultAny.video?.url === 'string') {
      outputUrl = resultAny.video.url;
    }

    // Final safety check - ensure outputUrl is a string or null
    if (outputUrl && typeof outputUrl !== 'string') {
      console.error(`[SceneChain] outputUrl is not a string:`, typeof outputUrl, outputUrl);
      outputUrl = null;
    }

    // Ensure we only pass serializable data to Prisma
    const generationId = typeof result.id === 'string' ? result.id : String(result.id || '');

    console.log(
      `[SceneChain] Saving segment with outputUrl:`,
      outputUrl?.substring(0, 50) || 'null'
    );

    // Only mark as complete if we have a valid output URL
    if (!outputUrl) {
      console.error(`[SceneChain] No output URL extracted from result, marking as failed`);
      await prisma.sceneChainSegment.update({
        where: { id: segment.id },
        data: {
          status: 'failed',
          failureReason: 'No video URL returned from generation',
        },
      });
      return;
    }

    // Update segment with result
    await prisma.sceneChainSegment.update({
      where: { id: segment.id },
      data: {
        status: 'complete',
        generationId: generationId || null,
        outputUrl: outputUrl,
      },
    });
  } catch (error: any) {
    console.error(`Error generating segment ${segment.id}:`, error);

    await prisma.sceneChainSegment.update({
      where: { id: segment.id },
      data: {
        status: 'failed',
        failureReason: error.message || 'Unknown error',
      },
    });
  }
}

// POST /api/projects/:projectId/scene-chains/:id/segments/:segmentId/generate-frame
// Generate a first or last frame image from the stored prompt
//
// QWEN CONTINUITY LOOP: Uses Qwen-2511 for seamless shot-to-shot continuity
// - Last frame: I2I edit from shot's first frame (preserves identity)
// - First frame of Shot 2+: I2I edit from previous shot's last frame (seamless transition)
export const generateFrame = async (req: Request, res: Response) => {
  try {
    const { id: chainId, segmentId } = req.params;
    const { frameType, model, negativePrompt, elementReferences: requestElementRefs } = req.body; // frameType: 'first' | 'last'

    if (!frameType || !['first', 'last'].includes(frameType)) {
      return res.status(400).json({ error: 'frameType must be "first" or "last"' });
    }

    // Fetch segment with all segments for continuity lookup
    const segment = await prisma.sceneChainSegment.findUnique({
      where: { id: segmentId },
      include: {
        sceneChain: {
          include: {
            characters: {
              include: { character: true },
            },
            segments: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    if (segment.sceneChainId !== chainId) {
      return res.status(400).json({ error: 'Segment does not belong to this chain' });
    }

    // Get the appropriate surgical instruction prompt
    const surgicalInstruction =
      frameType === 'first' ? segment.firstFramePrompt : segment.lastFramePrompt;

    if (!surgicalInstruction) {
      return res.status(400).json({
        error: `No ${frameType} frame prompt found for this segment. Please add one first.`,
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // DUAL-ENGINE PROMPT ARCHITECTURE: Combine Style Context + Surgical Instruction
    // ═══════════════════════════════════════════════════════════════════
    // P0: Master Style Context (from chain or segment) - defines the overall aesthetic
    // P1: Surgical Instruction - the specific action for this frame
    const masterStyleContext =
      (segment as any).styleContext || (segment.sceneChain as any).masterStyleContext || '';

    // Combine: Style Context + Surgical Instruction
    // For Qwen I2I: Format as edit instruction to ensure changes are applied
    // For T2I: "{surgical}, {context}"
    let prompt = masterStyleContext
      ? `${surgicalInstruction}, ${masterStyleContext}`
      : surgicalInstruction;

    console.log(`[SceneChain] Generating ${frameType} frame for segment ${segmentId}`);
    console.log(`[SceneChain] Surgical Instruction: ${surgicalInstruction.substring(0, 80)}...`);
    if (masterStyleContext) {
      console.log(`[SceneChain] Master Style Context: ${masterStyleContext.substring(0, 80)}...`);
    }

    // Build character references from chain characters
    const characterReferences = segment.sceneChain.characters
      .map((cc: any) => cc.character)
      .filter((c: any) => c.primaryImageUrl);

    // ═══════════════════════════════════════════════════════════════════
    // QWEN CONTINUITY LOOP: Determine source image for I2I consistency
    // ═══════════════════════════════════════════════════════════════════
    let sourceImageUrl: string | null = null;
    let useQwenI2I = false;

    if (frameType === 'last') {
      // Last frame → Use I2I from this shot's first frame (if available)
      if (segment.firstFrameUrl) {
        sourceImageUrl = segment.firstFrameUrl.startsWith('http')
          ? segment.firstFrameUrl
          : `${process.env.BACKEND_URL || 'http://localhost:3001'}${segment.firstFrameUrl}`;
        useQwenI2I = true;
        console.log(`[SceneChain/Qwen] Last frame will use I2I from first frame for consistency`);
      }
    } else {
      // First frame of Shot 2+ → Use I2I from previous shot's last frame
      const allSegments = segment.sceneChain.segments;
      const currentIndex = allSegments.findIndex((s: any) => s.id === segmentId);

      if (currentIndex > 0) {
        const prevSegment = allSegments[currentIndex - 1];
        if (prevSegment.lastFrameUrl) {
          sourceImageUrl = prevSegment.lastFrameUrl.startsWith('http')
            ? prevSegment.lastFrameUrl
            : `${process.env.BACKEND_URL || 'http://localhost:3001'}${prevSegment.lastFrameUrl}`;
          useQwenI2I = true;
          console.log(
            `[SceneChain/Qwen] First frame of Shot ${currentIndex + 1} will use I2I from Shot ${currentIndex}'s last frame for seamless transition`
          );
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODEL SELECTION STRATEGY:
    // - T2I (Shot 1, First Frame): Use Flux Dev for high-quality base
    // - I2I (All subsequent frames): Use Qwen-2511 for surgical editing
    //
    // Qwen-2511 excels at:
    // - Instruction-based editing ("change X to Y")
    // - Identity preservation (face consistency)
    // - Surgical precision without hallucination
    // ═══════════════════════════════════════════════════════════════════
    const t2iModel = model || 'fal-ai/flux/dev'; // Default T2I model for base generation
    const i2iModel = 'fal-ai/qwen-image-edit-2511'; // Qwen for surgical I2I editing
    const selectedModel = useQwenI2I ? i2iModel : t2iModel;
    console.log(
      `[SceneChain] Model selection: T2I=${t2iModel}, I2I=${i2iModel}, useI2I=${useQwenI2I}, selected=${selectedModel}`
    );

    // For Qwen I2I, format prompt as surgical edit instruction
    // Qwen works best with directive prompts: "change X to Y" rather than scene descriptions
    let finalPrompt = prompt;
    if (useQwenI2I) {
      // Convert scene description to edit instruction
      finalPrompt = `Edit this image: ${prompt}. Maintain the character's identity, facial features, and overall composition while applying the described changes.`;
      console.log(`[SceneChain/Qwen] Surgical edit prompt: ${finalPrompt.substring(0, 100)}...`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // NEGATIVE PROMPT: Global Cleanliness + User Surgical Instructions
    // ═══════════════════════════════════════════════════════════════════
    // The Global Cleanliness Prompt ensures baseline quality on ALL generations
    // The user's custom negative prompt handles surgical removal of specific elements
    const GLOBAL_NEGATIVE_PROMPT =
      'ugly, deformed, disfigured, extra limbs, missing limbs, fused fingers, too many fingers, ' +
      'watermark, text, signature, logo, low quality, bad anatomy, bad perspective, ' +
      'multiple heads, blurry, noise, artifacts, duplicate, morbid, mutilated';

    // User's surgical removal instructions (from request or stored in segment)
    const customNegative = negativePrompt || (segment as any).negativePrompt || '';

    // Combine: User's surgical prompt takes priority (comes first), then global cleanup
    const effectiveNegativePrompt = customNegative.trim()
      ? `${customNegative.trim()}, ${GLOBAL_NEGATIVE_PROMPT}`
      : GLOBAL_NEGATIVE_PROMPT;

    const options: any = {
      mode: useQwenI2I ? 'image_to_image' : 'text_to_image',
      prompt: finalPrompt,
      negativePrompt: effectiveNegativePrompt,
      aspectRatio: segment.sceneChain.aspectRatio || '16:9',
      model: selectedModel,
    };

    if (customNegative.trim()) {
      console.log(
        `[SceneChain/Qwen] Custom negative prompt: ${customNegative.substring(0, 80)}...`
      );
    }
    console.log(
      `[SceneChain] Using global cleanliness + custom negative prompt (${effectiveNegativePrompt.length} chars)`
    );

    // Add source image for Qwen I2I surgical editing
    if (useQwenI2I && sourceImageUrl) {
      options.imageUrl = sourceImageUrl;
      options.sourceImages = [sourceImageUrl]; // Qwen expects image_urls array
      console.log(`[SceneChain/Qwen] I2I source image: ${sourceImageUrl.substring(0, 50)}...`);
    }

    // Combine element references from request (from @mentions in prompt) with chain characters
    const allElementRefs: string[] = [];

    // First, add references from the request (from Smart Prompt Builder / @mentions)
    if (requestElementRefs && Array.isArray(requestElementRefs)) {
      allElementRefs.push(
        ...requestElementRefs.filter((url: string) => typeof url === 'string' && url.length > 0)
      );
    }

    // Then add character references from the chain (if not already included)
    if (characterReferences.length > 0) {
      for (const c of characterReferences) {
        if (c.primaryImageUrl && !allElementRefs.includes(c.primaryImageUrl)) {
          allElementRefs.push(c.primaryImageUrl);
        }
      }

      // Add trigger words to prompt
      const triggerWords = characterReferences
        .filter((c: any) => c.triggerWord)
        .map((c: any) => c.triggerWord);
      if (triggerWords.length > 0) {
        options.prompt = `${triggerWords.join(', ')}, ${options.prompt}`;
      }
    }

    // Add combined element references if available (for T2I mode)
    if (allElementRefs.length > 0 && !useQwenI2I) {
      options.elementReferences = allElementRefs;
      options.elementStrength = characterReferences[0]?.faceWeight || 0.7;
      console.log(
        `[SceneChain] Using ${allElementRefs.length} element reference(s) for frame generation`
      );
    }

    // Generate the image
    const result = await generationService.generateImage(options);

    // Extract output URL
    let outputUrl: string | null = null;
    const resultAny = result as any;

    if (result.outputs && result.outputs.length > 0) {
      const firstOutput = result.outputs[0];
      if (typeof firstOutput === 'string') {
        outputUrl = firstOutput;
      } else if (firstOutput && typeof firstOutput === 'object') {
        const urlCandidate = (firstOutput as any).url;
        if (typeof urlCandidate === 'string') {
          outputUrl = urlCandidate;
        }
      }
    }

    // Fallbacks
    if (!outputUrl && typeof resultAny.url === 'string') {
      outputUrl = resultAny.url;
    }
    if (!outputUrl && resultAny.images?.[0]?.url) {
      outputUrl = resultAny.images[0].url;
    }

    if (!outputUrl) {
      console.error('[SceneChain] No output URL from frame generation:', result);
      return res.status(500).json({ error: 'Frame generation failed - no output URL' });
    }

    console.log(`[SceneChain] Generated ${frameType} frame: ${outputUrl.substring(0, 50)}...`);

    // Update segment with the generated frame URL
    const updateData =
      frameType === 'first' ? { firstFrameUrl: outputUrl } : { lastFrameUrl: outputUrl };

    const updatedSegment = await prisma.sceneChainSegment.update({
      where: { id: segmentId },
      data: updateData,
    });

    res.json({
      success: true,
      frameType,
      url: outputUrl,
      segment: updatedSegment,
    });
  } catch (error: any) {
    console.error('Error generating frame:', error);
    res.status(500).json({ error: error.message || 'Failed to generate frame' });
  }
};

// POST /api/projects/:projectId/scene-chains/:id/generate-all-frames
// Generate all missing frames for all segments in a chain
export const generateAllFrames = async (req: Request, res: Response) => {
  try {
    const { id: chainId } = req.params;
    const { model, frameTypes = ['first', 'last'] } = req.body;

    // Fetch chain with segments
    const chain = await prisma.sceneChain.findUnique({
      where: { id: chainId },
      include: {
        segments: {
          orderBy: { orderIndex: 'asc' },
        },
        characters: {
          include: { character: true },
        },
      },
    });

    if (!chain) {
      return res.status(404).json({ error: 'Scene chain not found' });
    }

    // Find segments that need frame generation
    const tasksToGenerate: { segmentId: string; frameType: 'first' | 'last' }[] = [];

    for (const segment of chain.segments) {
      if (frameTypes.includes('first') && segment.firstFramePrompt && !segment.firstFrameUrl) {
        tasksToGenerate.push({ segmentId: segment.id, frameType: 'first' });
      }
      if (frameTypes.includes('last') && segment.lastFramePrompt && !segment.lastFrameUrl) {
        tasksToGenerate.push({ segmentId: segment.id, frameType: 'last' });
      }
    }

    if (tasksToGenerate.length === 0) {
      return res.json({
        success: true,
        message: 'No frames to generate - all frames already exist or no prompts set',
        generated: 0,
      });
    }

    console.log(`[SceneChain] Generating ${tasksToGenerate.length} frames for chain ${chainId}`);

    // Return immediately with task count, generation happens in background
    res.json({
      success: true,
      message: `Generating ${tasksToGenerate.length} frames`,
      tasks: tasksToGenerate,
      total: tasksToGenerate.length,
    });

    // Generate frames in background (don't await)
    generateFramesInBackground(chain, tasksToGenerate, model);
  } catch (error: any) {
    console.error('Error starting frame generation:', error);
    res.status(500).json({ error: error.message || 'Failed to start frame generation' });
  }
};

// Background frame generation helper
async function generateFramesInBackground(
  chain: any,
  tasks: { segmentId: string; frameType: 'first' | 'last' }[],
  model?: string
) {
  const characterReferences = chain.characters
    .map((cc: any) => cc.character)
    .filter((c: any) => c.primaryImageUrl);

  for (const task of tasks) {
    try {
      const segment = chain.segments.find((s: any) => s.id === task.segmentId);
      if (!segment) continue;

      const prompt =
        task.frameType === 'first' ? segment.firstFramePrompt : segment.lastFramePrompt;
      if (!prompt) continue;

      console.log(`[SceneChain] Generating ${task.frameType} frame for segment ${task.segmentId}`);

      const options: any = {
        mode: 'text_to_image',
        prompt: prompt,
        aspectRatio: chain.aspectRatio || '16:9',
        model: model || 'fal-ai/flux/dev', // Default to Flux Dev for T2I
      };

      // Add character references
      if (characterReferences.length > 0) {
        options.elementReferences = characterReferences.map((c: any) => c.primaryImageUrl);
        options.elementStrength = characterReferences[0]?.faceWeight || 0.7;

        const triggerWords = characterReferences
          .filter((c: any) => c.triggerWord)
          .map((c: any) => c.triggerWord);
        if (triggerWords.length > 0) {
          options.prompt = `${triggerWords.join(', ')}, ${options.prompt}`;
        }
      }

      const result = await generationService.generateImage(options);

      // Extract URL
      let outputUrl: string | null = null;
      const resultAny = result as any;

      if (result.outputs && result.outputs.length > 0) {
        const firstOutput = result.outputs[0];
        if (typeof firstOutput === 'string') {
          outputUrl = firstOutput;
        } else if (firstOutput && typeof firstOutput === 'object') {
          const urlCandidate = (firstOutput as any).url;
          if (typeof urlCandidate === 'string') {
            outputUrl = urlCandidate;
          }
        }
      }
      if (!outputUrl && typeof resultAny.url === 'string') {
        outputUrl = resultAny.url;
      }
      if (!outputUrl && resultAny.images?.[0]?.url) {
        outputUrl = resultAny.images[0].url;
      }

      if (outputUrl) {
        const updateData =
          task.frameType === 'first' ? { firstFrameUrl: outputUrl } : { lastFrameUrl: outputUrl };

        await prisma.sceneChainSegment.update({
          where: { id: task.segmentId },
          data: updateData,
        });

        console.log(`[SceneChain] Generated ${task.frameType} frame for segment ${task.segmentId}`);
      }
    } catch (error) {
      console.error(
        `[SceneChain] Error generating ${task.frameType} frame for segment ${task.segmentId}:`,
        error
      );
    }
  }
}
