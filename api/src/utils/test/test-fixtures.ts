import { TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../../users/users.service';
import { CoursesService } from '../../courses/courses.service';
import { GradesService } from '../../grades/grades.service';
import { AttendancesService } from '../../attendances/attendances.service';
import { Role } from '../../generated/prisma/client';
import { EvaluationType } from '../../generated/prisma/enums';

export function buildFixtures(module: TestingModule) {
  const prisma = module.get<PrismaService>(PrismaService);
  const usersService = module.get<UsersService>(UsersService, { strict: false });
  const coursesService = module.get<CoursesService>(CoursesService, { strict: false });
  const gradesService = module.get<GradesService>(GradesService, { strict: false });
  const attendancesService = module.get<AttendancesService>(AttendancesService, {
    strict: false,
  });

  const uniqueEmail = () => `user+${Date.now()}-${Math.floor(Math.random() * 100000)}@test.local`;
  return {
    prisma,
    usersService,
    coursesService,
    gradesService,
    attendancesService,

    async user(override?: { name?: string; email?: string; role?: Role }) {
      const email = override?.email ?? uniqueEmail();
      return prisma.user.create({
        data: {
          name: override?.name ?? 'Test User',
          email,
          role: override?.role ?? Role.USER,
        },
      });
    },

    async teacher(override?: { name?: string; email?: string }) {
      return this.user({
        name: override?.name ?? 'Test Teacher',
        email: override?.email ?? uniqueEmail(),
        role: Role.TEACHER,
      });
    },

    async student(override?: { name?: string; email?: string }) {
      return this.user({
        name: override?.name ?? 'Test Student',
        email: override?.email ?? uniqueEmail(),
        role: Role.STUDENT,
      });
    },

    async course(override?: {
      name?: string;
      description?: string;
      capacity?: number;
      semester?: string;
      teacherId?: string | null;
    }) {
      const teacherId =
        override?.teacherId ?? (await this.teacher()).id;
      const teacher = await prisma.user.findUnique({
        where: { id: teacherId },
      });
      if (!teacher) {
        throw new Error('Teacher not found for course fixture');
      }

      if (!coursesService) {
        throw new Error('CoursesService is not available in this test module');
      }

      return coursesService.create(
        {
          name: override?.name ?? `Test Course ${Date.now()}`,
          description: override?.description ?? 'Fixture course',
          capacity: override?.capacity ?? 10,
          semester: override?.semester ?? '2026S',
          teacherId,
        },
        teacher,
      );
    },

    async enroll(studentId: string, courseId: string) {
      if (!coursesService) {
        throw new Error('CoursesService is not available in this test module');
      }

      return coursesService.enroll(courseId, studentId);
    },

    async grade(override?: {
      courseId?: string;
      studentId?: string;
      createdById?: string;
      evaluationType?: EvaluationType;
      value?: number;
    }) {
      const courseId = override?.courseId ?? (await this.course()).id;
      const studentId = override?.studentId ?? (await this.student()).id;
      const createdById = override?.createdById ?? (await this.teacher()).id;

      return prisma.grade.create({
        data: {
          course: { connect: { id: courseId } },
          student: { connect: { id: studentId } },
          createdBy: { connect: { id: createdById } },
          evaluationType: override?.evaluationType ?? EvaluationType.EXAM,
          value: override?.value ?? 15,
        },
      });
    },

    async attendanceSession(override?: { courseId?: string; date?: string }) {
      if (!attendancesService) {
        throw new Error('AttendancesService is not available in this test module');
      }

      const courseId = override?.courseId ?? (await this.course()).id;
      const date = override?.date ?? new Date().toISOString();

      return attendancesService.createSession(courseId, { date });
    },

    async attendanceRecords(override: {
      courseId: string;
      sessionId: string;
      records: Array<{ studentId: string; present: boolean }>;
    }) {
      if (!attendancesService) {
        throw new Error('AttendancesService is not available in this test module');
      }

      return attendancesService.createRecord(
        override.courseId,
        override.sessionId,
        override.records,
      );
    },

    sessionFrom(user: { id: string; email: string; name?: string }) {
      const now = new Date();
      const sid = `session-${now.getTime()}-${Math.floor(Math.random() * 100000)}`;
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name ?? 'Test User',
        },
        session: {
          id: sid,
          userId: user.id,
          token: `token-${now.getTime()}`,
          expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        },
      };
    },

  };
}
