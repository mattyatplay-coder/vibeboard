import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import projectRoutes from './routes/projectRoutes';
import elementRoutes from './routes/elementRoutes';
import generationRoutes from './routes/generationRoutes';
import sceneRoutes from './routes/sceneRoutes';
import sessionRoutes from './routes/sessionRoutes';
import loraRoutes from './routes/loraRoutes';
import workflowRoutes from './routes/workflowRoutes';
import modelParameterRoutes from './routes/modelParameterRoutes';
import llmRoutes from './routes/llmRoutes';
import providerRoutes from './routes/providerRoutes';
import promptRoutes from './routes/promptRoutes';
import storyEditorRoutes from './routes/storyEditorRoutes';
import storyStyleRoutes from './routes/storyStyleRoutes';
import storyRoutes from './routes/storyRoutes';
import extendVideoRoutes from './routes/extendVideoRoutes';
import continuityRoutes from './routes/continuityRoutes';
import lightingRoutes from './routes/lightingRoutes';
import renderQueueRoutes from './routes/renderQueueRoutes';
import searchRoutes from './routes/searchRoutes';
import path from 'path';
import { validateStorage, getStorageStatus } from './utils/storageValidation';

import processingRoutes from './routes/processingRoutes';
import trainingRoutes from './routes/trainingRoutes';

// Validate storage before starting server
try {
  validateStorage();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error('\n⚠️  Server startup aborted due to storage validation failure.');
  console.error('   Please ensure the network drive is mounted and try again.\n');
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Debug Middleware: Log all requests
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/datasets', express.static(path.join(process.cwd(), 'datasets')));

app.use('/api/projects', projectRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/process', processingRoutes);
// Nested route for elements: /api/projects/:projectId/elements
app.use('/api/projects/:projectId/elements', elementRoutes);
// Nested route for generations: /api/projects/:projectId/generations
app.use('/api/projects/:projectId/generations', generationRoutes);
// Nested route for scenes: /api/projects/:projectId/scenes
app.use('/api/projects/:projectId/scenes', sceneRoutes);
// Nested route for sessions: /api/projects/:projectId/sessions
app.use('/api/projects/:projectId/sessions', sessionRoutes);
// Nested route for loras: /api/projects/:projectId/loras
app.use('/api/projects/:projectId/loras', loraRoutes);
// Nested route for workflows: /api/projects/:projectId/workflows
app.use('/api/projects/:projectId/workflows', workflowRoutes);
// Nested route for parameters: /api/projects/:projectId/parameters
app.use('/api/projects/:projectId/parameters', modelParameterRoutes);
import backupRoutes from './routes/backupRoutes';
app.use('/api/projects/:projectId/backup', backupRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/story-editor', storyEditorRoutes);
app.use('/api/story-style', storyStyleRoutes);
// Nested route for stories: /api/projects/:projectId/stories
app.use('/api/projects/:projectId/stories', storyRoutes);
// Video extension workflow routes
app.use('/api/extend-video', extendVideoRoutes);
// Continuity checking routes
app.use('/api/continuity', continuityRoutes);
// Virtual Gaffer lighting analysis
app.use('/api/lighting', lightingRoutes);
// Multi-Pass Render Queue
app.use('/api/projects/:projectId/render-queue', renderQueueRoutes);
// Semantic Search
app.use('/api', searchRoutes);
app.get('/api/elements', require('./controllers/elementController').getAllElements);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    falConfigured: !!process.env.FAL_KEY,
    storage: getStorageStatus(),
  });
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

// Keep process alive
setInterval(() => {}, 1000);

process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
