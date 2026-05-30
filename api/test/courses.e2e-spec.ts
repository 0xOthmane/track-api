import request from 'supertest';
import {
  bootstrapE2E,
  resetDatabase,
  seedAndSignIn,
  seedUser,
  teardownE2E,
} from './e2e-helpers';

const COURSES_ROUTE = '/courses';

describe('Courses (e2e)', () => {
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

  it('teacher can create a course', async () => {
    const teacher = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'TEACHER',
    );

    const response = await request(e2eState.ctx!.app.getHttpServer())
      .post(COURSES_ROUTE)
      .set('Cookie', teacher.cookie)
      .send({
        name: 'E2E Course',
        description: 'Course for e2e',
        capacity: 10,
        semester: 'Fall 2024',
      })
      .expect(201);

    expect(response.body.name).toBe('E2E Course');
    expect(response.body.teacher.name).toBe('TEACHER User');
  });

  it('student cannot create a course', async () => {
    const student = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'STUDENT',
    );

    await request(e2eState.ctx!.app.getHttpServer())
      .post(COURSES_ROUTE)
      .set('Cookie', student.cookie)
      .send({
        name: 'Blocked Course',
        description: 'Should fail',
        capacity: 10,
        semester: 'Fall 2024',
      })
      .expect(403);
  });

  it('rejects invalid course payload', async () => {
    const teacher = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'TEACHER',
    );

    await request(e2eState.ctx!.app.getHttpServer())
      .post(COURSES_ROUTE)
      .set('Cookie', teacher.cookie)
      .send({
        name: 'A',
        description: 'Invalid',
        capacity: 0,
        semester: 'Fall',
      })
      .expect(400);
  });

  it('admin can enroll a student', async () => {
    const teacher = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'TEACHER',
    );
    const admin = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'ADMIN',
    );
    const student = await seedUser(e2eState.ctx!.prisma, 'STUDENT');

    const courseResponse = await request(e2eState.ctx!.app.getHttpServer())
      .post(COURSES_ROUTE)
      .set('Cookie', teacher.cookie)
      .send({
        name: 'Enrollment Course',
        description: 'Enrollment',
        capacity: 5,
        semester: 'Fall 2024',
      })
      .expect(201);

    const enrollResponse = await request(e2eState.ctx!.app.getHttpServer())
      .post(`${COURSES_ROUTE}/${courseResponse.body.id}/enroll`)
      .set('Cookie', admin.cookie)
      .send({ studentId: student.id })
      .expect(201);

    expect(enrollResponse.body.studentName).toBe(student.name);
  });

  it('rejects weights when total exceeds 100', async () => {
    const teacher = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'TEACHER',
    );

    const courseResponse = await request(e2eState.ctx!.app.getHttpServer())
      .post(COURSES_ROUTE)
      .set('Cookie', teacher.cookie)
      .send({
        name: 'Weights Course',
        description: 'Weights',
        capacity: 5,
        semester: 'Fall 2024',
      })
      .expect(201);

    await request(e2eState.ctx!.app.getHttpServer())
      .post(`${COURSES_ROUTE}/${courseResponse.body.id}/weights`)
      .set('Cookie', teacher.cookie)
      .send({ type: 'EXAM', weight: 90 })
      .expect(201);

    await request(e2eState.ctx!.app.getHttpServer())
      .post(`${COURSES_ROUTE}/${courseResponse.body.id}/weights`)
      .set('Cookie', teacher.cookie)
      .send({ type: 'QUIZ', weight: 20 })
      .expect(400);
  });

  it('rejects updates from non-owner teacher', async () => {
    const owner = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'TEACHER',
    );
    const otherTeacher = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'TEACHER',
    );

    const courseResponse = await request(e2eState.ctx!.app.getHttpServer())
      .post(COURSES_ROUTE)
      .set('Cookie', owner.cookie)
      .send({
        name: 'Ownership Course',
        description: 'Ownership',
        capacity: 5,
        semester: 'Fall 2024',
      })
      .expect(201);

    await request(e2eState.ctx!.app.getHttpServer())
      .patch(`${COURSES_ROUTE}/${courseResponse.body.id}`)
      .set('Cookie', otherTeacher.cookie)
      .send({ name: 'Updated Name' })
      .expect(403);
  });
});
