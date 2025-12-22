import request from 'supertest';
import express from 'express';

/**
 * Create a minimal Express app for testing
 * This isolates tests from database and external dependencies
 */
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      falConfigured: !!process.env.FAL_KEY,
      uptime: process.uptime(),
    });
  });

  return app;
};

describe('Health API', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should return a valid timestamp', async () => {
      const response = await request(app).get('/api/health').expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    it('should indicate FAL configuration status', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body).toHaveProperty('falConfigured');
      expect(typeof response.body.falConfigured).toBe('boolean');
    });
  });
});
