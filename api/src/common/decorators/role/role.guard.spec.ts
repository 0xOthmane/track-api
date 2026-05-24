import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, Session, User } from '../generated/prisma/client';
import { ROLES_KEY } from './role.decorator';
import { setupTestDb, teardownTestDb } from '../../utils/test/setup-tests';
import { createTestAuth } from '../../utils/test/auth-helper';

let auth: any;
let RoleGuard: any;
let ctx: Awaited<ReturnType<typeof setupTestDb>> | null = null;
beforeAll(async () => {
  ctx = await setupTestDb();
  // create a better-auth instance bound to the test Prisma client
  await createTestAuth(ctx.prisma);

  // require auth and the guard after DATABASE_URL is set so modules initialize against test DB
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  auth = require('../lib/auth').auth;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RoleGuard = require('./role.guard').RoleGuard;
});

afterAll(async () => {
  if (ctx) await teardownTestDb(ctx);
});

const createContext = (
  headers: Record<string, string> = {},
): ExecutionContext => {
  const handler = () => undefined;
  class TestClass {}
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
    switchToRpc: () => ({
      getContext: () => undefined,
      getData: () => undefined,
    }),
    switchToWs: () => ({
      getClient: () => undefined,
      getData: () => undefined,
      getPattern: () => undefined,
    }),
    getHandler: () => handler,
    getClass: () => TestClass,
    getArgs: () => [],
    getArgByIndex: () => undefined,
    getType: () => 'http',
  };
};

type AuthSession = { user: User; session: Session };

const createUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-id',
  name: 'Test User',
  email: 'user@example.com',
  emailVerified: false,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  role: Role.USER,
  ...overrides,
});

const createSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'session-id',
  expiresAt: new Date(Date.now() + 60_000),
  token: 'session-token',
  createdAt: new Date(),
  updatedAt: new Date(),
  ipAddress: null,
  userAgent: null,
  userId: 'user-id',
  ...overrides,
});

const createAuthSession = (
  overrides: Partial<AuthSession> = {},
): AuthSession => {
  const user = overrides.user ?? createUser();
  const session = overrides.session ?? createSession({ userId: user.id });
  return {
    user,
    session,
    ...overrides,
  };
};

describe('RoleGuard', () => {
  let reflector: Reflector;
  let guard: RoleGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RoleGuard(reflector);
    jest.clearAllMocks();
  });

  it('throws UnauthorizedException when not authenticated', async () => {
    jest.spyOn(auth.api, 'getSession').mockResolvedValue(null);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('allows when no roles are required', async () => {
    jest.spyOn(auth.api, 'getSession').mockResolvedValue(createAuthSession());
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('throws ForbiddenException when role is missing', async () => {
    jest.spyOn(auth.api, 'getSession').mockResolvedValue(createAuthSession());
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows when role is present', async () => {
    const user = createUser({ role: Role.ADMIN });
    jest
      .spyOn(auth.api, 'getSession')
      .mockResolvedValue(createAuthSession({ user }));
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('defaults to USER role when missing', async () => {
    const user = {
      ...createUser(),
      role: 'USER',
    } as AuthSession['user'];
    jest
      .spyOn(auth.api, 'getSession')
      .mockResolvedValue(createAuthSession({ user }));
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['USER']);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('reads required roles using the metadata key', async () => {
    const getSpy = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([]);
    jest.spyOn(auth.api, 'getSession').mockResolvedValue(createAuthSession());

    await guard.canActivate(createContext());

    expect(getSpy).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
  });
});
