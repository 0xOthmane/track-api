import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { json, text } from 'express';
import request from 'supertest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';
import { execSync } from 'child_process';
import { validate } from '../src/lib/env';
import type { PrismaService } from '../src/prisma/prisma.service';
import { type Role } from '../src/generated/prisma/client';
import { closeRedisClient, redis } from '../src/lib/redis';

type BootstrappedApp = {
  app: INestApplication;
  prisma: PrismaService;
  pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  redisContainer: Awaited<ReturnType<RedisContainer['start']>>;
};

type SeededUser = {
  id: string;
  email: string;
  password: string;
  role: Role;
  name: string;
};

const REDIS_READY_RETRIES = 10;
const REDIS_READY_DELAY_MS = 250;

async function waitForRedisReady(host: string, port: number) {
  const client = new Redis({ host, port, enableOfflineQueue: false });
  for (let attempt = 0; attempt < REDIS_READY_RETRIES; attempt += 1) {
    try {
      const pong = await client.ping();
      if (pong === 'PONG') {
        client.disconnect();
        return;
      }
    } catch {
      // ignore and retry
    }

    await new Promise((resolve) => setTimeout(resolve, REDIS_READY_DELAY_MS));
  }
  client.disconnect();
  throw new Error('Redis did not become ready in time');
}

async function warmUpRedisClient() {
  for (let attempt = 0; attempt < REDIS_READY_RETRIES; attempt += 1) {
    try {
      const pong = await redis.ping();
      if (pong === 'PONG') {
        return;
      }
    } catch {
      // ignore and retry
    }

    await new Promise((resolve) => setTimeout(resolve, REDIS_READY_DELAY_MS));
  }

  throw new Error('Redis client did not become ready in time');
}

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@test.local`;
}

export async function bootstrapE2E(): Promise<BootstrappedApp> {
  process.env.NODE_ENV = 'test';

  const pgContainer = await new PostgreSqlContainer('postgres:18-alpine')
    .withDatabase('test')
    .withUsername('test')
    .withPassword('test')
    .start();

  const redisContainer = await new RedisContainer('redis:7-alpine').start();

  const databaseUrl = pgContainer.getConnectionUri();
  process.env.DATABASE_URL = databaseUrl;
  process.env.REDIS_HOST = redisContainer.getHost();
  process.env.REDIS_PORT = String(redisContainer.getPort());

  const validated = validate({ ...process.env, DATABASE_URL: databaseUrl });
  const childEnv = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    PORT: String(validated.PORT),
    NODE_ENV: validated.NODE_ENV,
    LOG_LEVEL: validated.LOG_LEVEL,
  };

  execSync('npx prisma migrate deploy', {
    env: childEnv,
    stdio: 'pipe',
  });

  await waitForRedisReady(
    process.env.REDIS_HOST,
    Number(process.env.REDIS_PORT),
  );

  const { AppModule } = await import('../src/app.module');

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const { PrismaService } = await import('../src/prisma/prisma.service');
  const prisma = moduleRef.get(PrismaService);

  const { createTestAuth, installTestAuth } = await import(
    '../src/utils/test/auth-helper'
  );
  const testAuth = await createTestAuth(prisma);
  await installTestAuth(testAuth);

  const app = moduleRef.createNestApplication();
  const httpServer = app.getHttpAdapter().getInstance() as {
    set: (setting: string, value: unknown) => void;
  };

  httpServer.set('trust proxy', 1);

  app.use(json());
  app.use(text({ type: ['text/csv', 'text/plain'] }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  await warmUpRedisClient();

  return { app, prisma, pgContainer, redisContainer };
}

export async function teardownE2E(ctx: BootstrappedApp | null) {
  if (!ctx) {
    return;
  }

  await ctx.app.close();
  await closeRedisClient();
  await ctx.redisContainer.stop();
  await ctx.pgContainer.stop();
}

export async function resetDatabase(prisma: PrismaService) {
  const { cleanDatabase } = await import('../src/utils/test/setup-tests');
  await cleanDatabase(prisma);
}

export async function seedUser(
  prisma: PrismaService,
  role: Role,
  overrides?: { name?: string; email?: string; password?: string },
): Promise<SeededUser> {
  const email = overrides?.email ?? uniqueEmail(role.toLowerCase());
  const password = overrides?.password ?? 'StrongPassword123!';
  const name = overrides?.name ?? `${role} User`;

  const { createTestAuth, installTestAuth } = await import(
    '../src/utils/test/auth-helper'
  );
  const testAuth = await createTestAuth(prisma);
  await installTestAuth(testAuth);

  const created = await testAuth.api.createUser({
    body: {
      name,
      email,
      password,
      data: {
        role,
      },
    },
  });

  return {
    id: created.user.id,
    email,
    password,
    role,
    name,
  };
}

export async function signIn(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/sign-in/email')
    .set('Origin', 'http://localhost')
    .send({ email, password });

  if (response.status !== 200) {
    throw new Error(
      `Sign-in failed (${response.status}): ${JSON.stringify(response.body)}`,
    );
  }

  const setCookie = response.headers['set-cookie'];
  const cookieHeader = Array.isArray(setCookie)
    ? setCookie
    : typeof setCookie === 'string'
      ? [setCookie]
      : [];

  if (!cookieHeader.length) {
    throw new Error('Missing session cookie from sign-in response');
  }

  return cookieHeader
    .map((value) => value.split(';')[0])
    .filter(Boolean)
    .join('; ');
}

export async function seedAndSignIn(
  app: INestApplication,
  prisma: PrismaService,
  role: Role,
): Promise<SeededUser & { cookie: string }> {
  const seeded = await seedUser(prisma, role);
  const cookie = await signIn(app, seeded.email, seeded.password);
  return { ...seeded, cookie };
}
