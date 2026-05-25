import { cleanDatabase, setupTestDb, teardownTestDb } from '../utils/test/setup-tests';
import { buildFixtures } from '../utils/test/test-fixtures';
import { CoursesService } from './courses.service';

describe('CoursesService', () => {
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

  it('creates a course for a teacher', async () => {
    const teacher = await fixtures.teacher();
    const result = await service.create(
      {
        name: 'Physics 101',
        description: 'Intro physics',
        capacity: 25,
        semester: '2026S',
        teacherId: teacher.id,
      },
      teacher,
    );

    expect(result.name).toBe('Physics 101');
    expect(result.teacher?.email).toBe(teacher.email);
  });

  it('rejects course creation for non-teacher users', async () => {
    const student = await fixtures.student();
    const teacher = await fixtures.teacher();

    await expect(
      service.create(
        {
          name: 'Chemistry 101',
          description: 'Intro chemistry',
          capacity: 20,
          semester: '2026S',
          teacherId: teacher.id,
        },
        student,
      ),
    ).rejects.toThrow('User is not authorized to create course');
  });

  it('lists courses with pagination metadata', async () => {
    await fixtures.course({ name: 'Course A' });
    await fixtures.course({ name: 'Course B' });

    const result = await service.findAll({ limit: 10 });

    expect(result.data.length).toBeGreaterThanOrEqual(2);
    expect(result.meta).toHaveProperty('nextCursor');
  });

  it('finds a course by id', async () => {
    const course = await fixtures.course({ name: 'Find Me' });

    const result = await service.findOne(course.id);

    expect(result.id).toBe(course.id);
    expect(result.name).toBe('Find Me');
  });

  it('updates a course', async () => {
    const course = await fixtures.course({ name: 'Before Update' });

    const result = await service.update(course.id, { name: 'After Update' });

    expect(result.name).toBe('After Update');
  });

  it('removes a course', async () => {
    const course = await fixtures.course({ name: 'Delete Course' });

    const result = await service.remove(course.id);

    expect(result.id).toBe(course.id);
  });

  it('enrolls a student and enforces capacity', async () => {
    const teacher = await fixtures.teacher();
    const student = await fixtures.student();
    const otherStudent = await fixtures.student();
    const course = await fixtures.course({ capacity: 1, teacherId: teacher.id });

    const enrollment = await service.enroll(course.id, student.id);
    expect(enrollment.courseName).toBe(course.name);

    await expect(service.enroll(course.id, otherStudent.id)).rejects.toThrow(
      'Course is full',
    );
  });
});
