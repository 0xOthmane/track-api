import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { redis } from './lib/redis';

@Injectable()
export class AppService {
  constructor(private readonly prismaService: PrismaService) {}

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
