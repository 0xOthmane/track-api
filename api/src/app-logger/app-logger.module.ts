import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppLoggerService } from './app-logger.service';
import { getEnv } from '../config/env.config';

const env = getEnv();

const devTransport = {
  target: 'pino-pretty',
  options: {
    colorize: true,
    singleLine: true,
  },
};

const prodTransport = env.LOKI_URL
  ? {
      target: 'pino-loki',
      options: {
        host: env.LOKI_URL,
        labels: {
          app: env.LOKI_APP_NAME,
          env: env.NODE_ENV,
        },
        batching: true,
        interval: 5,
      },
    }
  : undefined;

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport: env.NODE_ENV !== 'production' ? devTransport : prodTransport,
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
