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

// Initialize service with default provider (can be configured via env)
const getService = () => {
  const provider = (process.env.LLM_PROVIDER || 'grok') as any;
  return new StoryEditorService(provider);
};

/**
 * Generate a story outline from a concept
 * POST /api/story-editor/outline
 */
export async function generateOutline(req: Request, res: Response) {
  try {
    const { concept, genre, numberOfActs = 3, targetDuration } = req.body;

    if (!concept || !genre) {
      return res.status(400).json({
        error: 'Missing required fields: concept, genre',
      });
    }

    const service = getService();
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
    const { outline, genre, style } = req.body;

    if (!outline || !genre) {
      return res.status(400).json({
        error: 'Missing required fields: outline, genre',
      });
    }

    const service = getService();
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
    const { sceneNumber, heading, sceneText, genre, config } = req.body;

    if (!heading || !sceneText || !genre) {
      return res.status(400).json({
        error: 'Missing required fields: heading, sceneText, genre',
      });
    }

    console.log(`Breaking down scene ${sceneNumber}:`, heading?.location || heading);

    const service = getService();
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
    const { shots, sceneHeading, genre, style, allowNSFW } = req.body;

    console.log(
      `Generating prompts for ${shots?.length || 0} shots, heading:`,
      sceneHeading?.location || sceneHeading
    );

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

    const service = getService();
    const prompts = await service.generatePrompts(
      shots,
      sceneHeading,
      genre as Genre,
      style,
      allowNSFW
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
    const { prompt, genre, cameraPresetId } = req.body;

    if (!prompt || !genre) {
      return res.status(400).json({
        error: 'Missing required fields: prompt, genre',
      });
    }

    const service = getService();
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
    const { concept, genre, config } = req.body;

    if (!concept || !genre) {
      return res.status(400).json({
        error: 'Missing required fields: concept, genre',
      });
    }

    const service = getService();
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
    const { concept, genre, config } = req.body;

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

    const service = getService();

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
