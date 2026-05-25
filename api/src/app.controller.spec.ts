import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { closeRedisClient, redis } from './lib/redis';
import { PrismaService } from './prisma/prisma.service';
import {
  setupTestDbWithRedis,
  teardownTestDb,
  TestContext,
} from './utils/test/setup-tests';

describe('AppController', () => {
  let ctx: TestContext;
  let moduleRef: TestingModule;
  let appController: AppController;

  beforeEach(async () => {
    ctx = await setupTestDbWithRedis();
    moduleRef = await Test.createTestingModule({
      imports: [],
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: ctx.prisma }],
    }).compile();
    appController = moduleRef.get(AppController);
  });

  afterEach(async () => {
    await closeRedisClient();
    await moduleRef.close();
    await teardownTestDb(ctx);
  });

  describe('health', () => {
    it('should return the service health payload', async () => {
      const result = await appController.getHealth();
      expect(result).toEqual({ status: 'ok' });
    });

    it('should return degraded if the redis is unavailable', async () => {
      if (ctx.redisContainer) {
        await ctx.redisContainer.stop();
        const result = await appController.getHealth();
        expect(result).toEqual({ status: 'degraded' });
      }
    });

    it('should return degraded if the database is unavailable', async () => {
      await ctx.pgContainer.stop();
      const result = await appController.getHealth();
      expect(result).toEqual({ status: 'degraded' });
    });
  });
});
