import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
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
import { BullModule } from '@nestjs/bullmq';
import { CoursesModule } from './courses/courses.module';
import { GradesModule } from './grades/grades.module';
import { env } from './config/env.config';
import { AttendancesModule } from './attendances/attendances.module';
import { AdminModule } from './admin/admin.module';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';

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
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
