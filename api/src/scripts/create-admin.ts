import { auth } from '../lib/auth';
import { PrismaClient } from '../generated/prisma/client';
import { env } from '../config/env.config';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

function requireArg(value: string | undefined, label: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required ${label}`);
  }
  return value.trim();
}

async function main() {
  const email = requireArg(process.argv[2], 'email argument');
  const password = requireArg(process.argv[3], 'password argument');
  const name = process.argv[4]?.trim() || 'Admin';

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (existing) {
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'ADMIN' },
      });
    }

    console.log(`Admin already exists for ${email}`);
    return;
  }

  await auth.api.createUser({
    body: {
      name,
      email,
      password,
      data: {
        role: 'ADMIN',
      },
    },
  });

  console.log(`Admin created for ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
