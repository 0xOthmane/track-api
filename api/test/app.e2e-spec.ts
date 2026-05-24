import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';

jest.mock('../src/lib/redis', () => ({
  redis: {
    ping: jest.fn(),
  },
}));

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let appService: {
    getHealth: jest.Mock;
  };

  beforeEach(async () => {
    appService = {
      getHealth: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: appService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', async () => {
    appService.getHealth.mockResolvedValue({
      status: 'ok',
    });

    await request(app.getHttpServer()).get('/health').expect(200).expect({
      status: 'ok',
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
