import { cleanDatabase, setupTestDbWithRedis, teardownTestDb } from '../utils/test/setup-tests';
import { buildFixtures } from '../utils/test/test-fixtures';
import { AttendancesService } from './attendances.service';
import { AttendanceGateway } from './attendance.gateway';

describe('AttendancesService (merged)', () => {
  let ctx: Awaited<ReturnType<typeof setupTestDbWithRedis>>;
  let service: AttendancesService;
  let fixtures: ReturnType<typeof buildFixtures>;
  let gateway: AttendanceGateway;

  beforeAll(async () => {
    ctx = await setupTestDbWithRedis();
    fixtures = buildFixtures(ctx.module);
    service = ctx.module.get(AttendancesService);
    gateway = ctx.module.get(AttendanceGateway, { strict: false });
  });

  afterAll(async () => {
    if (ctx) await teardownTestDb(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  it('creates a session and returns it', async () => {
    const teacher = await fixtures.teacher();
    const course = await fixtures.course({ teacherId: teacher.id });

    const session = await service.createSession(course.id, { date: new Date().toISOString() });

    expect(session).toHaveProperty('id');
    expect(session.courseId).toBe(course.id);
  });

  it('creates records and persists them', async () => {
    const teacher = await fixtures.teacher();
    const student = await fixtures.student();
    const course = await fixtures.course({ teacherId: teacher.id });
    const session = await service.createSession(course.id, { date: new Date().toISOString() });

    const result = await service.createRecord(course.id, session.id, [
      { studentId: student.id, present: false },
    ]);

    expect(result.records.length).toBe(1);
    const stored = await ctx.prisma.attendanceRecord.findFirst({ where: { sessionId: session.id, studentId: student.id } });
    expect(stored).toBeTruthy();
  });

  it('getStats returns correct totals', async () => {
    const teacher = await fixtures.teacher();
    const student = await fixtures.student();
    const course = await fixtures.course({ teacherId: teacher.id });
    const session = await service.createSession(course.id, { date: new Date().toISOString() });

    await service.createRecord(course.id, session.id, [
      { studentId: student.id, present: true },
    ]);

    const stats = await service.getStats(session.id);
    expect(stats.total).toBe(1);
    expect(stats.present).toBe(1);
    expect(stats.absent).toBe(0);
  });

  it('enforces ownership on update and allows teacher', async () => {
    const teacher = await fixtures.teacher();
    const other = await fixtures.teacher();
    const student = await fixtures.student();
    const course = await fixtures.course({ teacherId: teacher.id });
    const session = await service.createSession(course.id, { date: new Date().toISOString() });

    await service.createRecord(course.id, session.id, [
      { studentId: student.id, present: true },
    ]);

    const created = await ctx.prisma.attendanceRecord.findFirst({ where: { sessionId: session.id, studentId: student.id } });
    expect(created).toBeTruthy();

    await expect(service.updateSessionRecord(created!.id, { present: false }, other.id)).rejects.toThrow();

    const updated = await service.updateSessionRecord(created!.id, { present: false }, teacher.id);
    expect(updated).toHaveProperty('id');
  });

  it('returns student records', async () => {
    const teacher = await fixtures.teacher();
    const student = await fixtures.student();
    const course = await fixtures.course({ teacherId: teacher.id });
    const session = await service.createSession(course.id, { date: new Date().toISOString() });

    await service.createRecord(course.id, session.id, [
      { studentId: student.id, present: true },
    ]);

    const records = await service.getStudentRecords(course.id, student.id);
    expect(records.length).toBeGreaterThanOrEqual(1);
  });

  describe('metrics helpers (unit)', () => {
    it('calculateAttendanceMetrics handles zero and negative values', () => {
      const r = (service as any).calculateAttendanceMetrics(0, 0);
      expect(r.totalCount).toBe(0);
      expect(r.presentCount).toBe(0);
      expect(r.presenceRate).toBe(0);
      expect(r.absenceRate).toBe(0);
      expect(r.atRisk).toBe(false);

      const bad = (service as any).calculateAttendanceMetrics(4, 2);
      expect(bad.atRisk).toBe(true);
    });

    it('getAttendanceMetrics queries prisma counts', async () => {
      const fakePrisma = {
        attendanceSession: { count: async () => 5 },
        attendanceRecord: { count: async () => 2 },
      } as any;

      const metrics = await (service as any).getAttendanceMetrics(fakePrisma, 'course-1', 'student-1', 'exclude-session');
      expect(metrics.totalCount).toBe(5);
      expect(metrics.presentCount).toBe(2);
    });
  });
});
