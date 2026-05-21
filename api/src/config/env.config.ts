import 'dotenv/config';
import { validate, Env } from '../lib/env';

let env: Env;
try {
  env = validate(process.env);
} catch (err) {
  if (process.env.NODE_ENV === 'test') {
    env = {
      NODE_ENV: process.env.NODE_ENV ?? 'test',
      PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
      DATABASE_URL: process.env.DATABASE_URL ?? '',
      LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
      REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
      REDIS_PORT: process.env.REDIS_PORT
        ? Number(process.env.REDIS_PORT)
        : 6379,
    };
  } else {
    throw err;
  }
}

export { env };
export default env;
