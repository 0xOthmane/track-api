import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { redis } from '../../lib/redis';

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 60;
const RATE_LIMIT_KEY_PREFIX = 'rate-limit';
const RATE_LIMIT_LUA_SCRIPT = `
  local current = redis.call('INCR', KEYS[1])

  if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end

  return current
`;

const RATE_LIMIT_EXEMPT_PATH_PREFIXES = ['/admin', '/api/docs', '/health'];

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const path = this.getPath(req);

    if (this.shouldSkip(path)) {
      next();
      return;
    }

    const clientIp = this.getClientIp(req);

    if (!clientIp) {
      next();
      return;
    }

    const key = `${RATE_LIMIT_KEY_PREFIX}:${clientIp}`;
    const currentCount = Number(
      await redis.eval(
        RATE_LIMIT_LUA_SCRIPT,
        1,
        key,
        RATE_LIMIT_WINDOW_SECONDS,
      ),
    );

    if (currentCount > RATE_LIMIT_MAX_REQUESTS) {
      res.status(429).json({
        statusCode: 429,
        message: 'Too many requests. Please try again later.',
        error: 'Too Many Requests',
      });
      return;
    }

    next();
  }

  private getPath(req: Request) {
    const url = req.originalUrl ?? req.url ?? '/';
    const [path] = url.split('?');

    return path || '/';
  }

  private shouldSkip(path: string) {
    return RATE_LIMIT_EXEMPT_PATH_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );
  }

  private getClientIp(req: Request) {
    const ip = req.ip || req.socket.remoteAddress || '';

    return ip.startsWith('::ffff:') ? ip.slice('::ffff:'.length) : ip;
  }
}
