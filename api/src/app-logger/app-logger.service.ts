import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class AppLoggerService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly cls: ClsService,
  ) {}

  info(message: string, data?: Record<string, unknown>) {
    this.logger.info({
      correlationId: this.cls.get('correlationId'),
      ...data,
      message,
    });
  }
  error(message: string, error?: unknown) {
    this.logger.error({
      correlationId: this.cls.get('correlationId'),
      message,
      error,
    });
  }
}
