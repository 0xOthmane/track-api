import type { PrismaService } from '../../prisma/prisma.service';
import { auth } from '../../lib/auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { betterAuth } from 'better-auth';
import { admin, openAPI } from 'better-auth/plugins';

export async function createTestAuth(prisma: PrismaService) {
  const instance = betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    emailAndPassword: { enabled: true },
    user: {
      additionalFields: { role: { type: 'string', defaultValue: 'USER' } },
    },
    disabledPaths: [],
    rateLimit: { enabled: false },
    plugins: [admin(), openAPI()],
  });

  return instance;
}

export async function installTestAuth(testAuth: TestAuthInstance) {
  if (auth) {
    auth.api = testAuth.api;
  }
}

export type TestAuthInstance = Awaited<ReturnType<typeof createTestAuth>>;
