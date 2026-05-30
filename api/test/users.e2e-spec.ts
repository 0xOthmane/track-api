import request from 'supertest';
import {
  bootstrapE2E,
  resetDatabase,
  seedAndSignIn,
  seedUser,
  signIn,
  teardownE2E,
} from './e2e-helpers';

const USER_ROUTE = '/users';

describe('Users (e2e)', () => {
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

  it('admin can create a user', async () => {
    const admin = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'ADMIN',
    );

    const response = await request(e2eState.ctx!.app.getHttpServer())
      .post(USER_ROUTE)
      .set('Cookie', admin.cookie)
      .send({
        name: 'E2E Student',
        email: 'e2e.student@test.local',
        password: 'StrongPassword123!',
        role: 'STUDENT',
      })
      .expect(201);

    expect(response.body.email).toBe('e2e.student@test.local');
    expect(response.body.role).toBe('STUDENT');
  });

  it('admin can list users', async () => {
    const admin = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'ADMIN',
    );

    await seedUser(e2eState.ctx!.prisma, 'STUDENT', {
      email: 'list.user@test.local',
    });

    const response = await request(e2eState.ctx!.app.getHttpServer())
      .get(USER_ROUTE)
      .set('Cookie', admin.cookie)
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('rejects unauthenticated requests', async () => {
    await request(e2eState.ctx!.app.getHttpServer())
      .get(USER_ROUTE)
      .expect(401);
  });

  it('non-admin is forbidden', async () => {
    await seedUser(e2eState.ctx!.prisma, 'STUDENT', {
      email: 'student-only@test.local',
      password: 'StrongPassword123!',
    });

    const studentCookie = await signIn(
      e2eState.ctx!.app,
      'student-only@test.local',
      'StrongPassword123!',
    );

    await request(e2eState.ctx!.app.getHttpServer())
      .get(USER_ROUTE)
      .set('Cookie', studentCookie)
      .expect(403);
  });

  it('returns 404 for missing user', async () => {
    const admin = await seedAndSignIn(
      e2eState.ctx!.app,
      e2eState.ctx!.prisma,
      'ADMIN',
    );

    await request(e2eState.ctx!.app.getHttpServer())
      .get(`${USER_ROUTE}/missing-id`)
      .set('Cookie', admin.cookie)
      .expect(404);
  });
});
