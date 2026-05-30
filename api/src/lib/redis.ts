import Redis from 'ioredis';
import { getEnv } from '../config/env.config';

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

let redisClient: Redis | null = null;

function createRedisClient(): Redis {
  if (!redisClient) {
    const envConfig = getEnv();
    const host = process.env.REDIS_HOST ?? envConfig.REDIS_HOST;
    const port = process.env.REDIS_PORT
      ? Number(process.env.REDIS_PORT)
      : envConfig.REDIS_PORT;

    const isTest = process.env.NODE_ENV === 'test';

    redisClient = new Redis({
      host,
      port,
      ...(isTest
        ? {
            enableOfflineQueue: false,
            maxRetriesPerRequest: 0,
            reconnectOnError: () => false,
            retryStrategy: () => null,
          }
        : {}),
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
    if (!redisClient) {
      return Promise.resolve('OK');
    }

    return redisClient.quit();
  },
  disconnect() {
    if (!redisClient) {
      return;
    }

    redisClient.disconnect();
    redisClient = null;
  },
};

export async function closeRedisClient() {
  if (!redisClient) {
    return;
  }

  const client = redisClient;
  redisClient = null;

  if (client.status === 'end') {
    return;
  }

  await new Promise<void>((resolve) => {
    const finish = () => {
      client.removeListener('end', finish);
      client.removeListener('close', finish);
      resolve();
    };

    client.once('end', finish);
    client.once('close', finish);

    try {
      client.disconnect();
    } catch {
      finish();
    }
  });
}
