const mockRedisEval = jest.fn();

jest.mock('../../lib/redis', () => ({
  redis: {
    eval: mockRedisEval,
  },
}));

import { RateLimitMiddleware } from './rate-limit.middleware';

describe('RateLimitMiddleware', () => {
  let middleware: RateLimitMiddleware;
  let next: jest.Mock;

  beforeEach(() => {
    middleware = new RateLimitMiddleware();
    next = jest.fn();
    mockRedisEval.mockReset();
  });

  it('skips exempt routes without touching redis', async () => {
    const req = {
      originalUrl: '/admin/stats',
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as never;
    const res = {} as never;

    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockRedisEval).not.toHaveBeenCalled();
  });

  it('allows requests under the limit and writes a 60 second window', async () => {
    mockRedisEval.mockResolvedValue(1);
    const req = {
      originalUrl: '/courses',
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as never;
    const res = {} as never;

    await middleware.use(req, res, next);

    expect(mockRedisEval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      'rate-limit:127.0.0.1',
      60,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 429 after the request limit is exceeded', async () => {
    mockRedisEval.mockResolvedValue(61);
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
