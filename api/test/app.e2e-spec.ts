import request from 'supertest';
import {
  bootstrapE2E,
  teardownE2E,
  resetDatabase,
} from './e2e-helpers';

describe('App (e2e)', () => {
  const e2eState: {
    ctx: Awaited<ReturnType<typeof bootstrapE2E>> | null;
  } = { ctx: null };

  beforeAll(async () => {
    e2eState.ctx = await bootstrapE2E();
  });

  beforeEach(async () => {
    if (e2eState.ctx) {
      await resetDatabase(e2eState.ctx.prisma);
    }
  });

  afterAll(async () => {
    await teardownE2E(e2eState.ctx);
  });

  it('GET /health returns ok and correlation id', async () => {
    const response = await request(e2eState.ctx!.app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['x-correlation-id']).toBeDefined();
  });
});
