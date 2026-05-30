import 'dotenv/config';
import { validate, Env } from '../lib/env';

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  try {
    cachedEnv = validate(process.env);
    return cachedEnv;
  } catch (err) {
    if (process.env.NODE_ENV === 'test') {
      cachedEnv = {
        NODE_ENV: process.env.NODE_ENV ?? 'test',
        PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
        DATABASE_URL: process.env.DATABASE_URL ?? '',
        LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
        REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
        REDIS_PORT: process.env.REDIS_PORT
          ? Number(process.env.REDIS_PORT)
          : 6379,
      };
      return cachedEnv;
    }

    throw err;
  }
}

export default getEnv;
