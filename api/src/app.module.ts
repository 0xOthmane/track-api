import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { ClsModule } from 'nestjs-cls';
import { auth } from './lib/auth';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { AppLoggerModule } from './app-logger/app-logger.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { validate } from './lib/env';
import { UsersModule } from './users/users.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { redis } from './lib/redis';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { CoursesModule } from './courses/courses.module';
import { GradesModule } from './grades/grades.module';
import { env } from './config/env.config';
import { AttendancesModule } from './attendances/attendances.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    AuthModule.forRoot({ auth }),
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup(cls, req: Request, res: Response) {
          const correlationId =
            req.headers['x-correlation-id']?.toString() ?? randomUUID();
          cls.set('correlationId', correlationId);
          res.setHeader('x-correlation-id', correlationId);
        },
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    AppLoggerModule,
    PrismaModule,
    UsersModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
      storage: new ThrottlerStorageRedisService(redis),
    }),
    BullModule.forRoot({
      connection: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
      },
    }),
    CoursesModule,
    GradesModule,
    AttendancesModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'APP_GUARD',
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
