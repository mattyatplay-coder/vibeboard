import request from 'supertest';
import express from 'express';

/**
 * Mock project data for testing
 */
const mockProjects = [
  {
    id: 'proj-1',
    name: 'Test Project 1',
    description: 'First test project',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'proj-2',
    name: 'Test Project 2',
    description: 'Second test project',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Create a test Express app with mocked project routes
 */
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  let projects = [...mockProjects];

  // GET /api/projects - List all projects
  app.get('/api/projects', (req, res) => {
    res.json(projects);
  });

  // GET /api/projects/:id - Get single project
  app.get('/api/projects/:id', (req, res) => {
    const project = projects.find(p => p.id === req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  });

  // POST /api/projects - Create new project
  app.post('/api/projects', (req, res) => {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const newProject = {
      id: `proj-${Date.now()}`,
      name,
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    projects.push(newProject);
    res.status(201).json(newProject);
  });

  // DELETE /api/projects/:id - Delete project
  app.delete('/api/projects/:id', (req, res) => {
    const index = projects.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }
    projects.splice(index, 1);
    res.status(204).send();
  });

  return app;
};

describe('Projects API', () => {
  let app: express.Application;

  beforeEach(() => {
    // Fresh app instance for each test
    app = createTestApp();
  });

  describe('GET /api/projects', () => {
    it('should return list of projects', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should return projects with correct structure', async () => {
      const response = await request(app).get('/api/projects').expect(200);

      const project = response.body[0];
      expect(project).toHaveProperty('id');
      expect(project).toHaveProperty('name');
      expect(project).toHaveProperty('description');
      expect(project).toHaveProperty('createdAt');
      expect(project).toHaveProperty('updatedAt');
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return a specific project', async () => {
      const response = await request(app)
        .get('/api/projects/proj-1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.id).toBe('proj-1');
      expect(response.body.name).toBe('Test Project 1');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app).get('/api/projects/non-existent').expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const newProject = {
        name: 'New Test Project',
        description: 'A brand new project',
      };

      const response = await request(app)
        .post('/api/projects')
        .send(newProject)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newProject.name);
      expect(response.body.description).toBe(newProject.description);
    });

    it('should require project name', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ description: 'No name provided' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should set default description if not provided', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'Project Without Description' })
        .expect(201);

      expect(response.body.description).toBe('');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete an existing project', async () => {
      await request(app).delete('/api/projects/proj-1').expect(204);

      // Verify project is deleted
      await request(app).get('/api/projects/proj-1').expect(404);
    });

    it('should return 404 for non-existent project', async () => {
      await request(app).delete('/api/projects/non-existent').expect(404);
    });
  });
});
