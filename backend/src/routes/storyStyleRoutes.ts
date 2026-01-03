/**
 * Story Style Routes
 *
 * API endpoints for:
 * - Genre style guides
 * - Director/Cinematographer visual styles
 * - Script analysis and training
 * - Pixar storytelling rules
 */

import { Router, Request, Response } from 'express';
import {
  PIXAR_STORYTELLING_RULES,
  DIRECTOR_STYLES,
  CINEMATOGRAPHER_STYLES,
  GENRE_GUIDES,
  getDirectorStyle,
  getDirectorsForGenre,
  getCinematographerStyle,
  getGenreGuide,
  buildStylePrefix,
  getPixarRulesForSituation,
  getAllVisualStyles,
} from '../services/story/GenreStyleGuide';
import { getScriptAnalyzer } from '../services/story/ScriptAnalyzer';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// GENRE STYLE GUIDES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/story-style/genres
 * List all available genre guides
 */
router.get('/genres', (req: Request, res: Response) => {
  const genres = Object.keys(GENRE_GUIDES).map(key => ({
    key,
    name: GENRE_GUIDES[key].genre,
    description: GENRE_GUIDES[key].description,
  }));

  res.json({ genres });
});

/**
 * GET /api/story-style/genres/:genre
 * Get detailed guide for a specific genre
 */
router.get('/genres/:genre', (req: Request, res: Response) => {
  const genre = req.params.genre.toLowerCase();
  const guide = getGenreGuide(genre);

  if (!guide) {
    return res.status(404).json({ error: `Genre guide not found: ${genre}` });
  }

  res.json(guide);
});

/**
 * GET /api/story-style/genres/:genre/directors
 * Get suggested directors for a genre
 */
