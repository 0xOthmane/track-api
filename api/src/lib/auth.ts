import { betterAuth } from 'better-auth';
import { PrismaPg } from '@prisma/adapter-pg';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '../generated/prisma/client';
import { openAPI } from 'better-auth/plugins';
import { env } from '../config/env.config';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  user: {
    additionalFields: {
      role: {
        type: 'string',
        input: false,
        defaultValue: 'USER',
      },
    },
  },
  disabledPaths: [
    '/sign-up/email',
    '/forget-password',
    // '/reset-password',
    '/update-user',
    '/delete-user',
    '/change-email',
    '/change-password',
    '/list-sessions',
    '/revoke-session',
    '/revoke-sessions',
    '/revoke-other-sessions',
    '/sign-in/social',
    '/get-session',
    '/verify-password',
    '/verify-email',
    '/send-verification-email',
    '/update-session',
    '/request-password-reset',
    '/link-social',
    '/list-accounts',
    '/delete-user/callback',
    '/unlink-account',
    '/refresh-token',
    '/get-access-token',
    '/account-info',
    '/ok',
    '/error',
  ],
  plugins: [openAPI()],
});
