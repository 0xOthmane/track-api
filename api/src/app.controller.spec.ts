jest.mock('./lib/redis', () => ({
  redis: {
    ping: jest.fn(),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: {
    getHealth: jest.Mock;
  };

  beforeEach(async () => {
    appService = {
      getHealth: jest.fn(),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: appService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return the service health payload', async () => {
      appService.getHealth.mockResolvedValue({
        status: 'ok',
      });

      await expect(appController.getHealth()).resolves.toEqual({
        status: 'ok',
      });
    });
  });
});
