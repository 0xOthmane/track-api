import { Test, TestingModule } from '@nestjs/testing';
import { AppLoggerService } from '../app-logger/app-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';
import { getCachedAdminStats, setCachedAdminStats } from './admin-stats-cache';

jest.mock('./admin-stats-cache', () => ({
  getCachedAdminStats: jest.fn(),
  setCachedAdminStats: jest.fn(),
  clearCachedAdminStats: jest.fn(),
}));

describe('AdminService', () => {
  let service: AdminService;
  let logger: {
    info: jest.Mock;
  };
  let prisma: {
    course: {
      findMany: jest.Mock;
    };
    enrollment: {
      groupBy: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
    };
    grade: {
      aggregate: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    logger = {
      info: jest.fn(),
    };
    prisma = {
      course: {
        findMany: jest.fn(),
      },
      enrollment: {
        groupBy: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      grade: {
        aggregate: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: AppLoggerService,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('renders semester csv rows', async () => {
    prisma.course.findMany.mockResolvedValue([
      {
        id: 'course-1',
        name: 'Math 101',
        evaluationWeights: [
          { type: 'EXAM', weight: 70 },
          { type: 'QUIZ', weight: 30 },
        ],
        enrollments: [
          {
            studentId: 'student-1',
            student: { name: 'Jane Doe' },
          },
        ],
        grades: [
          { studentId: 'student-1', evaluationType: 'EXAM', value: 10 },
          { studentId: 'student-1', evaluationType: 'QUIZ', value: 20 },
        ],
        attendanceSessions: [
          {
            attendanceRecords: [{ studentId: 'student-1', present: true }],
          },
          {
            attendanceRecords: [{ studentId: 'student-1', present: false }],
          },
        ],
      },
    ]);

    await expect(service.getSemesterReportCsv('Fall 2024')).resolves.toBe(
      'Student name,course name,weighted average,attendance rate,atRisk\nJane Doe,Math 101,13.00,0.50,true\n',
    );
  });

  it('imports enrollments and reports duplicates and capacity skips', async () => {
    prisma.$transaction.mockImplementation((callback: unknown) =>
      (callback as (tx: typeof prisma) => Promise<unknown>)(prisma),
    );
    prisma.course.findMany.mockResolvedValue([]);
    prisma.course = {
      findMany: prisma.course.findMany,
      findUnique: jest.fn(({ where }: { where: { id: string } }) => {
        if (where.id === 'course-full') {
          return Promise.resolve({ id: 'course-full', capacity: 1 });
        }

        if (where.id === 'course-open') {
          return Promise.resolve({ id: 'course-open', capacity: 2 });
        }

        return Promise.resolve(null);
      }),
    };
    prisma.user.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) => {
        if (where.id === 'student-1' || where.id === 'student-2') {
          return Promise.resolve({ id: where.id, role: 'STUDENT' });
        }

        return Promise.resolve(null);
      },
    );
    prisma.enrollment.findFirst.mockImplementation(
      ({ where }: { where: { studentId: string } }) => {
        if (where.studentId === 'student-2') {
          return Promise.resolve({ id: 'existing' });
        }

        return Promise.resolve(null);
      },
    );
    prisma.enrollment.count.mockImplementation(
      ({ where }: { where: { courseId: string } }) => {
        if (where.courseId === 'course-full') {
          return Promise.resolve(1);
        }

        return Promise.resolve(0);
      },
    );
    prisma.enrollment.create.mockResolvedValue({ id: 'new' });

    const result = await service.importEnrollments(
      [
        'studentId,courseId',
        'student-1,course-open',
        'student-2,course-open',
        'student-1,course-full',
      ].join('\n'),
    );

    expect(result).toEqual({
      enrolled: 1,
      skipped: [
        { row: 3, reason: 'Student is already enrolled' },
        { row: 4, reason: 'Course is full' },
      ],
    });
  });

  it('returns admin stats for a semester', async () => {
    (getCachedAdminStats as jest.Mock).mockResolvedValue(null);
    prisma.course.findMany.mockResolvedValue([
      { id: 'course-1', name: 'Math 101' },
    ]);
    prisma.enrollment.groupBy.mockResolvedValue([{ studentId: 'student-1' }]);
    prisma.grade.aggregate.mockResolvedValue({ _avg: { value: 14 } });
    jest
      .spyOn(service as any, 'getSemesterReportRows')
      .mockResolvedValue([{ atRisk: true }] as never);

    await expect(service.getStats('Fall 2024')).resolves.toEqual({
      semester: 'Fall 2024',
      totalStudents: 1,
      totalCourses: 1,
      averageGradePerCourse: [
        { courseId: 'course-1', courseName: 'Math 101', average: 14 },
      ],
      globalAtRiskCount: 1,
    });

    expect(setCachedAdminStats).toHaveBeenCalledWith('Fall 2024', {
      semester: 'Fall 2024',
      totalStudents: 1,
      totalCourses: 1,
      averageGradePerCourse: [
        { courseId: 'course-1', courseName: 'Math 101', average: 14 },
      ],
      globalAtRiskCount: 1,
    });
  });

  it('returns cached admin stats without recalculating', async () => {
    (getCachedAdminStats as jest.Mock).mockResolvedValue({
      semester: 'Fall 2024',
      totalStudents: 2,
      totalCourses: 1,
      averageGradePerCourse: [],
      globalAtRiskCount: 0,
    });

    await expect(service.getStats('Fall 2024')).resolves.toEqual({
      semester: 'Fall 2024',
      totalStudents: 2,
      totalCourses: 1,
      averageGradePerCourse: [],
      globalAtRiskCount: 0,
    });

    expect(prisma.course.findMany).not.toHaveBeenCalled();
    expect(prisma.enrollment.groupBy).not.toHaveBeenCalled();
    expect(prisma.grade.aggregate).not.toHaveBeenCalled();
  });

  it('logs a simulated semester summary email', async () => {
    jest.spyOn(service, 'getStats').mockResolvedValue({
      semester: 'Fall 2024',
      totalStudents: 2,
      totalCourses: 1,
      averageGradePerCourse: [
        { courseId: 'course-1', courseName: 'Math 101', average: 14 },
      ],
      globalAtRiskCount: 1,
    } as never);

    await expect(service.sendSemesterSummary('Fall 2024')).resolves.toEqual({
      semester: 'Fall 2024',
      sent: true,
      message: 'Simulated summary email logged successfully',
      stats: {
        semester: 'Fall 2024',
        totalStudents: 2,
        totalCourses: 1,
        averageGradePerCourse: [
          { courseId: 'course-1', courseName: 'Math 101', average: 14 },
        ],
        globalAtRiskCount: 1,
      },
    });

    expect(logger.info).toHaveBeenCalledWith(
      'Simulated semester summary email sent',
      expect.objectContaining({
        semester: 'Fall 2024',
        subject: 'Semester summary for Fall 2024',
      }),
    );
  });
});
