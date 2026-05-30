import {
  cleanDatabase,
  setupTestDbWithRedis,
  teardownTestDb,
} from '../utils/test/setup-tests';
import { buildFixtures } from '../utils/test/test-fixtures';
import { AttendancesController } from './attendances.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('AttendancesController', () => {
  let controller: AttendancesController | null = null;
  let ctx: Awaited<ReturnType<typeof setupTestDbWithRedis>> | null = null;
  let prisma: PrismaService;
  let fixtures: ReturnType<typeof buildFixtures>;

  beforeAll(async () => {
    ctx = await setupTestDbWithRedis();
    controller = ctx.module.get(AttendancesController, { strict: false });
    prisma = ctx.module.get(PrismaService);
    fixtures = buildFixtures(ctx.module);
  });

  afterAll(async () => {
    if (ctx) await teardownTestDb(ctx);
  });

  beforeEach(async () => {
    if (ctx) {
      await cleanDatabase(ctx.prisma);
    }
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates an attendance session', async () => {
    const course = await fixtures.course();
    const date = new Date().toISOString();

    const session = await controller!.createSession(course.id, { date });

    expect(session.courseId).toBe(course.id);
    expect(session.date.toISOString()).toBe(new Date(date).toISOString());
  });

  it('creates attendance records for a session', async () => {
    const course = await fixtures.course();
    const student = await fixtures.student();
    const session = await fixtures.attendanceSession({ courseId: course.id });

    const result = await controller!.createRecord(course.id, session.id, {
      records: [{ studentId: student.id, present: true }],
    });

    expect(result.records).toHaveLength(1);
    expect(result.notifications).toHaveLength(0);
  });

  it('returns stats for a session', async () => {
    const course = await fixtures.course();
    const student = await fixtures.student();
    const session = await fixtures.attendanceSession({ courseId: course.id });

    await fixtures.attendanceRecords({
      courseId: course.id,
      sessionId: session.id,
      records: [{ studentId: student.id, present: false }],
    });

    const stats = await controller!.getStats(session.id);

    expect(stats.total).toBe(1);
    expect(stats.present).toBe(0);
    expect(stats.absent).toBe(1);
  });

  it('returns student attendance records for a course', async () => {
    const course = await fixtures.course();
    const student = await fixtures.student();
    const session = await fixtures.attendanceSession({ courseId: course.id });

    await fixtures.attendanceRecords({
      courseId: course.id,
      sessionId: session.id,
      records: [{ studentId: student.id, present: true }],
    });

    const records = await controller!.getStudentRecords(course.id, student);

    expect(records).toHaveLength(1);
    expect(records[0].studentId).toBe(student.id);
  });

  it('updates a session record for the course owner', async () => {
    const teacher = await fixtures.teacher();
    const course = await fixtures.course({ teacherId: teacher.id });
    const student = await fixtures.student();
    const session = await fixtures.attendanceSession({ courseId: course.id });

    await fixtures.attendanceRecords({
      courseId: course.id,
      sessionId: session.id,
      records: [{ studentId: student.id, present: true }],
    });

    const record = await prisma.attendanceRecord.findFirstOrThrow({
      where: { sessionId: session.id, studentId: student.id },
    });

    const updated = await controller!.updateSessionRecord(
      record.id,
      { present: false },
      teacher,
    );

    expect(updated.present).toBe(false);
  });
});
