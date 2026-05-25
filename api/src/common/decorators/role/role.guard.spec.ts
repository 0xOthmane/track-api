import 'reflect-metadata';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../generated/prisma/client';
import { ROLES_KEY } from './role.decorator';
import { auth as authType } from '../../../lib/auth';
import { RoleGuard as RoleGuardType } from './role.guard';
import { setupTestDb, teardownTestDb } from '../../../utils/test/setup-tests';

let auth: typeof authType;
let RoleGuard: typeof RoleGuardType;
let ctx: Awaited<ReturnType<typeof setupTestDb>>;

const getSetCookies = (headers: Headers) => {
  const typed = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof typed.getSetCookie === 'function') {
    return typed.getSetCookie();
  }
  const header = headers.get('set-cookie');
  return header ? [header] : [];
};

const buildCookieHeader = (headers: Headers) => {
  const cookies = getSetCookies(headers)
    .map((value) => value.split(';')[0])
    .filter(Boolean);
  return cookies.join('; ');
};

const createSessionCookie = async (role: Role) => {
  const email = `role-${role.toLowerCase()}-${Date.now()}@test.local`;
  const password = 'StrongPassword123';

  await auth.api.createUser({
    body: {
      email,
      password,
      name: `Role ${role}`,
      role,
    },
  });

  const signIn = await auth.api.signInEmail({
    body: { email, password, rememberMe: false },
    returnHeaders: true,
  });

  return buildCookieHeader(signIn.headers);
};

const createContext = (
  headers: Record<string, string> = {},
  handler?: () => void,
  classRef?: new () => void,
) => {
  const request = { headers } as { headers: Record<string, string> };
  const ctxHandler = handler ?? (() => undefined);
  class TestClass {}
  const ctxClass = classRef ?? TestClass;
  const context: ExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => request,
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
    getHandler: () => ctxHandler,
    getClass: () => ctxClass,
    getArgs: () => [],
    getArgByIndex: () => undefined,
    getType: () => 'http',
  };
  return { context, request, handler: ctxHandler, ctxClass };
};

beforeAll(async () => {
  ctx = await setupTestDb();
  ({ auth } = await import('../../lib/auth'));
  ({ RoleGuard } = await import('./role.guard'));
});

afterAll(async () => {
  if (ctx) await teardownTestDb(ctx);
});

describe('RoleGuard', () => {
  let reflector: Reflector;
  let guard: InstanceType<typeof RoleGuard>;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RoleGuard(reflector);
  });

  it('throws UnauthorizedException when not authenticated', async () => {
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('allows when no roles are required', async () => {
    const cookieHeader = await createSessionCookie(Role.USER);
    const { context, request } = createContext({ cookie: cookieHeader });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request).toHaveProperty('user');
  });

  it('throws ForbiddenException when role is missing', async () => {
    const cookieHeader = await createSessionCookie(Role.USER);
    const handler = () => undefined;
    Reflect.defineMetadata(ROLES_KEY, ['ADMIN'], handler);
    const { context } = createContext({ cookie: cookieHeader }, handler);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows when role is present', async () => {
    const cookieHeader = await createSessionCookie(Role.ADMIN);
    const handler = () => undefined;
    Reflect.defineMetadata(ROLES_KEY, ['ADMIN'], handler);
    const { context } = createContext({ cookie: cookieHeader }, handler);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
