import type { Response } from 'express';
import { AdminController } from './admin.controller';
import { AdminModule } from './admin.module';
import { PrismaService } from '../prisma/prisma.service';
import {
  cleanDatabase,
  setupTestDbWithRedis,
  teardownTestDb,
} from '../utils/test/setup-tests';

describe('AdminController', () => {
  let ctx: Awaited<ReturnType<typeof setupTestDbWithRedis>> | null = null;
  let controller: AdminController;
  let prisma: PrismaService;

  const uniqueEmail = () =>
    `admin-${Date.now()}-${Math.floor(Math.random() * 100000)}@test.local`;

  beforeAll(async () => {
    ctx = await setupTestDbWithRedis([AdminModule]);
    controller = ctx.module.get(AdminController);
    prisma = ctx.module.get(PrismaService);
  });

  beforeEach(async () => {
    if (ctx) {
      await cleanDatabase(ctx.prisma);
    }
  });

  afterAll(async () => {
    if (ctx) await teardownTestDb(ctx);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('streams semester csv with csv headers', async () => {
    const headers = new Map<string, string>();
    let body = '';
    const res = {
      setHeader: (key: string, value: string) => {
        headers.set(key, value);
      },
      send: (value: string) => {
        body = value;
      },
    } as unknown as Response;

    await controller.getSemesterReport('Fall 2024', res);

    expect(headers.get('Content-Type')).toBe('text/csv');
    expect(headers.get('Content-Disposition')).toBe(
      'attachment; filename="semester-Fall 2024.csv"',
    );
    expect(body).toContain('Student name');
  });

  it('returns enrollment import results', async () => {
    const teacher = await prisma.user.create({
      data: { name: 'Teacher', email: uniqueEmail(), role: 'TEACHER' },
    });
    const student = await prisma.user.create({
      data: { name: 'Student', email: uniqueEmail(), role: 'STUDENT' },
    });
    const course = await prisma.course.create({
      data: {
        name: 'Test Course',
        description: 'Admin import course',
        capacity: 2,
        semester: 'Fall 2024',
        teacherId: teacher.id,
      },
    });

    const csv = `studentId,courseId\n${student.id},${course.id}`;
    const result = await controller.importEnrollments(csv);

    expect(result.enrolled).toBe(1);
    expect(result.skipped).toEqual([]);
  });

  it('returns semester stats', async () => {
    const teacher = await prisma.user.create({
      data: { name: 'Teacher', email: uniqueEmail(), role: 'TEACHER' },
    });
    const student = await prisma.user.create({
      data: { name: 'Student', email: uniqueEmail(), role: 'STUDENT' },
    });
    const course = await prisma.course.create({
      data: {
        name: 'Stats Course',
        description: 'Admin stats course',
        capacity: 3,
        semester: 'Fall 2024',
        teacherId: teacher.id,
      },
    });

    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseId: course.id,
      },
    });

    const stats = await controller.getStats({ semester: 'Fall 2024' });

    expect(stats.totalCourses).toBe(1);
    expect(stats.totalStudents).toBe(1);
    expect(stats.semester).toBe('Fall 2024');
  });

  it('triggers the semester summary flow', async () => {
    const summary = await controller.sendSemesterSummary('Fall 2024');

    expect(summary.sent).toBe(true);
    expect(summary.semester).toBe('Fall 2024');
    expect(summary.stats).toBeDefined();
  });
});
