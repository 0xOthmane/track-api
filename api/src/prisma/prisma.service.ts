import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { getEnv } from '../config/env.config';

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
    const databaseUrl = process.env.DATABASE_URL ?? getEnv().DATABASE_URL;

    super({
      adapter: new PrismaPg({
        connectionString: databaseUrl,
      }),
    });

    this.databaseUrl = databaseUrl;
  }

  /**
   * Lifecycle hook called when the NestJS module initializes. Connects
   * the Prisma client to the database if a connection string is present.
   */
  async onModuleInit() {
    if (!this.databaseUrl) {
      return;
    }

    await this.$connect();
  }

  /**
   * Lifecycle hook called when the NestJS module is destroyed. Ensures the
   * Prisma client disconnects cleanly from the database.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
