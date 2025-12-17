import request from 'supertest';
import express from 'express';

/**
 * Mock generation data for testing
 */
const mockGenerations = [
    {
        id: 'gen-1',
        projectId: 'proj-1',
        prompt: 'A beautiful sunset over mountains',
        status: 'completed',
        imageUrl: '/outputs/gen1.png',
        videoUrl: null,
        provider: 'fal',
        model: 'flux-pro',
        parameters: { guidance: 7.5, steps: 30 },
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'gen-2',
        projectId: 'proj-1',
        prompt: 'A cyberpunk city at night',
        status: 'pending',
        imageUrl: null,
        videoUrl: null,
        provider: 'fal',
        model: 'flux-dev',
        parameters: { guidance: 10, steps: 50 },
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

/**
 * Create a test Express app with mocked generation routes
 */
const createTestApp = () => {
    const app = express();
    app.use(express.json());
    let generations = [...mockGenerations];

    // GET /api/projects/:projectId/generations - List generations
    app.get('/api/projects/:projectId/generations', (req, res) => {
        const projectGenerations = generations.filter(g => g.projectId === req.params.projectId);
        res.json(projectGenerations);
    });

    // GET /api/projects/:projectId/generations/:id - Get single generation
    app.get('/api/projects/:projectId/generations/:id', (req, res) => {
        const generation = generations.find(g => g.id === req.params.id && g.projectId === req.params.projectId);
        if (!generation) {
            return res.status(404).json({ error: 'Generation not found' });
        }
        res.json(generation);
    });

    // POST /api/projects/:projectId/generations - Create new generation
    app.post('/api/projects/:projectId/generations', (req, res) => {
        const { prompt, provider, model, parameters } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        const newGeneration = {
            id: `gen-${Date.now()}`,
            projectId: req.params.projectId,
            prompt,
            status: 'pending',
            imageUrl: null,
            videoUrl: null,
            provider: provider || 'fal',
            model: model || 'flux-pro',
            parameters: parameters || {},
            metadata: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        generations.push(newGeneration);
        res.status(201).json(newGeneration);
    });

    // PUT /api/projects/:projectId/generations/:id - Update generation
    app.put('/api/projects/:projectId/generations/:id', (req, res) => {
        const index = generations.findIndex(g => g.id === req.params.id && g.projectId === req.params.projectId);
        if (index === -1) {
            return res.status(404).json({ error: 'Generation not found' });
        }
        generations[index] = {
            ...generations[index],
            ...req.body,
            updatedAt: new Date().toISOString(),
        };
        res.json(generations[index]);
    });

    // DELETE /api/projects/:projectId/generations/:id - Delete generation
    app.delete('/api/projects/:projectId/generations/:id', (req, res) => {
        const index = generations.findIndex(g => g.id === req.params.id && g.projectId === req.params.projectId);
        if (index === -1) {
            return res.status(404).json({ error: 'Generation not found' });
        }
        generations.splice(index, 1);
        res.status(204).send();
    });

    // POST /api/projects/:projectId/generations/:id/retry - Retry failed generation
    app.post('/api/projects/:projectId/generations/:id/retry', (req, res) => {
        const index = generations.findIndex(g => g.id === req.params.id && g.projectId === req.params.projectId);
        if (index === -1) {
            return res.status(404).json({ error: 'Generation not found' });
        }
        generations[index].status = 'pending';
        generations[index].updatedAt = new Date().toISOString();
        res.json(generations[index]);
    });

    return app;
};

describe('Generations API', () => {
    let app: express.Application;

    beforeEach(() => {
        app = createTestApp();
    });

    describe('GET /api/projects/:projectId/generations', () => {
        it('should return generations for a project', async () => {
            const response = await request(app)
                .get('/api/projects/proj-1/generations')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);
        });

        it('should return generations with correct structure', async () => {
            const response = await request(app)
                .get('/api/projects/proj-1/generations')
                .expect(200);

            const generation = response.body[0];
            expect(generation).toHaveProperty('id');
            expect(generation).toHaveProperty('prompt');
            expect(generation).toHaveProperty('status');
            expect(generation).toHaveProperty('provider');
            expect(generation).toHaveProperty('model');
            expect(generation).toHaveProperty('parameters');
        });
    });

    describe('GET /api/projects/:projectId/generations/:id', () => {
        it('should return a specific generation', async () => {
            const response = await request(app)
                .get('/api/projects/proj-1/generations/gen-1')
                .expect(200);

            expect(response.body.id).toBe('gen-1');
            expect(response.body.prompt).toBe('A beautiful sunset over mountains');
            expect(response.body.status).toBe('completed');
        });

        it('should return 404 for non-existent generation', async () => {
            await request(app)
                .get('/api/projects/proj-1/generations/non-existent')
                .expect(404);
        });
    });

    describe('POST /api/projects/:projectId/generations', () => {
        it('should create a new generation', async () => {
            const newGeneration = {
                prompt: 'A dragon flying over a castle',
                provider: 'fal',
                model: 'flux-pro',
                parameters: { guidance: 8 },
            };

            const response = await request(app)
                .post('/api/projects/proj-1/generations')
                .send(newGeneration)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.prompt).toBe(newGeneration.prompt);
            expect(response.body.status).toBe('pending');
            expect(response.body.projectId).toBe('proj-1');
        });

        it('should require prompt', async () => {
            await request(app)
                .post('/api/projects/proj-1/generations')
                .send({ provider: 'fal' })
                .expect(400);
        });

        it('should use default provider and model if not provided', async () => {
            const response = await request(app)
                .post('/api/projects/proj-1/generations')
                .send({ prompt: 'Test prompt' })
                .expect(201);

            expect(response.body.provider).toBe('fal');
            expect(response.body.model).toBe('flux-pro');
        });
    });

    describe('PUT /api/projects/:projectId/generations/:id', () => {
        it('should update a generation', async () => {
            const updates = {
                status: 'completed',
                imageUrl: '/outputs/updated.png',
            };

            const response = await request(app)
                .put('/api/projects/proj-1/generations/gen-2')
                .send(updates)
                .expect(200);

            expect(response.body.status).toBe('completed');
            expect(response.body.imageUrl).toBe('/outputs/updated.png');
        });
    });

    describe('DELETE /api/projects/:projectId/generations/:id', () => {
        it('should delete a generation', async () => {
            await request(app)
                .delete('/api/projects/proj-1/generations/gen-1')
                .expect(204);

            await request(app)
                .get('/api/projects/proj-1/generations/gen-1')
                .expect(404);
        });
    });

    describe('POST /api/projects/:projectId/generations/:id/retry', () => {
        it('should reset generation status to pending', async () => {
            const response = await request(app)
                .post('/api/projects/proj-1/generations/gen-1/retry')
                .expect(200);

            expect(response.body.status).toBe('pending');
        });

        it('should return 404 for non-existent generation', async () => {
            await request(app)
                .post('/api/projects/proj-1/generations/non-existent/retry')
                .expect(404);
        });
    });
});
