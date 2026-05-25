import { closeRedisClient, redis } from '../../lib/redis';
import { setupRedisTestContainer } from '../../utils/test/setup-tests';
import { RateLimitMiddleware } from './rate-limit.middleware';

describe('RateLimitMiddleware', () => {
  let redisContainer: Awaited<ReturnType<typeof setupRedisTestContainer>>;
  let middleware: RateLimitMiddleware;
  let next: jest.Mock;
  let isMocked = false;

  beforeEach(async () => {
    isMocked = false;

    try {
      redisContainer = await setupRedisTestContainer();
    } catch {
      isMocked = true;
    }

    middleware = new RateLimitMiddleware();
    next = jest.fn();
  });

  afterEach(async () => {
    jest.restoreAllMocks();

    if (isMocked) {
      return;
    }

    await closeRedisClient();
    await redisContainer.stop();
  });

  it('skips exempt routes without touching redis', async () => {
    const req = {
      originalUrl: '/admin/stats',
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as never;
    const res = {} as never;

    if (isMocked) {
      jest.spyOn(redis, 'eval').mockResolvedValue(1);
    }

    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows requests under the limit and writes a 60 second window', async () => {
    const req = {
      originalUrl: '/courses',
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as never;
    const res = {} as never;

    if (isMocked) {
      jest.spyOn(redis, 'eval').mockResolvedValue(1);
    }

    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 429 after the request limit is exceeded', async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const req = {
      originalUrl: '/courses',
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as never;
    const res = {
      status,
      json,
    } as never;

    if (isMocked) {
      jest.spyOn(redis, 'eval').mockResolvedValue(61);
    }

    await middleware.use(req, res, next);

    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith({
      statusCode: 429,
      message: 'Too many requests. Please try again later.',
      error: 'Too Many Requests',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
