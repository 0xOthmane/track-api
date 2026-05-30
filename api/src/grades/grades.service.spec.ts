import { cleanDatabase, setupTestDbWithRedis, teardownTestDb } from '../utils/test/setup-tests';
import { buildFixtures } from '../utils/test/test-fixtures';
import { GradesService } from './grades.service';
import { EvaluationType } from '../generated/prisma/enums';

describe('GradesService', () => {
  let ctx: Awaited<ReturnType<typeof setupTestDbWithRedis>>;
  let service: GradesService;
  let fixtures: ReturnType<typeof buildFixtures>;

  beforeAll(async () => {
    ctx = await setupTestDbWithRedis();
    service = ctx.module.get(GradesService);
    fixtures = buildFixtures(ctx.module);
  });

  afterAll(async () => {
    if (ctx) await teardownTestDb(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  it('creates a grade', async () => {
    const teacher = await fixtures.teacher();
    const student = await fixtures.student();
    const course = await fixtures.course({ teacherId: teacher.id });

    const result = await service.create(
      {
        courseId: course.id,
        studentId: student.id,
        evaluationType: EvaluationType.EXAM,
        value: 14,
      },
      teacher,
    );

    expect(result.courseName).toBe(course.name);
    expect(result.studentName).toBe(student.name);
    expect(result.value).toBe(14);
  });

  it('filters grades by teacher in findAll', async () => {
    const teacher = await fixtures.teacher();
    const otherTeacher = await fixtures.teacher();
    const student = await fixtures.student();
    const course = await fixtures.course({ teacherId: teacher.id });
    const otherCourse = await fixtures.course({ teacherId: otherTeacher.id });

    await service.create(
      {
        courseId: course.id,
        studentId: student.id,
        evaluationType: EvaluationType.QUIZ,
        value: 18,
      },
      teacher,
    );

    await service.create(
      {
        courseId: otherCourse.id,
        studentId: student.id,
        evaluationType: EvaluationType.PROJECT,
        value: 17,
      },
      otherTeacher,
    );

    const result = await service.findAll({ limit: 10 }, teacher);

    expect(result.data.length).toBe(1);
  });

  it('returns grades for the current student', async () => {
    const teacher = await fixtures.teacher();
    const student = await fixtures.student();
    const course = await fixtures.course({ teacherId: teacher.id });

    await service.create(
      {
        courseId: course.id,
        studentId: student.id,
        evaluationType: EvaluationType.EXAM,
        value: 16,
      },
      teacher,
    );

    const result = await service.findMine({ limit: 10 }, student);

    expect(result.data.length).toBe(1);
    expect(result.data[0].studentName).toBe(student.name);
  });

  it('updates and removes a grade', async () => {
    const teacher = await fixtures.teacher();
    const student = await fixtures.student();
    const course = await fixtures.course({ teacherId: teacher.id });

    const created = await service.create(
      {
        courseId: course.id,
        studentId: student.id,
        evaluationType: EvaluationType.EXAM,
        value: 12,
      },
      teacher,
    );

    const updated = await service.update(created.id, { value: 19 });
    expect(updated.value).toBe(19);

    const removed = await service.remove(created.id);
    expect(removed.id).toBe(created.id);
  });
});
