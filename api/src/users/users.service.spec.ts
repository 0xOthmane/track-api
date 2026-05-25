import { cleanDatabase, setupTestDb, teardownTestDb } from '../utils/test/setup-tests';
import { buildFixtures } from '../utils/test/test-fixtures';
import { UserRole } from './dto/create-user.dto';

describe('UsersService', () => {
  let ctx: Awaited<ReturnType<typeof setupTestDb>>;
  let service: import('./users.service').UsersService;
  let fixtures: ReturnType<typeof buildFixtures>;

  beforeAll(async () => {
    ctx = await setupTestDb();
    const { UsersService } = await import('./users.service');
    service = ctx.module.get(UsersService);
    fixtures = buildFixtures(ctx.module);
  });

  afterAll(async () => {
    if (ctx) await teardownTestDb(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  it('creates a user via auth', async () => {
    const email = 'admin@test.local';
    const result = await service.create({
      name: 'Admin User',
      email,
      password: 'StrongPassword123',
      role: UserRole.Admin,
    });

    expect(result.email).toBe(email.toLowerCase());
    expect(result.name).toBe('Admin User');
  });

  it('lists users with cursor pagination', async () => {
    await fixtures.user({ name: 'User One' });
    await fixtures.user({ name: 'User Two' });

    const result = await service.findAll({ limit: 10 });

    expect(result.data.length).toBeGreaterThanOrEqual(2);
    expect(result.meta).toHaveProperty('nextCursor');
  });

  it('finds a user by id', async () => {
    const user = await fixtures.user({ name: 'Lookup User' });

    const result = await service.findOne(user.id);

    expect(result.id).toBe(user.id);
    expect(result.name).toBe('Lookup User');
  });

  it('updates a user', async () => {
    const user = await fixtures.user({ name: 'Before Update' });

    const result = await service.update(user.id, { name: 'After Update' });

    expect(result.name).toBe('After Update');
  });

  it('removes a user', async () => {
    const user = await fixtures.user({ name: 'Delete User' });

    const result = await service.remove(user.id);

    expect(result.id).toBe(user.id);
    await expect(service.findOne(user.id)).rejects.toThrow('User not found');
  });
});
