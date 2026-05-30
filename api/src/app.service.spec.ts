import { AppService } from './app.service';
import { closeRedisClient, redis } from './lib/redis';
import { PrismaService } from './prisma/prisma.service';
import {
  setupTestDbWithRedis,
  teardownTestDb,
  TestContext,
} from './utils/test/setup-tests';

describe('AppService', () => {
  let ctx: TestContext;
  let service: AppService;
  let prismaService: jest.Mocked<Pick<PrismaService, '$queryRaw'>>;
  let isMocked = false;
  let redisStopped = false;

  beforeEach(async () => {
    isMocked = false;
    redisStopped = false;

    try {
      ctx = await setupTestDbWithRedis();
      service = new AppService(ctx.prisma);
    } catch {
      isMocked = true;
      prismaService = {
        $queryRaw: jest.fn(),
      };
      service = new AppService(prismaService as never);
    }
  });

  afterEach(async () => {
    jest.restoreAllMocks();

    if (isMocked) {
      return;
    }

    await closeRedisClient();

    if (redisStopped) {
      await ctx.module.close();
      await ctx.pgContainer.stop();
      return;
    }

    await teardownTestDb(ctx);
  });

  it('returns ok when the database and redis are connected', async () => {
    if (isMocked) {
      prismaService.$queryRaw.mockResolvedValue({});
      jest.spyOn(redis, 'ping').mockResolvedValue('PONG');
    }

    await expect(service.getHealth()).resolves.toEqual({
      status: 'ok',
    });
  });

  it('returns degraded when either dependency is unavailable', async () => {
    if (isMocked) {
      prismaService.$queryRaw.mockRejectedValue(new Error('db down'));
      jest.spyOn(redis, 'ping').mockResolvedValue('PONG');
    } else {
      redisStopped = true;
      await ctx.redisContainer!.stop();
    }

    await expect(service.getHealth()).resolves.toEqual({
      status: 'degraded',
    });
  });
});
