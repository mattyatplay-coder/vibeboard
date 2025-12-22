import request from 'supertest';
import express from 'express';

/**
 * Mock element data for testing
 */
const mockElements = [
  {
    id: 'elem-1',
    projectId: 'proj-1',
    name: 'Character 1',
    type: 'character',
    fileUrl: '/uploads/char1.png',
    isFavorite: false,
    tags: ['hero', 'protagonist'],
    metadata: { style: 'anime' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'elem-2',
    projectId: 'proj-1',
    name: 'Background Forest',
    type: 'prop',
    fileUrl: '/uploads/forest.png',
    isFavorite: true,
    tags: ['nature', 'environment'],
    metadata: { style: 'realistic' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Create a test Express app with mocked element routes
 */
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  let elements = [...mockElements];

  // Middleware to extract projectId
  app.use('/api/projects/:projectId/elements', (req, res, next) => {
    req.params.projectId = req.params.projectId;
    next();
  });

  // GET /api/projects/:projectId/elements - List elements for a project
  app.get('/api/projects/:projectId/elements', (req, res) => {
    const projectElements = elements.filter(e => e.projectId === req.params.projectId);
    res.json(projectElements);
  });

  // GET /api/projects/:projectId/elements/:id - Get single element
  app.get('/api/projects/:projectId/elements/:id', (req, res) => {
    const element = elements.find(
      e => e.id === req.params.id && e.projectId === req.params.projectId
    );
    if (!element) {
      return res.status(404).json({ error: 'Element not found' });
    }
    res.json(element);
  });

  // POST /api/projects/:projectId/elements - Create new element
  app.post('/api/projects/:projectId/elements', (req, res) => {
    const { name, type, fileUrl, tags, metadata } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }
    const newElement = {
      id: `elem-${Date.now()}`,
      projectId: req.params.projectId,
      name,
      type,
      fileUrl: fileUrl || '',
      isFavorite: false,
      tags: tags || [],
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    elements.push(newElement);
    res.status(201).json(newElement);
  });

  // PUT /api/projects/:projectId/elements/:id - Update element
  app.put('/api/projects/:projectId/elements/:id', (req, res) => {
    const index = elements.findIndex(
      e => e.id === req.params.id && e.projectId === req.params.projectId
    );
    if (index === -1) {
      return res.status(404).json({ error: 'Element not found' });
    }
    elements[index] = {
      ...elements[index],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    res.json(elements[index]);
  });

  // DELETE /api/projects/:projectId/elements/:id - Delete element
  app.delete('/api/projects/:projectId/elements/:id', (req, res) => {
    const index = elements.findIndex(
      e => e.id === req.params.id && e.projectId === req.params.projectId
    );
    if (index === -1) {
      return res.status(404).json({ error: 'Element not found' });
    }
    elements.splice(index, 1);
    res.status(204).send();
  });

  // PATCH /api/projects/:projectId/elements/:id/favorite - Toggle favorite
  app.patch('/api/projects/:projectId/elements/:id/favorite', (req, res) => {
    const index = elements.findIndex(
      e => e.id === req.params.id && e.projectId === req.params.projectId
    );
    if (index === -1) {
      return res.status(404).json({ error: 'Element not found' });
    }
    elements[index].isFavorite = !elements[index].isFavorite;
    elements[index].updatedAt = new Date().toISOString();
    res.json(elements[index]);
  });

  return app;
};

describe('Elements API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /api/projects/:projectId/elements', () => {
    it('should return elements for a project', async () => {
      const response = await request(app)
        .get('/api/projects/proj-1/elements')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should return empty array for project with no elements', async () => {
      const response = await request(app).get('/api/projects/proj-999/elements').expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return elements with correct structure', async () => {
      const response = await request(app).get('/api/projects/proj-1/elements').expect(200);

      const element = response.body[0];
      expect(element).toHaveProperty('id');
      expect(element).toHaveProperty('name');
      expect(element).toHaveProperty('type');
      expect(element).toHaveProperty('fileUrl');
      expect(element).toHaveProperty('isFavorite');
      expect(element).toHaveProperty('tags');
      expect(element).toHaveProperty('metadata');
    });
  });

  describe('GET /api/projects/:projectId/elements/:id', () => {
    it('should return a specific element', async () => {
      const response = await request(app).get('/api/projects/proj-1/elements/elem-1').expect(200);

      expect(response.body.id).toBe('elem-1');
      expect(response.body.name).toBe('Character 1');
    });

    it('should return 404 for non-existent element', async () => {
      await request(app).get('/api/projects/proj-1/elements/non-existent').expect(404);
    });
  });

  describe('POST /api/projects/:projectId/elements', () => {
    it('should create a new element', async () => {
      const newElement = {
        name: 'New Character',
        type: 'character',
        fileUrl: '/uploads/new.png',
        tags: ['new'],
      };

      const response = await request(app)
        .post('/api/projects/proj-1/elements')
        .send(newElement)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newElement.name);
      expect(response.body.projectId).toBe('proj-1');
    });

    it('should require name and type', async () => {
      await request(app)
        .post('/api/projects/proj-1/elements')
        .send({ name: 'Only Name' })
        .expect(400);

      await request(app)
        .post('/api/projects/proj-1/elements')
        .send({ type: 'only-type' })
        .expect(400);
    });
  });

  describe('PUT /api/projects/:projectId/elements/:id', () => {
    it('should update an element', async () => {
      const updates = {
        name: 'Updated Character',
        tags: ['updated', 'hero'],
      };

      const response = await request(app)
        .put('/api/projects/proj-1/elements/elem-1')
        .send(updates)
        .expect(200);

      expect(response.body.name).toBe(updates.name);
      expect(response.body.tags).toEqual(updates.tags);
    });

    it('should return 404 for non-existent element', async () => {
      await request(app)
        .put('/api/projects/proj-1/elements/non-existent')
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /api/projects/:projectId/elements/:id', () => {
    it('should delete an element', async () => {
      await request(app).delete('/api/projects/proj-1/elements/elem-1').expect(204);

      // Verify element is deleted
      await request(app).get('/api/projects/proj-1/elements/elem-1').expect(404);
    });
  });

  describe('PATCH /api/projects/:projectId/elements/:id/favorite', () => {
    it('should toggle favorite status', async () => {
      // First toggle - should become true
      const response1 = await request(app)
        .patch('/api/projects/proj-1/elements/elem-1/favorite')
        .expect(200);

      expect(response1.body.isFavorite).toBe(true);

      // Second toggle - should become false
      const response2 = await request(app)
        .patch('/api/projects/proj-1/elements/elem-1/favorite')
        .expect(200);

      expect(response2.body.isFavorite).toBe(false);
    });
  });
});
