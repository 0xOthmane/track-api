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
    };
  } else {
    throw err;
  }
}

export { env };
export default env;
