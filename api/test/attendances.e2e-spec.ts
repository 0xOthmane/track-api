import request from 'supertest';
import {
  bootstrapE2E,
  resetDatabase,
  seedAndSignIn,
  seedUser,
  teardownE2E,
} from './e2e-helpers';

const COURSES_ROUTE = '/courses';

function sessionsRoute(courseId: string) {
  return `${COURSES_ROUTE}/${courseId}/attendance-sessions`;
}

describe('Attendances (e2e)', () => {
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

  it('teacher creates session and records', async () => {
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
        name: 'Attendance Course',
        description: 'Attendance',
        capacity: 5,
        semester: 'Fall 2024',
      })
      .expect(201);

    const sessionResponse = await request(e2eState.ctx!.app.getHttpServer())
      .post(sessionsRoute(courseResponse.body.id))
      .set('Cookie', teacher.cookie)
      .send({ date: new Date().toISOString() })
      .expect(201);

    const recordsResponse = await request(e2eState.ctx!.app.getHttpServer())
      .post(
        `${sessionsRoute(courseResponse.body.id)}/${sessionResponse.body.id}/records`,
      )
      .set('Cookie', teacher.cookie)
      .send({
        records: [{ studentId: student.id, present: true }],
      })
      .expect(201);

    expect(recordsResponse.body.records.length).toBe(1);
  });

  it('student can view attendance records', async () => {
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
        name: 'Attendance Records',
        description: 'Attendance',
        capacity: 5,
        semester: 'Fall 2024',
      })
      .expect(201);

    const sessionResponse = await request(e2eState.ctx!.app.getHttpServer())
      .post(sessionsRoute(courseResponse.body.id))
      .set('Cookie', teacher.cookie)
      .send({ date: new Date().toISOString() })
      .expect(201);

    await request(e2eState.ctx!.app.getHttpServer())
      .post(
        `${sessionsRoute(courseResponse.body.id)}/${sessionResponse.body.id}/records`,
      )
      .set('Cookie', teacher.cookie)
      .send({
        records: [{ studentId: student.id, present: false }],
      })
      .expect(201);

    const response = await request(e2eState.ctx!.app.getHttpServer())
      .get(`${sessionsRoute(courseResponse.body.id)}/student-records`)
      .set('Cookie', student.cookie)
      .expect(200);

    expect(response.body.length).toBe(1);
    expect(response.body[0].studentId).toBe(student.id);
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
    const student = await seedUser(e2eState.ctx!.prisma, 'STUDENT');

    const courseResponse = await request(e2eState.ctx!.app.getHttpServer())
      .post(COURSES_ROUTE)
      .set('Cookie', owner.cookie)
      .send({
        name: 'Ownership Attendance',
        description: 'Attendance',
        capacity: 5,
        semester: 'Fall 2024',
      })
      .expect(201);

    const sessionResponse = await request(e2eState.ctx!.app.getHttpServer())
      .post(sessionsRoute(courseResponse.body.id))
      .set('Cookie', owner.cookie)
      .send({ date: new Date().toISOString() })
      .expect(201);

    await request(e2eState.ctx!.app.getHttpServer())
      .post(
        `${sessionsRoute(courseResponse.body.id)}/${sessionResponse.body.id}/records`,
      )
      .set('Cookie', owner.cookie)
      .send({
        records: [{ studentId: student.id, present: true }],
      })
      .expect(201);

    const record = await e2eState.ctx!.prisma.attendanceRecord.findFirstOrThrow(
      {
        where: { sessionId: sessionResponse.body.id, studentId: student.id },
      },
    );

    await request(e2eState.ctx!.app.getHttpServer())
      .patch(`${sessionsRoute(courseResponse.body.id)}/${record.id}`)
      .set('Cookie', otherTeacher.cookie)
      .send({ present: false })
      .expect(403);
  });

  it('returns 404 for missing session stats', async () => {
    const teacher = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'TEACHER',
    );

    await request(e2eState.ctx!.app.getHttpServer())
      .get(`${sessionsRoute('missing-course')}/missing-session/stats`)
      .set('Cookie', teacher.cookie)
      .expect(404);
  });
});
