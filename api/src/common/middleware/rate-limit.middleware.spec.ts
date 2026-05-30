import express from 'express';
import request from 'supertest';
import { closeRedisClient, redis } from '../../lib/redis';
import { setupRedisTestContainer } from '../../utils/test/setup-tests';
import { RateLimitMiddleware } from './rate-limit.middleware';

describe('RateLimitMiddleware', () => {
  let redisContainer: Awaited<ReturnType<typeof setupRedisTestContainer>>;
  let app: express.Express;

  beforeAll(async () => {
    redisContainer = await setupRedisTestContainer();

    app = express();
    app.set('trust proxy', true);
    app.use((req, res, next) => new RateLimitMiddleware().use(req, res, next));
    app.get('/admin/stats', (_req, res) => res.status(200).json({ ok: true }));
    app.get('/courses', (_req, res) => res.status(200).json({ ok: true }));
  });

  afterAll(async () => {
    await closeRedisClient();
    await redisContainer.stop();
  });

  beforeEach(async () => {
    await redis.del('rate-limit:127.0.0.1');
  });

  it('skips exempt routes without rate limiting', async () => {
    await request(app)
      .get('/admin/stats')
      .set('x-forwarded-for', '127.0.0.1')
      .expect(200);
  });

  it('allows requests under the limit', async () => {
    await request(app)
      .get('/courses')
      .set('x-forwarded-for', '127.0.0.1')
      .expect(200);
  });

  it('returns 429 after the request limit is exceeded', async () => {
    for (let i = 0; i < 61; i += 1) {
      const response = await request(app)
        .get('/courses')
        .set('x-forwarded-for', '127.0.0.1');

      if (i < 60) {
        expect(response.status).toBe(200);
      } else {
        expect(response.status).toBe(429);
        expect(response.body).toEqual({
          statusCode: 429,
          message: 'Too many requests. Please try again later.',
          error: 'Too Many Requests',
        });
      }
    }
  });
});
