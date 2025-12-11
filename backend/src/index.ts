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
import modelParameterRoutes from './routes/modelParameterRoutes';
import llmRoutes from './routes/llmRoutes';
import providerRoutes from './routes/providerRoutes';
import promptRoutes from './routes/promptRoutes';
import globalLoraRoutes from './routes/globalLoraRoutes';
import path from 'path';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/projects', projectRoutes);
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
// Nested route for parameters: /api/projects/:projectId/parameters
app.use('/api/projects/:projectId/parameters', modelParameterRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/library', globalLoraRoutes); // Global LoRA library (not project-specific)
app.get('/api/elements', require('./controllers/elementController').getAllElements);

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        falConfigured: !!process.env.FAL_KEY
    });
});

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});

// Keep process alive
setInterval(() => { }, 1000);

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
