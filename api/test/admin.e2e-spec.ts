import request from 'supertest';
import {
  bootstrapE2E,
  resetDatabase,
  seedAndSignIn,
  seedUser,
  teardownE2E,
} from './e2e-helpers';

const ADMIN_ROUTE = '/admin';
const COURSES_ROUTE = '/courses';

describe('Admin (e2e)', () => {
  const e2eState: {
    ctx: Awaited<ReturnType<typeof bootstrapE2E>> | null;
  } = { ctx: null };

  beforeAll(async () => {
    e2eState.ctx = await bootstrapE2E();
  });

  beforeEach(async () => {
    if (e2eState.ctx) {
      await resetDatabase(e2eState.ctx.prisma);
    }
  });

  afterAll(async () => {
    await teardownE2E(e2eState.ctx);
  });

  it('admin can fetch semester stats', async () => {
    const admin = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'ADMIN',
    );
    const teacher = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'TEACHER',
    );
    const student = await seedUser(e2eState.ctx!.prisma, 'STUDENT');

    const courseResponse = await request(e2eState.ctx!.app.getHttpServer())
      .post(COURSES_ROUTE)
      .set('Cookie', teacher.cookie)
      .send({
        name: 'Admin Stats Course',
        description: 'Stats',
        capacity: 5,
        semester: 'Fall 2024',
      })
      .expect(201);

    await request(e2eState.ctx!.app.getHttpServer())
      .post(`${COURSES_ROUTE}/${courseResponse.body.id}/enroll`)
      .set('Cookie', admin.cookie)
      .send({ studentId: student.id })
      .expect(201);

    const response = await request(e2eState.ctx!.app.getHttpServer())
      .get(`${ADMIN_ROUTE}/stats?semester=Fall%202024`)
      .set('Cookie', admin.cookie)
      .expect(200);

    expect(response.body.semester).toBe('Fall 2024');
    expect(response.body.totalCourses).toBe(1);
  });

  it('admin can import enrollments via CSV', async () => {
    const admin = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'ADMIN',
    );
    const teacher = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'TEACHER',
    );
    const student = await seedUser(e2eState.ctx!.prisma, 'STUDENT');

    const courseResponse = await request(e2eState.ctx!.app.getHttpServer())
      .post(COURSES_ROUTE)
      .set('Cookie', teacher.cookie)
      .send({
        name: 'Admin Import Course',
        description: 'Import',
        capacity: 5,
        semester: 'Fall 2024',
      })
      .expect(201);

    const csv = `studentId,courseId\n${student.id},${courseResponse.body.id}`;

    const response = await request(e2eState.ctx!.app.getHttpServer())
      .post(`${ADMIN_ROUTE}/enrollments`)
      .set('Cookie', admin.cookie)
      .set('Content-Type', 'text/csv')
      .send(csv)
      .expect(201);

    expect(response.body.enrolled).toBe(1);
    expect(response.body.skipped).toEqual([]);
  });

  it('admin can request a semester report', async () => {
    const admin = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'ADMIN',
    );

    const response = await request(e2eState.ctx!.app.getHttpServer())
      .get(`${ADMIN_ROUTE}/semester/Fall%202024`)
      .set('Cookie', admin.cookie)
      .expect(200);

    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.text).toContain('Student name');
  });

  it('non-admin is forbidden', async () => {
    const student = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'STUDENT',
    );

    await request(e2eState.ctx!.app.getHttpServer())
      .get(`${ADMIN_ROUTE}/stats?semester=Fall%202024`)
      .set('Cookie', student.cookie)
      .expect(403);
  });

  it('rejects stats request without semester', async () => {
    const admin = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'ADMIN',
    );

    await request(e2eState.ctx!.app.getHttpServer())
      .get(`${ADMIN_ROUTE}/stats`)
      .set('Cookie', admin.cookie)
      .expect(400);
  });
});
