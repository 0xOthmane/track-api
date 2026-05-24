import Redis from 'ioredis';
import env from '../config/env.config';

export interface RedisClient {
  ping(): Promise<string>;
  eval(
    script: string,
    numKeys: number,
    ...args: Array<string | number>
  ): Promise<unknown>;
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    mode: 'EX',
    seconds: number,
  ): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  quit(): Promise<string>;
  disconnect(): void;
}

let redisClient: RedisClient | null = null;

function createRedisClient(): RedisClient {
  if (!redisClient) {
    redisClient = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
    });
  }

  return redisClient;
}

export const redis: RedisClient = {
  ping() {
    return createRedisClient().ping();
  },
  eval(script, numKeys, ...args) {
    return createRedisClient().eval(script, numKeys, ...args);
  },
  get(key) {
    return createRedisClient().get(key);
  },
  set(key, value, mode, seconds) {
    return createRedisClient().set(key, value, mode, seconds);
  },
  del(...keys) {
    return createRedisClient().del(...keys);
  },
  quit() {
    return createRedisClient().quit();
  },
  disconnect() {
    createRedisClient().disconnect();
  },
};

export async function closeRedisClient() {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.quit();
  } catch {
    redisClient.disconnect();
  }

  redisClient = null;
}
