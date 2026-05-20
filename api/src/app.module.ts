import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { ClsModule } from 'nestjs-cls';
import { auth } from './lib/auth';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { AppLoggerModule } from './app-logger/app-logger.module';

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
    AppLoggerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
