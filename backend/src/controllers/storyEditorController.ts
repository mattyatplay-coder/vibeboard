/**
 * Story Editor Controller
 *
 * Handles API endpoints for the script-to-storyboard pipeline.
 */

import { Request, Response } from 'express';
import {
  StoryEditorService,
  Genre,
  AIDirectorConfig,
  StoryOutline,
} from '../services/StoryEditorService';
import { prisma } from '../prisma';

/**
 * Get service instance with appropriate content mode
 * @param matureContent - When true, uses Dolphin (uncensored) for adult content
 */
const getService = (matureContent: boolean = false) => {
  return new StoryEditorService(matureContent);
};

/**
 * Generate a story outline from a concept
 * POST /api/story-editor/outline
 */
export async function generateOutline(req: Request, res: Response) {
  try {
    const { concept, genre, numberOfActs = 3, targetDuration, allowNSFW } = req.body;

    if (!concept || !genre) {
      return res.status(400).json({
        error: 'Missing required fields: concept, genre',
      });
    }

    const service = getService(allowNSFW === true);
    const outline = await service.generateOutline(
      concept,
      genre as Genre,
      numberOfActs,
      targetDuration // Pass target duration in seconds
    );

    res.json(outline);
  } catch (error) {
    console.error('Failed to generate outline:', error);
    res.status(500).json({
      error: 'Failed to generate outline',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Generate a script from an outline
 * POST /api/story-editor/script
 */
export async function generateScript(req: Request, res: Response) {
  try {
    const { outline, genre, style, allowNSFW } = req.body;

    if (!outline || !genre) {
      return res.status(400).json({
        error: 'Missing required fields: outline, genre',
      });
    }

    const service = getService(allowNSFW === true);
    const script = await service.generateScript(outline as StoryOutline, genre as Genre, style);

    res.json({ script });
  } catch (error) {
    console.error('Failed to generate script:', error);
    res.status(500).json({
      error: 'Failed to generate script',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Parse a script into structured format
 * POST /api/story-editor/parse
 */
export async function parseScript(req: Request, res: Response) {
  try {
    const { scriptText } = req.body;

    if (!scriptText) {
      return res.status(400).json({
        error: 'Missing required field: scriptText',
      });
    }

    console.log('Parsing script of length:', scriptText.length);

    const service = getService();
    const parsed = service.parseScript(scriptText);

    console.log(`Parsed ${parsed.scenes.length} scenes from script`);

    res.json(parsed);
  } catch (error) {
    console.error('Failed to parse script:', error);
    res.status(500).json({
      error: 'Failed to parse script',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Break down a scene into shots
 * POST /api/story-editor/breakdown
 */
export async function breakdownScene(req: Request, res: Response) {
  try {
    const { sceneNumber, heading, sceneText, genre, config, allowNSFW } = req.body;
    const matureContent = allowNSFW === true || config?.allowNSFW === true;

    if (!heading || !sceneText || !genre) {
      return res.status(400).json({
        error: 'Missing required fields: heading, sceneText, genre',
      });
    }

    console.log(`Breaking down scene ${sceneNumber}:`, heading?.location || heading);

    const service = getService(matureContent);
    const breakdown = await service.breakdownScene(
      sceneNumber || 1,
      heading,
      sceneText,
      genre as Genre,
      config || {}
    );

    console.log(
      `Scene ${sceneNumber} breakdown has ${breakdown.suggestedShots?.length || 0} shots`
    );

    res.json(breakdown);
  } catch (error) {
    console.error('Failed to breakdown scene:', error);
    res.status(500).json({
      error: 'Failed to breakdown scene',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Generate prompts for shots
 * POST /api/story-editor/prompts
 */
export async function generatePrompts(req: Request, res: Response) {
  try {
    const { shots, sceneHeading, genre, style, allowNSFW, characters } = req.body;

    console.log(
      `Generating prompts for ${shots?.length || 0} shots, heading:`,
      sceneHeading?.location || sceneHeading
    );
    if (characters?.length) {
      console.log(
        `With ${characters.length} character references:`,
        characters.map((c: any) => c.name).join(', ')
      );
    }

    if (!shots || !sceneHeading || !genre) {
      console.error(
        'Missing required fields - shots:',
        !!shots,
        'sceneHeading:',
        !!sceneHeading,
        'genre:',
        !!genre
      );
      return res.status(400).json({
        error: 'Missing required fields: shots, sceneHeading, genre',
      });
    }

    const service = getService(allowNSFW === true);
    const prompts = await service.generatePrompts(
      shots,
      sceneHeading,
      genre as Genre,
      style,
      allowNSFW,
      characters
    );

    console.log(`Generated ${prompts?.length || 0} prompts`);

    res.json(prompts);
  } catch (error) {
    console.error('Failed to generate prompts:', error);
    res.status(500).json({
      error: 'Failed to generate prompts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Enhance a single prompt with genre style
 * POST /api/story-editor/enhance-prompt
 */
export async function enhancePrompt(req: Request, res: Response) {
  try {
    const { prompt, genre, cameraPresetId, allowNSFW } = req.body;

    if (!prompt || !genre) {
      return res.status(400).json({
        error: 'Missing required fields: prompt, genre',
      });
    }

    const service = getService(allowNSFW === true);
    const enhanced = await service.enhancePrompt(prompt, genre as Genre, cameraPresetId);

    res.json({ enhancedPrompt: enhanced });
  } catch (error) {
    console.error('Failed to enhance prompt:', error);
    res.status(500).json({
      error: 'Failed to enhance prompt',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Full pipeline: Concept to Storyboard
 * POST /api/story-editor/full-pipeline
 */
export async function fullPipeline(req: Request, res: Response) {
  try {
    const { concept, genre, config, allowNSFW } = req.body;
    const matureContent = allowNSFW === true || config?.allowNSFW === true;

    if (!concept || !genre) {
      return res.status(400).json({
        error: 'Missing required fields: concept, genre',
      });
    }

    const service = getService(matureContent);
    const result = await service.conceptToStoryboard(concept, genre as Genre, config || {});

    res.json(result);
  } catch (error) {
    console.error('Failed to run full pipeline:', error);
    res.status(500).json({
      error: 'Failed to run full pipeline',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Stream the full pipeline with progress updates
 * POST /api/story-editor/full-pipeline/stream
 */
export async function fullPipelineStream(req: Request, res: Response) {
  try {
    const { concept, genre, config, allowNSFW } = req.body;
    const matureContent = allowNSFW === true || config?.allowNSFW === true;

    if (!concept || !genre) {
      return res.status(400).json({
        error: 'Missing required fields: concept, genre',
      });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const service = getService(matureContent);

    // Step 1: Generate outline
    sendEvent('progress', {
      step: 'outline',
      status: 'in_progress',
      message: 'Generating story outline...',
    });
    const outline = await service.generateOutline(concept, genre as Genre);
    sendEvent('progress', { step: 'outline', status: 'complete', data: outline });

    // Step 2: Generate script
    sendEvent('progress', {
      step: 'script',
      status: 'in_progress',
      message: 'Writing screenplay...',
    });
    const script = await service.generateScript(outline, genre as Genre, config?.style);
    sendEvent('progress', { step: 'script', status: 'complete', data: { script } });

    // Step 3: Parse script
    sendEvent('progress', {
      step: 'parse',
      status: 'in_progress',
      message: 'Parsing screenplay into scenes...',
    });
    const { scenes: sceneHeadings, sceneTexts } = service.parseScript(script);
    sendEvent('progress', {
      step: 'parse',
      status: 'complete',
      data: { sceneCount: sceneHeadings.length },
    });

    // Step 4: Break down scenes
    sendEvent('progress', {
      step: 'breakdown',
      status: 'in_progress',
      message: 'Breaking down scenes into shots...',
    });
    const sceneBreakdowns = [];
    for (let i = 0; i < sceneHeadings.length; i++) {
      sendEvent('progress', {
        step: 'breakdown',
        status: 'in_progress',
        message: `Breaking down scene ${i + 1}/${sceneHeadings.length}...`,
      });

      const breakdown = await service.breakdownScene(
        i + 1,
        sceneHeadings[i],
        sceneTexts[i] || '',
        genre as Genre,
        config || {}
      );
      sceneBreakdowns.push(breakdown);

      sendEvent('scene', { sceneNumber: i + 1, breakdown });
    }
    sendEvent('progress', {
      step: 'breakdown',
      status: 'complete',
      data: { totalScenes: sceneBreakdowns.length },
    });

    // Step 5: Generate prompts
    sendEvent('progress', {
      step: 'prompts',
      status: 'in_progress',
      message: 'Generating image/video prompts...',
    });
    const allPrompts = [];
    for (let i = 0; i < sceneBreakdowns.length; i++) {
      const prompts = await service.generatePrompts(
        sceneBreakdowns[i].suggestedShots,
        sceneHeadings[i],
        genre as Genre,
        config?.style
      );
      allPrompts.push(...prompts);

      sendEvent('prompts', { sceneNumber: i + 1, prompts });
    }
    sendEvent('progress', {
      step: 'prompts',
      status: 'complete',
      data: { totalPrompts: allPrompts.length },
    });

    // Final result
    sendEvent('complete', {
      outline,
      script,
      scenes: sceneBreakdowns,
      prompts: allPrompts,
    });

    res.end();
  } catch (error) {
    console.error('Failed to run streamed pipeline:', error);

    // If headers already sent, send error event
    if (res.headersSent) {
      res.write(`event: error\n`);
      res.write(
        `data: ${JSON.stringify({
          error: 'Pipeline failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        })}\n\n`
      );
      res.end();
    } else {
      res.status(500).json({
        error: 'Failed to run pipeline',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Extract characters, locations, and props from a script and create Element placeholders
 * POST /api/story-editor/auto-breakdown
 *
 * This is the "Script Lab" feature that populates the Asset Bin with
 * placeholder elements extracted from the screenplay.
 */
export async function autoBreakdownAssets(req: Request, res: Response) {
  try {
    const { projectId, script, outline } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    if (!script && !outline) {
      return res.status(400).json({ error: 'Either script or outline is required' });
    }

    console.log(`[Script Lab] Auto-breakdown for project ${projectId}`);

    const { prisma } = await import('../prisma');
    const { LLMService } = await import('../services/LLMService');

    const llmService = new LLMService('grok');

    // Build analysis prompt
    const analysisPrompt = `Analyze this screenplay/outline and extract ALL production assets needed.

${script ? `SCREENPLAY:\n${script}` : ''}
${outline ? `OUTLINE:\n${JSON.stringify(outline, null, 2)}` : ''}

Return a JSON object with:
{
    "characters": [
        { "name": "Character Name", "role": "protagonist|antagonist|supporting|minor", "description": "Visual description for AI generation" }
    ],
    "locations": [
        { "name": "Location Name", "description": "Visual description of the location" }
    ],
    "props": [
        { "name": "Prop Name", "description": "Description of the prop/object" }
    ]
}

RULES:
1. Extract EVERY named character mentioned
2. Extract ALL locations (INT/EXT scene headings)
3. Extract significant props mentioned in action lines
4. Descriptions should be vivid enough for AI image generation
5. Only return valid JSON, no other text`;

    const llmResponse = await llmService.generate({
      prompt: analysisPrompt,
      systemPrompt:
        'You are a Line Producer extracting production assets from a screenplay. Return only valid JSON.',
      temperature: 0.3,
      maxTokens: 4000,
    });

    // Parse the LLM response
    let assets: { characters: any[]; locations: any[]; props: any[] } = {
      characters: [],
      locations: [],
      props: [],
    };

    try {
      const jsonMatch = llmResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        assets = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('[Script Lab] Failed to parse LLM response:', parseError);
    }

    // Create Element placeholders in the database
    const createdElements: any[] = [];
    const errors: string[] = [];

    console.log(`[Script Lab] Parsed assets: ${JSON.stringify(assets, null, 2)}`);

    // 1. Create Character elements
    for (const char of assets.characters || []) {
      try {
        const element = await prisma.element.upsert({
          where: {
            projectId_name: {
              projectId,
              name: char.name,
            },
          },
          create: {
            projectId,
            name: char.name,
            type: 'character',
            fileUrl: '', // Placeholder - to be generated
            metadata: JSON.stringify({
              role: char.role,
              description: char.description,
              status: 'pending',
              source: 'script-lab',
            }),
          },
          update: {
            metadata: JSON.stringify({
              role: char.role,
              description: char.description,
              status: 'pending',
              source: 'script-lab',
            }),
          },
        });
        createdElements.push({ ...element, assetType: 'character' });
        console.log(`[Script Lab] Created character: ${char.name}`);
      } catch (e: any) {
        const errMsg = `Character "${char.name}": ${e.message || e}`;
        console.error(`[Script Lab] ${errMsg}`);
        errors.push(errMsg);
      }
    }

    // 2. Create Location elements
    for (const loc of assets.locations || []) {
      try {
        const element = await prisma.element.upsert({
          where: {
            projectId_name: {
              projectId,
              name: loc.name,
            },
          },
          create: {
            projectId,
            name: loc.name,
            type: 'location',
            fileUrl: '', // Placeholder - to be generated
            metadata: JSON.stringify({
              description: loc.description,
              status: 'pending',
              source: 'script-lab',
            }),
          },
          update: {
            metadata: JSON.stringify({
              description: loc.description,
              status: 'pending',
              source: 'script-lab',
            }),
          },
        });
        createdElements.push({ ...element, assetType: 'location' });
        console.log(`[Script Lab] Created location: ${loc.name}`);
      } catch (e: any) {
        const errMsg = `Location "${loc.name}": ${e.message || e}`;
        console.error(`[Script Lab] ${errMsg}`);
        errors.push(errMsg);
      }
    }

    // 3. Create Prop elements
    for (const prop of assets.props || []) {
      try {
        const element = await prisma.element.upsert({
          where: {
            projectId_name: {
              projectId,
              name: prop.name,
            },
          },
          create: {
            projectId,
            name: prop.name,
            type: 'prop',
            fileUrl: '', // Placeholder - to be generated
            metadata: JSON.stringify({
              description: prop.description,
              status: 'pending',
              source: 'script-lab',
            }),
          },
          update: {
            metadata: JSON.stringify({
              description: prop.description,
              status: 'pending',
              source: 'script-lab',
            }),
          },
        });
        createdElements.push({ ...element, assetType: 'prop' });
        console.log(`[Script Lab] Created prop: ${prop.name}`);
      } catch (e: any) {
        const errMsg = `Prop "${prop.name}": ${e.message || e}`;
        console.error(`[Script Lab] ${errMsg}`);
        errors.push(errMsg);
      }
    }

    console.log(
      `[Script Lab] Created ${createdElements.length} asset placeholders, ${errors.length} errors`
    );

    res.json({
      success: true,
      assetsCreated: createdElements.length,
      breakdown: {
        characters: assets.characters?.length || 0,
        locations: assets.locations?.length || 0,
        props: assets.props?.length || 0,
      },
      elements: createdElements,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[Script Lab] Auto-breakdown failed:', error);
    res.status(500).json({
      error: 'Auto-breakdown failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * P-02: Get active story generation job status for a project
 * GET /api/projects/:projectId/story/status
 *
 * Returns any active (non-complete, non-failed) story jobs so the frontend
 * can resume progress display after navigation.
 */
export async function getStoryStatus(req: Request, res: Response) {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    // Find any active jobs for this project
    const activeJobs = await prisma.storyJob.findMany({
      where: {
        projectId,
        status: {
          notIn: ['complete', 'failed'],
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    // Also get the most recent completed job for context
    const lastCompletedJob = await prisma.storyJob.findFirst({
      where: {
        projectId,
        status: 'complete',
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    // Get all saved stories for this project
    const stories = await prisma.story.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    res.json({
      hasActiveJob: activeJobs.length > 0,
      activeJobs: activeJobs.map(job => ({
        id: job.id,
        status: job.status,
        currentStep: job.currentStep,
        progress: job.progress,
        concept: job.concept,
        genre: job.genre,
        totalScenes: job.totalScenes,
        currentScene: job.currentScene,
        startedAt: job.startedAt,
        // Include partial results for resumption
        hasOutline: !!job.outline,
        hasScript: !!job.script,
        hasScenes: !!job.scenes,
        hasBreakdowns: !!job.breakdowns,
        hasPrompts: !!job.prompts,
        errorMessage: job.errorMessage,
      })),
      lastCompleted: lastCompletedJob
        ? {
            id: lastCompletedJob.id,
            completedAt: lastCompletedJob.completedAt,
            concept: lastCompletedJob.concept,
          }
        : null,
      savedStories: stories.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (error) {
    console.error('[Story Status] Failed to get status:', error);
    res.status(500).json({
      error: 'Failed to get story status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * P-02: Get full details of a specific story job (for resumption)
 * GET /api/projects/:projectId/story/jobs/:jobId
 */
export async function getStoryJob(req: Request, res: Response) {
  try {
    const { projectId, jobId } = req.params;

    const job = await prisma.storyJob.findFirst({
      where: {
        id: jobId,
        projectId,
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Parse JSON fields for full response
    res.json({
      id: job.id,
      projectId: job.projectId,
      storyId: job.storyId,
      concept: job.concept,
      genre: job.genre,
      config: job.config ? JSON.parse(job.config) : null,
      status: job.status,
      currentStep: job.currentStep,
      progress: job.progress,
      totalScenes: job.totalScenes,
      currentScene: job.currentScene,
      outline: job.outline ? JSON.parse(job.outline) : null,
      script: job.script,
      scenes: job.scenes ? JSON.parse(job.scenes) : null,
      breakdowns: job.breakdowns ? JSON.parse(job.breakdowns) : null,
      prompts: job.prompts ? JSON.parse(job.prompts) : null,
      errorMessage: job.errorMessage,
      errorStep: job.errorStep,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    });
  } catch (error) {
    console.error('[Story Job] Failed to get job:', error);
    res.status(500).json({
      error: 'Failed to get story job',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
