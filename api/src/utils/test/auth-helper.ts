import type { PrismaService } from '../../prisma/prisma.service';

export async function createTestAuth(prisma: PrismaService) {
  const { betterAuth } = await import('better-auth');
  const { prismaAdapter } = await import('better-auth/adapters/prisma');
  const { admin, openAPI } = await import('better-auth/plugins');

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

export type TestAuthInstance = Awaited<ReturnType<typeof createTestAuth>>;
