import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppLoggerService } from './app-logger.service';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                },
              }
            : undefined,
        level: process.env.LOG_LEVEL || 'info',
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
  exports: [LoggerModule],
  providers: [AppLoggerService],
})
export class AppLoggerModule {}
