import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CapacityPipe } from './capacity.pipe';
import {
  setupTestDb,
  teardownTestDb,
  cleanDatabase,
  TestContext,
} from '../../utils/test/setup-tests';
import { buildFixtures } from '../../utils/test/test-fixtures';
import { PrismaService } from '../../prisma/prisma.service';

describe('CapacityPipe (integration)', () => {
  let ctx: TestContext;
  let fixtures: ReturnType<typeof buildFixtures>;
  let pipe: CapacityPipe;
  let prisma: PrismaService | undefined;
  let isMocked = false;

  beforeAll(async () => {
    try {
      ctx = await setupTestDb();
      fixtures = buildFixtures(ctx.module);
      pipe = new CapacityPipe(ctx.prisma);
    } catch (err) {
      // Fallback for environments without Docker/Testcontainers (CI/dev without docker)
      isMocked = true;
      prisma = {
        course: { findUnique: jest.fn() },
        enrollment: { count: jest.fn() },
      };
      pipe = new CapacityPipe(prisma as unknown as PrismaService);
    }
  });

  afterEach(async () => {
    if (isMocked) {
      jest.resetAllMocks();
    } else {
      await cleanDatabase(ctx.prisma);
    }
  });

  afterAll(async () => {
    if (!isMocked) {
      await teardownTestDb(ctx);
    }
  });

  it('throws BadRequestException when value is falsy', async () => {
    await expect(pipe.transform('')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      pipe.transform(undefined as unknown as string),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when course not found', async () => {
    if (isMocked) {
      prisma.course.findUnique.mockResolvedValue(null);
      await expect(pipe.transform('missing-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    } else {
      await expect(pipe.transform('missing-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    }
  });

  it('throws ConflictException when course is full', async () => {
    if (isMocked) {
      prisma.course.findUnique.mockResolvedValue({ id: 'c1', capacity: 2 });
      prisma.enrollment.count.mockResolvedValue(2);
      await expect(pipe.transform('c1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    } else {
      const course = await fixtures.course({ capacity: 2 });
      const u1 = await fixtures.user();
      const u2 = await fixtures.user();
      await fixtures.enroll(u1.id, course.id);
      await fixtures.enroll(u2.id, course.id);

      await expect(pipe.transform(course.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    }
  });

  it('returns the value when capacity allows', async () => {
    if (isMocked) {
      prisma.course.findUnique.mockResolvedValue({ id: 'c2', capacity: 3 });
      prisma.enrollment.count.mockResolvedValue(1);
      await expect(pipe.transform('c2')).resolves.toEqual('c2');
    } else {
      const course = await fixtures.course({ capacity: 3 });
      const u1 = await fixtures.user();
      await fixtures.enroll(u1.id, course.id);

      await expect(pipe.transform(course.id)).resolves.toEqual(course.id);
    }
  });
});
