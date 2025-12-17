import request from 'supertest';
import express from 'express';

// Create a minimal test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
};

describe('API Health Check', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  it('should return health status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('API Response Format', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  it('should return JSON content type', async () => {
    const response = await request(app).get('/api/health');
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });
});
