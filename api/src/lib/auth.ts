import { betterAuth } from 'better-auth';
import { PrismaPg } from '@prisma/adapter-pg';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '../generated/prisma/client';
import { admin, openAPI } from 'better-auth/plugins';
import { getEnv } from '../config/env.config';
// import { redis } from './redis';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: getEnv().DATABASE_URL }),
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
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
  rateLimit: getEnv().NODE_ENV === 'test'
    ? { enabled: false }
    : {
          enabled: true,
          window: 60,
          limit: 100,
          customRules: {
            '/sign-in/email': {
              window: 60,
              max: 5,
            },
            '/sign-out': {
              window: 30,
              max: 20,
            },
          },
          // customStorage: {
          //   get: async (key) => redis.get(key),
          //   set: async (key, value) => redis.set(key, value),
          // },
        },
  plugins: [admin(), openAPI()],
});
