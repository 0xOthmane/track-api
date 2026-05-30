import { cleanDatabase, setupTestDb, teardownTestDb } from '../utils/test/setup-tests';
import { buildFixtures } from '../utils/test/test-fixtures';
import { CoursesController } from './courses.controller';

describe('CoursesController', () => {
  let ctx: Awaited<ReturnType<typeof setupTestDb>>;
  let controller: CoursesController;
  let fixtures: ReturnType<typeof buildFixtures>;

  beforeAll(async () => {
    ctx = await setupTestDb();
    controller = ctx.module.get(CoursesController);
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

  it('creates a course', async () => {
    const teacher = await fixtures.teacher();
    const result = await controller.create(
      {
        name: 'Controller Course',
        description: 'Created via controller',
        capacity: 30,
        semester: '2026S',
        teacherId: teacher.id,
      },
      teacher,
    );

    expect(result.name).toBe('Controller Course');
  });

  it('lists courses', async () => {
    await fixtures.course({ name: 'Course One' });
    await fixtures.course({ name: 'Course Two' });

    const result = await controller.findAll({ limit: 10 });

    expect(result.data.length).toBeGreaterThanOrEqual(2);
  });

  it('finds a course by id', async () => {
    const course = await fixtures.course({ name: 'Find Me' });

    const result = await controller.findOne(course.id);

    expect(result.id).toBe(course.id);
  });

  it('updates a course', async () => {
    const course = await fixtures.course({ name: 'Before Update' });

    const result = await controller.update(course.id, { name: 'After Update' });

    expect(result.name).toBe('After Update');
  });

  it('removes a course', async () => {
    const course = await fixtures.course({ name: 'Delete Course' });

    const result = await controller.remove(course.id);

    expect(result.id).toBe(course.id);
  });

  it('enrolls a student', async () => {
    const student = await fixtures.student();
    const course = await fixtures.course({ capacity: 2 });

    const result = await controller.enroll(course.id, { studentId: student.id });

    expect(result.courseName).toBe(course.name);
    expect(result.studentName).toBe(student.name);
  });
});
