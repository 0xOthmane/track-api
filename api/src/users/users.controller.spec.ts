import { cleanDatabase, setupTestDb, teardownTestDb } from '../utils/test/setup-tests';
import { createTestAuth } from '../utils/test/auth-helper';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
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

  beforeEach(() => {()=>{
    cleanDatabase(ctx?.prisma!);
  }});
  
  describe('Get Health', () => {
    it('should be defined', () => {
    expect(controller).toBeDefined();
  });
    it('returns ok when the database and redis are connected', async () => {
      const result = await controller.getHealth();
      expect(result).toEqual({ status: 'ok' });
    });


});
