import { cleanDatabase, setupTestDbWithRedis, teardownTestDb } from '../utils/test/setup-tests';
import { buildFixtures } from '../utils/test/test-fixtures';
import { EvaluationType } from '../generated/prisma/enums';
import { GradesController } from './grades.controller';

describe('GradesController', () => {
  let ctx: Awaited<ReturnType<typeof setupTestDbWithRedis>>;
  let controller: GradesController;
  let fixtures: ReturnType<typeof buildFixtures>;

  beforeAll(async () => {
    ctx = await setupTestDbWithRedis();
    controller = ctx.module.get(GradesController);
    fixtures = buildFixtures(ctx.module);
  });

  afterAll(async () => {
    if (ctx) await teardownTestDb(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates and fetches grades', async () => {
    const teacher = await fixtures.teacher();
    const student = await fixtures.student();
    const course = await fixtures.course({ teacherId: teacher.id });

    const created = await controller.create(
      {
        courseId: course.id,
        studentId: student.id,
        evaluationType: EvaluationType.QUIZ,
        value: 15,
      },
      teacher,
    );

    const fetched = await controller.findOne(created.id);

    expect(fetched.id).toBe(created.id);
  });

  it('lists grades for a teacher', async () => {
    const teacher = await fixtures.teacher();
    const student = await fixtures.student();
    const course = await fixtures.course({ teacherId: teacher.id });

    await controller.create(
      {
        courseId: course.id,
        studentId: student.id,
        evaluationType: EvaluationType.EXAM,
        value: 17,
      },
      teacher,
    );

    const result = await controller.findAll({ limit: 10 }, teacher);

    expect(result.data.length).toBe(1);
  });

  it('updates and removes a grade', async () => {
    const teacher = await fixtures.teacher();
    const student = await fixtures.student();
    const course = await fixtures.course({ teacherId: teacher.id });

    const created = await controller.create(
      {
        courseId: course.id,
        studentId: student.id,
        evaluationType: EvaluationType.PROJECT,
        value: 13,
      },
      teacher,
    );

    const updated = await controller.update(created.id, { value: 18 });
    expect(updated.value).toBe(18);

    const removed = await controller.remove(created.id);
    expect(removed.id).toBe(created.id);
  });
});
