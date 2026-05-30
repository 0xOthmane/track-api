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

describe('CapacityPipe (integration)', () => {
  let ctx: TestContext;
  let fixtures: ReturnType<typeof buildFixtures>;
  let pipe: CapacityPipe;

  beforeAll(async () => {
    ctx = await setupTestDb();
    fixtures = buildFixtures(ctx.module);
    pipe = new CapacityPipe(ctx.prisma);
  });

  afterEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await teardownTestDb(ctx);
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
    await expect(pipe.transform('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws ConflictException when course is full', async () => {
    const course = await fixtures.course({ capacity: 2 });
    const u1 = await fixtures.student();
    const u2 = await fixtures.student();
    await fixtures.enroll(u1.id, course.id);
    await fixtures.enroll(u2.id, course.id);

    await expect(pipe.transform(course.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('returns the value when capacity allows', async () => {
    const course = await fixtures.course({ capacity: 3 });
    const u1 = await fixtures.student();
    await fixtures.enroll(u1.id, course.id);

    await expect(pipe.transform(course.id)).resolves.toEqual(course.id);
  });
});
