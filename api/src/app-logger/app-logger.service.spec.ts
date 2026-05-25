import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule, ClsService } from 'nestjs-cls';
import { AppLoggerModule } from './app-logger.module';
import { AppLoggerService } from './app-logger.service';

describe('AppLoggerService', () => {
  let service: AppLoggerService;
  let cls: ClsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppLoggerModule, ClsModule.forRoot({ global: true })],
    }).compile();

    service = module.get<AppLoggerService>(AppLoggerService);
    cls = module.get(ClsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('logs with a correlation id when available', async () => {
    await cls.run(async () => {
      cls.set('correlationId', 'corr-test-1');
      service.info('Test log entry', { scope: 'logger' });
      service.error('Test error entry', new Error('boom'));
    });
  });
});
