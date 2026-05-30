import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { redis } from './lib/redis';
/**
 * AppService
 *
 * Provides lightweight health checks and application-level utilities.
 * Used by the HTTP health endpoint to verify connectivity to core
 * dependencies (database and Redis).
 */
@Injectable()
export class AppService {
  constructor(private readonly prismaService: PrismaService) {}
  /**
   * Check health of core dependencies.
   * @returns An object with `status` set to `ok` when both DB and Redis are available, otherwise `degraded`.
   */
  async getHealth() {
    const [databaseResult, redisResult] = await Promise.allSettled([
      this.prismaService.$queryRaw`SELECT 1`,
      redis.ping(),
    ]);

    const databaseConnected = databaseResult.status === 'fulfilled';
    const redisConnected =
      redisResult.status === 'fulfilled' && redisResult.value === 'PONG';

    return {
      status: databaseConnected && redisConnected ? 'ok' : 'degraded',
    };
  }
}
