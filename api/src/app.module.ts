import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { ClsModule } from 'nestjs-cls';
import { auth } from './lib/auth';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { AppLoggerModule } from './app-logger/app-logger.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { validate } from './lib/env';

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
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
