import request from 'supertest';
import {
  bootstrapE2E,
  resetDatabase,
  seedAndSignIn,
  seedUser,
  teardownE2E,
} from './e2e-helpers';

const COURSES_ROUTE = '/courses';
const GRADES_ROUTE = '/grades';

describe('Grades (e2e)', () => {
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

  it('teacher can create a grade', async () => {
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
        name: 'Grades Course',
        description: 'Grades',
        capacity: 5,
        semester: 'Fall 2024',
      })
      .expect(201);

    const gradeResponse = await request(e2eState.ctx!.app.getHttpServer())
      .post(GRADES_ROUTE)
      .set('Cookie', teacher.cookie)
      .send({
        value: 16,
        courseId: courseResponse.body.id,
        studentId: student.id,
        evaluationType: 'EXAM',
      })
      .expect(201);

    expect(gradeResponse.body.value).toBe(16);
  });

  it('student can fetch own grades', async () => {
    const teacher = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'TEACHER',
    );
    const student = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'STUDENT',
    );

    const courseResponse = await request(e2eState.ctx!.app.getHttpServer())
      .post(COURSES_ROUTE)
      .set('Cookie', teacher.cookie)
      .send({
        name: 'Student Grades',
        description: 'Grades',
        capacity: 5,
        semester: 'Fall 2024',
      })
      .expect(201);

    await request(e2eState.ctx!.app.getHttpServer())
      .post(GRADES_ROUTE)
      .set('Cookie', teacher.cookie)
      .send({
        value: 14,
        courseId: courseResponse.body.id,
        studentId: student.id,
        evaluationType: 'QUIZ',
      })
      .expect(201);

    const response = await request(e2eState.ctx!.app.getHttpServer())
      .get(`${GRADES_ROUTE}/me?limit=10`)
      .set('Cookie', student.cookie)
      .expect(200);

    expect(response.body.data.length).toBe(1);
  });

  it('student cannot create a grade', async () => {
    const student = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'STUDENT',
    );

    await request(e2eState.ctx!.app.getHttpServer())
      .post(GRADES_ROUTE)
      .set('Cookie', student.cookie)
      .send({
        value: 16,
        courseId: 'missing-course',
        studentId: 'missing-student',
        evaluationType: 'EXAM',
      })
      .expect(403);
  });

  it('rejects invalid grade payload', async () => {
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
        name: 'Invalid Grade Course',
        description: 'Grades',
        capacity: 5,
        semester: 'Fall 2024',
      })
      .expect(201);

    await request(e2eState.ctx!.app.getHttpServer())
      .post(GRADES_ROUTE)
      .set('Cookie', teacher.cookie)
      .send({
        value: 99,
        courseId: courseResponse.body.id,
        studentId: student.id,
        evaluationType: 'EXAM',
      })
      .expect(400);
  });

  it('returns 404 for missing grade', async () => {
    const admin = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'ADMIN',
    );

    await request(e2eState.ctx!.app.getHttpServer())
      .get(`${GRADES_ROUTE}/missing-grade`)
      .set('Cookie', admin.cookie)
      .expect(404);
  });
});
