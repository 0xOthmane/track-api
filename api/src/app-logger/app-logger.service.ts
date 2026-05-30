import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PinoLogger } from 'nestjs-pino';

/**
 * AppLoggerService
 *
 * Small wrapper around `nestjs-pino` that attaches the current
 * correlationId from CLS to structured log entries and provides
 * convenience methods used across the application.
 */
@Injectable()
export class AppLoggerService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly cls: ClsService,
  ) {}

  /**
   * Log an informational message with optional structured data.
   * The current `correlationId` (if present) is attached automatically.
   */
  info(message: string, data?: Record<string, unknown>) {
    this.logger.info({
      ...data,
      correlationId: this.cls.get<string>('correlationId'),
      message,
    });
  }

  /**
   * Log an error with an optional error payload. Includes `correlationId`.
   */
  error(message: string, error?: unknown) {
    this.logger.error({
      correlationId: this.cls.get<string>('correlationId'),
      message,
      error,
    });
  }
}