router.get('/genres/:genre/directors', (req: Request, res: Response) => {
  const genre = req.params.genre;
  const directors = getDirectorsForGenre(genre);

  res.json({
    genre,
    directors: directors.map(d => ({
      key: Object.entries(DIRECTOR_STYLES).find(([, v]) => v.name === d.name)?.[0],
      name: d.name,
      knownFor: d.knownFor.slice(0, 3),
      moodKeywords: d.moodKeywords,
    })),
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DIRECTOR STYLES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/story-style/directors
 * List all available director styles
 */
router.get('/directors', (req: Request, res: Response) => {
  const directors = Object.entries(DIRECTOR_STYLES).map(([key, style]) => ({
    key,
    name: style.name,
    knownFor: style.knownFor,
    genres: style.genres,
    moodKeywords: style.moodKeywords,
  }));

  res.json({ directors });
});

/**
 * GET /api/story-style/directors/:key
 * Get detailed style guide for a specific director
 */
router.get('/directors/:key', (req: Request, res: Response) => {
  const key = req.params.key.toLowerCase();
  const style = getDirectorStyle(key);

  if (!style) {
    return res.status(404).json({ error: `Director style not found: ${key}` });
  }

  res.json(style);
});

// ═══════════════════════════════════════════════════════════════════════════
// CINEMATOGRAPHER STYLES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/story-style/cinematographers
 * List all available cinematographer styles
 */
router.get('/cinematographers', (req: Request, res: Response) => {
  const cinematographers = Object.entries(CINEMATOGRAPHER_STYLES).map(([key, style]) => ({
    key,
    name: style.name,
    knownFor: style.knownFor,
    signature: style.signature.slice(0, 3),
  }));

  res.json({ cinematographers });
});

/**
 * GET /api/story-style/cinematographers/:key
 * Get detailed style guide for a specific cinematographer
 */
router.get('/cinematographers/:key', (req: Request, res: Response) => {
  const key = req.params.key.toLowerCase();
  const style = getCinematographerStyle(key);

  if (!style) {
    return res.status(404).json({ error: `Cinematographer style not found: ${key}` });
  }

  res.json(style);
});

// ═══════════════════════════════════════════════════════════════════════════
// PIXAR RULES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/story-style/pixar-rules
 * Get all 22 Pixar storytelling rules
 */
router.get('/pixar-rules', (req: Request, res: Response) => {
  res.json({ rules: PIXAR_STORYTELLING_RULES });
});

/**
 * POST /api/story-style/pixar-rules/relevant
 * Get relevant Pixar rules for a situation
 */
router.post('/pixar-rules/relevant', (req: Request, res: Response) => {
  const { situation } = req.body;

  if (!situation) {
    return res.status(400).json({ error: 'Missing situation parameter' });
  }

  const rules = getPixarRulesForSituation(situation);

  res.json({ situation, rules });
});

// ═══════════════════════════════════════════════════════════════════════════
// STYLE BUILDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/story-style/build-prefix
 * Build a prompt prefix combining genre, director, and cinematographer styles
 */
router.post('/build-prefix', (req: Request, res: Response) => {
  const { genre, director, cinematographer } = req.body;

  if (!genre) {
    return res.status(400).json({ error: 'Genre is required' });
  }

  const prefix = buildStylePrefix(genre, director, cinematographer);
  const genreGuide = getGenreGuide(genre);

  res.json({
    promptPrefix: prefix,
    negativePrompt: genreGuide?.negativePrompt || 'low quality, blurry, distorted',
    colorPalette: genreGuide?.colorPalette || [],
    lightingMoods: genreGuide?.lightingMoods || [],
  });
});

/**
 * GET /api/story-style/all-styles
 * Get list of all available visual styles
 */
router.get('/all-styles', (req: Request, res: Response) => {
  res.json(getAllVisualStyles());
});

// ═══════════════════════════════════════════════════════════════════════════
// SCRIPT ANALYZER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/story-style/scripts
 * List all available scripts in the library
 */
router.get('/scripts', async (req: Request, res: Response) => {
  try {
    const analyzer = getScriptAnalyzer();
    const scripts = await analyzer.listAvailableScripts();
    const analyses = analyzer.getAllAnalyses();

    res.json({
      library: scripts,
      analyzedScripts: analyses.map(a => ({
        title: a.title,
        genre: a.genre,
        analyzedAt: a.analyzedAt,
      })),
    });
  } catch (error) {
    console.error('Failed to list scripts:', error);
    res.status(500).json({
      error: 'Failed to list scripts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/story-style/scripts/analyze
 * Analyze a script to extract style patterns
 */
router.post('/scripts/analyze', async (req: Request, res: Response) => {
  try {
    const { content, title, genre } = req.body;

    if (!content || !title || !genre) {
      return res.status(400).json({
        error: 'Missing required fields: content, title, genre',
      });
    }

    const analyzer = getScriptAnalyzer();
    const analysis = await analyzer.analyzeScript(content, title, genre);

    res.json(analysis);
  } catch (error) {
    console.error('Failed to analyze script:', error);
    res.status(500).json({
      error: 'Failed to analyze script',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/story-style/scripts/analysis/:title
 * Get cached analysis for a script
 */
router.get('/scripts/analysis/:title', (req: Request, res: Response) => {
  const title = decodeURIComponent(req.params.title);
  const analyzer = getScriptAnalyzer();
  const analysis = analyzer.getAnalysis(title);

  if (!analysis) {
    return res.status(404).json({ error: `No analysis found for: ${title}` });
  }

  res.json(analysis);
});

/**
 * POST /api/story-style/generate-outline
 * Generate a story outline using learned patterns
 */
router.post('/generate-outline', async (req: Request, res: Response) => {
  try {
    const {
      concept,
      targetGenre,
      scriptStyleReference,
      directorStyle,
      cinematographerStyle,
      targetLength,
      includePixarRules,
      customConstraints,
    } = req.body;

    if (!concept || !targetGenre) {
      return res.status(400).json({
        error: 'Missing required fields: concept, targetGenre',
      });
    }

    const analyzer = getScriptAnalyzer();
    const outline = await analyzer.generateStoryOutline({
      concept,
      targetGenre,
      scriptStyleReference,
      directorStyle,
      cinematographerStyle,
      targetLength: targetLength || 'medium',
      includePixarRules: includePixarRules !== false,
      customConstraints,
    });

    res.json(outline);
  } catch (error) {
    console.error('Failed to generate outline:', error);
    res.status(500).json({
      error: 'Failed to generate outline',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/story-style/generate-scene-prompts
 * Generate prompts for a specific scene
 */
router.post('/generate-scene-prompts', async (req: Request, res: Response) => {
  try {
    const { scene, visualGuide, scriptStyle } = req.body;

    if (!scene || !visualGuide) {
      return res.status(400).json({
        error: 'Missing required fields: scene, visualGuide',
      });
    }

    const analyzer = getScriptAnalyzer();
    const prompts = await analyzer.generateScenePrompts(scene, visualGuide, scriptStyle);

    res.json(prompts);
  } catch (error) {
    console.error('Failed to generate scene prompts:', error);
    res.status(500).json({
      error: 'Failed to generate scene prompts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/story-style/visual-recommendation/:genre
 * Get visual style recommendations for a genre
 */
router.get('/visual-recommendation/:genre', (req: Request, res: Response) => {
  const genre = req.params.genre;
  const analyzer = getScriptAnalyzer();
  const recommendation = analyzer.getVisualStyleRecommendation(genre);

  res.json({
    genre,
    ...recommendation,
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RAG ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/story-style/rag/search
 * Semantic search for similar scripts in the library
 */
router.post('/rag/search', async (req: Request, res: Response) => {
  try {
    const { query, genre, limit = 5, minSimilarity = 0.6 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Missing required field: query' });
    }

    const analyzer = getScriptAnalyzer();
    const results = await analyzer.findSimilarScripts(query, {
      genre,
      limit,
      minSimilarity,
    });

    res.json({
      query,
      genre: genre || 'all',
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('RAG search failed:', error);
    res.status(500).json({
      error: 'RAG search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/story-style/rag/generate
 * RAG-enhanced story generation - retrieves similar scripts for context
 */
router.post('/rag/generate', async (req: Request, res: Response) => {
  try {
    const {
      concept,
      targetGenre,
      directorStyle,
      cinematographerStyle,
      targetLength,
      includePixarRules,
      customConstraints,
      useRAG = true,
      ragTopK = 3,
    } = req.body;

    if (!concept || !targetGenre) {
      return res.status(400).json({
        error: 'Missing required fields: concept, targetGenre',
      });
    }

    const analyzer = getScriptAnalyzer();
    const outline = await analyzer.generateStoryWithRAG({
      concept,
      targetGenre,
      directorStyle,
      cinematographerStyle,
      targetLength: targetLength || 'medium',
      includePixarRules: includePixarRules !== false,
      customConstraints,
      useRAG,
      ragTopK,
    });

    res.json({
      ragEnabled: useRAG,
      outline,
    });
  } catch (error) {
    console.error('RAG generation failed:', error);
    res.status(500).json({
      error: 'RAG generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/story-style/rag/ingest
 * Ingest a script into the RAG system
 */
router.post('/rag/ingest', async (req: Request, res: Response) => {
  try {
    const { content, title, genre, subGenres, writer, year } = req.body;

    if (!content || !title || !genre) {
      return res.status(400).json({
        error: 'Missing required fields: content, title, genre',
      });
    }

    const analyzer = getScriptAnalyzer();
    const result = await analyzer.ingestScriptForRAG(content, {
      title,
      genre,
      subGenres,
      writer,
      year,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('RAG ingestion failed:', error);
    res.status(500).json({
      error: 'RAG ingestion failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/story-style/rag/stats
 * Get RAG system statistics
 */
router.get('/rag/stats', async (req: Request, res: Response) => {
  try {
    const analyzer = getScriptAnalyzer();
    const stats = await analyzer.getRAGStats();

    res.json(stats);
  } catch (error) {
    console.error('Failed to get RAG stats:', error);
    res.status(500).json({
      error: 'Failed to get RAG stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
