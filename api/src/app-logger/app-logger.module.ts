import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppLoggerService } from './app-logger.service';
import { env } from '../config/env.config';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                },
              }
            : undefined,
        level: env.LOG_LEVEL,
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers.set-cookie',
        ],
        customProps: (req) => ({
          correlationId: req.headers['x-correlation-id'],
        }),
      },
    }),
  ],
  exports: [LoggerModule, AppLoggerService],
  providers: [AppLoggerService],
})
export class AppLoggerModule {}
