import { cleanDatabase, setupTestDb, teardownTestDb } from '../utils/test/setup-tests';
import { buildFixtures } from '../utils/test/test-fixtures';
import { UserRole } from './dto/create-user.dto';

describe('UsersController', () => {
  let ctx: Awaited<ReturnType<typeof setupTestDb>>;
  let controller: import('./users.controller').UsersController;
  let fixtures: ReturnType<typeof buildFixtures>;

  beforeAll(async () => {
    ctx = await setupTestDb();
    const { UsersController } = await import('./users.controller');
    controller = ctx.module.get(UsersController);
    fixtures = buildFixtures(ctx.module);
  });

  afterAll(async () => {
    if (ctx) await teardownTestDb(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a user', async () => {
    const result = await controller.create({
      name: 'Controller User',
      email: 'controller.user@test.local',
      password: 'StrongPassword123',
      role: UserRole.Admin,
    });

    expect(result.email).toBe('controller.user@test.local');
  });

  it('lists users with pagination metadata', async () => {
    await fixtures.user({ name: 'List User 1' });
    await fixtures.user({ name: 'List User 2' });

    const result = await controller.findAll({ limit: 10 });

    expect(result.data.length).toBeGreaterThanOrEqual(2);
    expect(result.meta).toHaveProperty('nextCursor');
  });

  it('gets a user by id', async () => {
    const user = await fixtures.user({ name: 'Get User' });

    const result = await controller.findOne(user.id);

    expect(result.id).toBe(user.id);
  });

  it('updates a user', async () => {
    const user = await fixtures.user({ name: 'Before Update' });

    const result = await controller.update(user.id, { name: 'After Update' });

    expect(result.name).toBe('After Update');
  });

  it('removes a user', async () => {
    const user = await fixtures.user({ name: 'Remove User' });

    const result = await controller.remove(user.id);

    expect(result.id).toBe(user.id);
  });
});
