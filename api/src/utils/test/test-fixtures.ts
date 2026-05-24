import { TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';

export function buildFixtures(module: TestingModule) {
  const prisma = module.get<PrismaService>(PrismaService);
  //   const usersService = module.get(UsersService);
  //   type CreatedUser = Awaited<ReturnType<typeof usersService.create>>;
  //   return {
  //     user(override?: { email?: string; name?: string; password?: string }) {
  //       return usersService.create({
  //         email: override?.email ?? 'alice@test.com',
  //         name: override?.name ?? 'Alice Smith',
  //       });
  //     },
  //     session(user: CreatedUser): UserSession {
  //       const now = new Date();
  //       return {
  //         user: {
  //           id: user.id,
  //           email: user.email,
  //           name: user.name,
  //         },
  //         session: {
  //           id: 'session-id',
  //           userId: user.id,
  //           token: 'session-token',
  //           expiresAt: now,
  //         },
  //       } as UserSession;
  //     },
  //   };
  return {
    async user(override?: { name?: string; email?: string; role?: any }) {
      const email = override?.email ?? `user+${Date.now()}@test.local`;
      const data: any = {
        name: override?.name ?? 'Test User',
        email,
      };
      if (override?.role) data.role = override.role;
      return prisma.user.create({ data });
    },

    async course(override?: {
      name?: string;
      description?: string;
      capacity?: number;
      semester?: string;
      teacherId?: string | null;
    }) {
      return prisma.course.create({
        data: {
          name: override?.name ?? `Test Course ${Date.now()}`,
          description: override?.description ?? 'Fixture course',
          capacity: override?.capacity ?? 10,
          semester: override?.semester ?? '2026S',
          teacherId: override?.teacherId ?? null,
        },
      });
    },

    async enroll(studentId: string, courseId: string) {
      return prisma.enrollment.create({
        data: {
          studentId,
          courseId,
        },
      });
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

    prisma,
  };
}
