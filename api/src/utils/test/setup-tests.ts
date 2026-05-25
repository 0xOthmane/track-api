import { Test, TestingModule } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { execSync } from 'child_process';
import { validate } from '../../lib/env';
import { redis } from '../../lib/redis';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersModule } from '../../users/users.module';
import { CoursesModule } from '../../courses/courses.module';
import { GradesModule } from '../../grades/grades.module';
import { AttendancesModule } from '../../attendances/attendances.module';
import { BullModule } from '@nestjs/bullmq';
import { ClsModule } from 'nestjs-cls';

jest.setTimeout(60000);

/**
 * Starts a real PostgreSQL container via Testcontainers, runs all migrations,
 * and returns a fully wired NestJS testing module.
 *
 * Why no mocks?
 * Business rules like ConflictException (duplicate email) or unique constraints
 * only surface at the database level. A mocked repository returns whatever you
 * tell it to — it can never catch the case where the constraint was accidentally
 * removed from the schema. Testing against a real DB gives you the actual behaviour.
 *
 * Call teardownTestDb() in afterAll to stop the container.
 */

export interface TestContext {
  module: TestingModule;
  prisma: PrismaService;
  pgContainer: StartedPostgreSqlContainer;
  redisContainer?: StartedRedisContainer;
}

const REDIS_READY_RETRIES = 10;
const REDIS_READY_DELAY_MS = 250;

async function waitForRedisReady() {
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

  throw new Error('Redis did not become ready in time');
}

export async function setupTestDb(options?: { includeRedis?: boolean }): Promise<TestContext> {
  const hasRedis = options?.includeRedis === true;
  const pgContainer = await new PostgreSqlContainer('postgres:18-alpine')
    .withDatabase('test')
    .withUsername('test')
    .withPassword('test')
    .start();

  const url = pgContainer.getConnectionUri();

  // Set DATABASE_URL before the NestJS module boots so PrismaService picks it up
  process.env.DATABASE_URL = url;

  // Validate environment (merge runtime mutation) and build the child process env
  const validated = validate({ ...process.env, DATABASE_URL: url });
  const childEnv = {
    ...process.env,
    DATABASE_URL: url,
    PORT: String(validated.PORT),
    NODE_ENV: validated.NODE_ENV,
    LOG_LEVEL: validated.LOG_LEVEL,
  };

  // Run all migrations against the fresh container
  execSync('npx prisma migrate deploy', {
    env: childEnv,
    stdio: 'pipe',
  });

  const imports = [
    PrismaModule,
    UsersModule,
    CoursesModule,
    AttendancesModule,
    ClsModule.forRoot({ global: true }),
  ];

  if (hasRedis) {
    imports.push(
      BullModule.forRoot({
        connection: {
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT),
        },
      }),
      GradesModule,
    );
  }

  const module = await Test.createTestingModule({
    imports,
  }).compile();

  const prisma = module.get<PrismaService>(PrismaService);

  return { module, prisma, pgContainer };
}

export async function setupTestDbWithRedis(): Promise<TestContext> {
  const redisContainer = await new RedisContainer('redis:7-alpine').start();

  process.env.REDIS_HOST = redisContainer.getHost();
  process.env.REDIS_PORT = String(redisContainer.getPort());

  const dbContext = await setupTestDb({ includeRedis: true });

  await waitForRedisReady();

  return {
    ...dbContext,
    redisContainer,
  };
}

export async function setupRedisTestContainer(): Promise<StartedRedisContainer> {
  const redisContainer = await new RedisContainer('redis:7-alpine').start();

  process.env.REDIS_HOST = redisContainer.getHost();
  process.env.REDIS_PORT = String(redisContainer.getPort());

  await waitForRedisReady();

  return redisContainer;
}

export async function teardownTestDb(ctx: TestContext): Promise<void> {
  if (!ctx) {
    return;
  }
  await ctx.module.close();
  if (ctx.redisContainer) {
    await ctx.redisContainer.stop();
  }
  await ctx.pgContainer.stop();
}

/**
 * Truncates all domain tables between tests to guarantee isolation.
 * Order matters — respect FK constraints.
 */
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  // Delete in order that respects foreign key constraints.
  await prisma.$transaction([
    prisma.enrollment.deleteMany(),
    prisma.grade.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.attendanceSession.deleteMany(),
    prisma.evaluationWeight.deleteMany(),
    prisma.course.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
