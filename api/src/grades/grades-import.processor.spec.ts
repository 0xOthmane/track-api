/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { GradesImportProcessor } from './grades-import.processor';
import { PrismaService } from '../prisma/prisma.service';

describe('GradesImportProcessor', () => {
  let processor: GradesImportProcessor;
  let prisma: any;

  const createJob = (csv: string) => ({
    id: 'job-1',
    data: {
      courseId: 'course-1',
      csv,
      userId: 'teacher-1',
      correlationId: 'corr-1',
    },
    updateProgress: jest.fn(),
  });

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      grade: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    processor = new GradesImportProcessor(prisma as PrismaService);
  });

  it('imports all rows atomically when every row is valid', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'student-1',
      role: 'STUDENT',
    });
    prisma.grade.create.mockResolvedValue({ id: 'grade-1' });
    prisma.$transaction.mockImplementation((callback: any) =>
      callback({ grade: prisma.grade }),
    );

    const result = await processor.process(
      createJob(
        'course-1,student-1,EXAM,15\ncourse-1,student-1,QUIZ,18',
      ) as any,
    );

    expect(result).toEqual({
      successCount: 2,
      failureCount: 0,
      errors: [],
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.grade.create).toHaveBeenCalledTimes(2);
    expect(prisma.grade.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          value: 15,
          evaluationType: 'EXAM',
          course: { connect: { id: 'course-1' } },
          student: { connect: { id: 'student-1' } },
          createdBy: { connect: { id: 'teacher-1' } },
        }),
      }),
    );
    expect(prisma.grade.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          value: 18,
          evaluationType: 'QUIZ',
        }),
      }),
    );
  });

  it('returns all row errors and writes nothing when validation fails', async () => {
    prisma.user.findUnique.mockImplementation(({ where }: any) => {
      if (where.id === 'missing-student') {
        return Promise.resolve(null);
      }

      if (where.id === 'teacher-user') {
        return Promise.resolve({ id: 'teacher-user', role: 'TEACHER' });
      }

      return Promise.resolve({ id: 'student-user', role: 'STUDENT' });
    });

    const result = await processor.process(
      createJob(
        'course-1,missing-student,EXAM,15\ncourse-1,teacher-user,QUIZ,18',
      ) as any,
    );

    expect(result).toEqual({
      successCount: 0,
      failureCount: 2,
      errors: [
        { rowNumber: 1, message: 'Student not found' },
        { rowNumber: 2, message: 'User is not a student' },
      ],
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.grade.create).not.toHaveBeenCalled();
  });

  it('collects multiple CSV parsing errors and does not write anything', async () => {
    const result = await processor.process(
      createJob(
        'course-1,student-1,INVALID,abc\nwrong-course,student-2,QUIZ,foo',
      ) as any,
    );

    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(2);
    expect(result.errors).toEqual([
      { rowNumber: 1, message: 'Invalid evaluation type' },
      { rowNumber: 2, message: 'Course id does not match import request' },
    ]);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.grade.create).not.toHaveBeenCalled();
  });
});
