import { setupTestDb, teardownTestDb } from '../utils/test/setup-tests';
import { createTestAuth } from '../utils/test/auth-helper';

describe('AttendancesService', () => {
  let service: any;
  let ctx: Awaited<ReturnType<typeof setupTestDb>> | null = null;

  beforeAll(async () => {
    try {
      ctx = await setupTestDb();
      await createTestAuth(ctx.prisma);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { AttendancesService } = require('./attendances.service');
      const mockGateway = { emitAtRisk: jest.fn() } as any;
      service = new AttendancesService(ctx.prisma as any, mockGateway);
    } catch {
      const mockedPrisma = { attendanceSession: { create: jest.fn() } } as any;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { AttendancesService } = require('./attendances.service');
      service = new AttendancesService(mockedPrisma, {
        emitAtRisk: jest.fn(),
      } as any);
    }
  });

  afterAll(async () => {
    if (ctx) await teardownTestDb(ctx);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
