import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule, ClsService } from 'nestjs-cls';
import { PinoLogger } from 'nestjs-pino';
import { AppLoggerModule } from './app-logger.module';
import { AppLoggerService } from './app-logger.service';

describe('AppLoggerService', () => {
  let service: AppLoggerService;
  let cls: ClsService;
  let logger: PinoLogger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppLoggerModule, ClsModule.forRoot({ global: true })],
    }).compile();

    service = module.get<AppLoggerService>(AppLoggerService);
    cls = module.get(ClsService);
    logger = (service as unknown as { logger: PinoLogger }).logger;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('logs with a correlation id when available', async () => {
    let lastInfo: Record<string, unknown> | null = null;
    let lastError: Record<string, unknown> | null = null;
    const originalInfo = logger.info.bind(logger);
    const originalError = logger.error.bind(logger);

    logger.info = (payload: Record<string, unknown>, msg?: string) => {
      lastInfo = payload;
      return originalInfo(payload, msg);
    };

    logger.error = (payload: Record<string, unknown>, msg?: string) => {
      lastError = payload;
      return originalError(payload, msg);
    };

    await cls.run(async () => {
      cls.set('correlationId', 'corr-test-1');
      service.info('Test log entry', { scope: 'logger' });
      service.error('Test error entry', new Error('boom'));
    });

    expect(lastInfo).toMatchObject({ correlationId: 'corr-test-1' });
    expect(lastError).toMatchObject({ correlationId: 'corr-test-1' });
  });
});
