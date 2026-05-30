import { AttendanceGateway } from './attendance.gateway';

describe('AttendanceGateway', () => {
  let gateway: AttendanceGateway;

  beforeEach(() => {
    gateway = new AttendanceGateway();
  });

  it('emits to student and teacher when teacherId present', () => {
    const calls: Array<[string, string, any]> = [];
    const serverMock = {
      to: (room: string) => ({
        emit: (event: string, payload: any) => calls.push([room, event, payload]),
      }),
    } as any;

    gateway.server = serverMock as any;

    gateway.emitAtRisk({
      courseId: 'c1',
      sessionId: 's1',
      studentId: 'stu1',
      teacherId: 't1',
      totalCount: 1,
      presentCount: 0,
      absentCount: 1,
      presenceRate: 0,
      absenceRate: 1,
      atRisk: true,
    });

    expect(calls.length).toBe(2);
    expect(calls[0][0]).toBe('user:stu1');
    expect(calls[0][1]).toBe('attendance.atRisk');
    expect(calls[1][0]).toBe('user:t1');
  });

  it('emits only to student when teacherId missing', () => {
    const calls: Array<[string, string, any]> = [];
    const serverMock = {
      to: (room: string) => ({
        emit: (event: string, payload: any) => calls.push([room, event, payload]),
      }),
    } as any;

    gateway.server = serverMock as any;

    gateway.emitAtRisk({
      courseId: 'c1',
      sessionId: 's1',
      studentId: 'stu2',
      teacherId: null,
      totalCount: 1,
      presentCount: 0,
      absentCount: 1,
      presenceRate: 0,
      absenceRate: 1,
      atRisk: true,
    });

    expect(calls.length).toBe(1);
    expect(calls[0][0]).toBe('user:stu2');
  });

  it('handleSubscribe joins authenticated user and returns joined true', () => {
    const client: any = { data: { user: { id: 'u1' }, session: { userId: 'u1' } }, join: jest.fn() };
    const result = gateway.handleSubscribe(client as any);
    expect(result).toEqual({ joined: true, userId: 'u1' });
  });

  it('handleSubscribe returns joined false when unauthenticated', () => {
    const client: any = { data: {}, join: jest.fn() };
    const result = gateway.handleSubscribe(client as any);
    expect(result).toEqual({ joined: false });
  });
});
