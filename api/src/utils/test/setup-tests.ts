import { Test, TestingModule } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { execSync } from 'child_process';
import { validate } from '../../lib/env';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
// import { UsersModule } from '../../users/users.module';

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
  container: StartedPostgreSqlContainer;
}

export interface RedisTestContext extends TestContext {
  redisContainer: StartedRedisContainer;
}

export async function setupTestDb(): Promise<TestContext> {
  const container = await new PostgreSqlContainer('postgres:18-alpine')
    .withDatabase('test')
    .withUsername('test')
    .withPassword('test')
    .start();

  const url = container.getConnectionUri();

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

  const module = await Test.createTestingModule({
    imports: [
      PrismaModule,
      // UsersModule
    ],
  }).compile();

  const prisma = module.get<PrismaService>(PrismaService);

  return { module, prisma, container };
}

export async function setupTestDbWithRedis(): Promise<RedisTestContext> {
  const redisContainer = await new RedisContainer('redis:7-alpine').start();

  process.env.REDIS_HOST = redisContainer.getHost();
  process.env.REDIS_PORT = String(redisContainer.getPort());

  const dbContext = await setupTestDb();

  return {
    ...dbContext,
    redisContainer,
  };
}

export async function setupRedisTestContainer(): Promise<StartedRedisContainer> {
  const redisContainer = await new RedisContainer('redis:7-alpine').start();

  process.env.REDIS_HOST = redisContainer.getHost();
  process.env.REDIS_PORT = String(redisContainer.getPort());

  return redisContainer;
}

export async function teardownTestDb(
  ctx: TestContext | RedisTestContext,
): Promise<void> {
  if (!ctx) {
    return;
  }
  await ctx.module.close();
  if ('redisContainer' in ctx) {
    await ctx.redisContainer.stop();
  }
  await ctx.container.stop();
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
