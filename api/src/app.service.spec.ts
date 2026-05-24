const mockRedisPing = jest.fn();

jest.mock('./lib/redis', () => ({
  redis: {
    ping: mockRedisPing,
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppService', () => {
  let service: AppService;
  let prismaService: {
    $queryRaw: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      $queryRaw: jest.fn(),
    };
    mockRedisPing.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    jest.clearAllMocks();
  });

  it('returns ok when the database and redis are connected', async () => {
    prismaService.$queryRaw.mockResolvedValue({});
    mockRedisPing.mockResolvedValue('PONG');

    await expect(service.getHealth()).resolves.toEqual({
      status: 'ok',
    });
  });

  it('returns degraded when either dependency is unavailable', async () => {
    prismaService.$queryRaw.mockRejectedValue(new Error('db down'));
    mockRedisPing.mockResolvedValue('PONG');

    await expect(service.getHealth()).resolves.toEqual({
      status: 'degraded',
    });
  });
});
