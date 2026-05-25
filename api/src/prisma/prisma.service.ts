import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { env } from '../config/env.config';

/**
 * PrismaService
 *
 * Wraps the generated Prisma client and wires lifecycle hooks for NestJS modules.
 * - Connects to the database on module init (if `DATABASE_URL` is set)
 * - Disconnects on module destroy
 *
 * Usage: inject `PrismaService` where database access is required.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly databaseUrl: string;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL ?? env.DATABASE_URL;

    super({
      adapter: new PrismaPg({
        connectionString: databaseUrl,
      }),
    });

    this.databaseUrl = databaseUrl;
  }

  async onModuleInit() {
    if (!this.databaseUrl) {
      return;
    }

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
