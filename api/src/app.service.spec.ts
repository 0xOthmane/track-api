import { AppService } from './app.service';
import { redis } from './lib/redis';
import {
  RedisTestContext,
  setupTestDbWithRedis,
  teardownTestDb,
} from './utils/test/setup-tests';

describe('AppService', () => {
  let ctx: RedisTestContext;
  let service: AppService;
  let prismaService: {
    $queryRaw: jest.Mock;
  };
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

    redis.disconnect();

    if (redisStopped) {
      await ctx.module.close();
      await ctx.container.stop();
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
      await ctx.redisContainer.stop();
    }

    await expect(service.getHealth()).resolves.toEqual({
      status: 'degraded',
    });
  });
});
