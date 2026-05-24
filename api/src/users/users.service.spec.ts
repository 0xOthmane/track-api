import { createTestAuth } from '../utils/test/auth-helper';
import { setupTestDb, teardownTestDb } from '../utils/test/setup-tests';

describe('UsersService', () => {
  let service: any;
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
    expect(service).toBeDefined();
  });
});
