import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  cleanDatabase,
  setupTestDb,
  teardownTestDb,
} from '../utils/test/setup-tests';
import { buildFixtures } from '../utils/test/test-fixtures';
import { CoursesService } from './courses.service';
import { EvaluationType } from '../generated/prisma/enums';

describe('CoursesService (unit)', () => {
  let ctx: Awaited<ReturnType<typeof setupTestDb>>;
  let service: CoursesService;
  let fixtures: ReturnType<typeof buildFixtures>;

  beforeAll(async () => {
    ctx = await setupTestDb();
    service = ctx.module.get(CoursesService);
    fixtures = buildFixtures(ctx.module);
  });

  afterAll(async () => {
    if (ctx) await teardownTestDb(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  it('throws when course is missing', async () => {
    await expect(
      service.addWeight('missing-course', { type: 'exam', weight: 20 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('adds a weight when under total limit', async () => {
    const teacher = await fixtures.teacher();
    const course = await fixtures.course({ teacherId: teacher.id });

    const weight = await service.addWeight(course.id, {
      type: EvaluationType.EXAM,
      weight: 40,
    });

    expect(weight.weight).toBe(40);
  });

  it('rejects when total would exceed 100', async () => {
    const teacher = await fixtures.teacher();
    const course = await fixtures.course({ teacherId: teacher.id });

    await service.addWeight(course.id, {
      type: EvaluationType.EXAM,
      weight: 90,
    });

    await expect(
      service.addWeight(course.id, {
        type: EvaluationType.QUIZ,
        weight: 20,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
