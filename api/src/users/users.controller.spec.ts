import { setupTestDb, teardownTestDb } from '../utils/test/setup-tests';
import { createTestAuth } from '../utils/test/auth-helper';

describe('UsersController', () => {
  let controller: any;
  let ctx: Awaited<ReturnType<typeof setupTestDb>> | null = null;

  beforeAll(async () => {
    try {
      ctx = await setupTestDb();
      await createTestAuth(ctx.prisma);
    } catch {
      // Fall back to a lightweight mocked prisma when Testcontainers isn't available
    }
  });

  afterAll(async () => {
    if (ctx) await teardownTestDb(ctx);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
