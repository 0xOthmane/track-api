import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';

import { CreateAttendanceRecordDto } from './dto/create-attendance-record.dto';
import {
  AttendanceGateway,
  type AttendanceAtRiskNotification,
} from './attendance.gateway';
import { UpdateAttendanceRecordDto } from './dto/update-attendance-record.dto';
import { clearCachedAdminStats } from '../admin/admin-stats-cache';

type AttendanceMetrics = {
  totalCount: number;
  presentCount: number;
  absentCount: number;
  presenceRate: number;
  absenceRate: number;
  atRisk: boolean;
};

@Injectable()
export class AttendancesService {
  constructor(
    private prisma: PrismaService,
    private attendanceGateway: AttendanceGateway,
  ) {}
  /**
   * AttendancesService
   *
   * Manages attendance sessions and records for courses. Notifies teachers
   * when students become at-risk based on absence thresholds.
   */
  /**
   * Create an attendance session for a course.
   * @param courseId - Course identifier
   * @param createAttendanceSessionDto - DTO containing the session date and metadata
   */
  async createSession(
    courseId: string,
    createAttendanceSessionDto: CreateAttendanceSessionDto,
  ) {
    try {
      const attendance = await this.prisma.attendanceSession.create({
        data: {
          ...createAttendanceSessionDto,
          courseId,
        },
      });
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { semester: true },
      });
      if (course) {
        await clearCachedAdminStats(course.semester);
      }
      return attendance;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new ForbiddenException(
            'Foreign key constraint failed: ' + error.message,
          );
        }
        if (error.code === 'P2002') {
          throw new ForbiddenException(
            'Unique constraint failed: ' + error.message,
          );
        }
      }
      console.error('Error creating attendance session:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException();
    }
  }

  /**
   * Create attendance records for a session. Validates uniqueness per student
   * and emits notifications for students who become at-risk.
   * @param courseId - Course identifier
   * @param sessionId - Attendance session id
   * @param createAttendanceDtos - Array of attendance records to create
   */
  async createRecord(
    courseId: string,
    sessionId: string,
    createAttendanceDtos: CreateAttendanceRecordDto[],
  ) {
    try {
      const uniqueStudentIds = new Set(
        createAttendanceDtos.map((attendance) => attendance.studentId),
      );

      if (uniqueStudentIds.size !== createAttendanceDtos.length) {
        throw new BadRequestException(
          'Each student can only appear once per attendance session',
        );
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const session = await tx.attendanceSession.findUnique({
          where: {
            id: sessionId,
          },
          select: {
            courseId: true,
            course: {
              select: {
                teacherId: true,
                semester: true,
              },
            },
          },
        });

        if (!session) {
          throw new NotFoundException('Attendance session not found');
        }

        if (session.courseId !== courseId) {
          throw new ForbiddenException(
            'Session does not belong to the specified course',
          );
        }

        const totalCount = await tx.attendanceSession.count({
          where: {
            courseId,
          },
        });

        const previousStats = await Promise.all(
          createAttendanceDtos.map(async (attendance) => {
            const before = await this.getAttendanceMetrics(
              tx,
              courseId,
              attendance.studentId,
              sessionId,
              totalCount,
            );

            return {
              attendance,
              before,
            };
          }),
        );

        await tx.attendanceRecord.createMany({
          data: createAttendanceDtos.map((attendance) => ({
            present: attendance.present,
            sessionId,
            studentId: attendance.studentId,
          })),
        });

        const notifications: AttendanceAtRiskNotification[] = [];

        for (const item of previousStats) {
          const after = this.calculateAttendanceMetrics(
            totalCount,
            item.before.presentCount + (item.attendance.present ? 1 : 0),
          );

          if (after.atRisk && !item.before.atRisk) {
            notifications.push({
              ...after,
              courseId,
              sessionId,
              studentId: item.attendance.studentId,
              teacherId: session.course.teacherId,
            });
          }
        }

        return {
          records: createAttendanceDtos,
          notifications,
          semester: session.course.semester,
        };
      });

      for (const notification of result.notifications) {
        this.attendanceGateway.emitAtRisk(notification);
      }

      await clearCachedAdminStats(result.semester);

      return result;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new ForbiddenException(
            'Foreign key constraint failed: ' + error.message,
          );
        }
        if (error.code === 'P2002') {
          throw new ForbiddenException(
            'Unique constraint failed: ' + error.message,
          );
        }
      }
      console.error('Error creating attendance record:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException();
    }
  }

  private calculateAttendanceMetrics(
    totalCount: number,
    presentCount: number,
  ): AttendanceMetrics {
    const safeTotalCount = Math.max(totalCount, 0);
    const safePresentCount = Math.max(presentCount, 0);
    const absentCount = Math.max(safeTotalCount - safePresentCount, 0);
    const presenceRate =
      safeTotalCount === 0 ? 0 : safePresentCount / safeTotalCount;
    const absenceRate = safeTotalCount === 0 ? 0 : absentCount / safeTotalCount;

    return {
      totalCount: safeTotalCount,
      presentCount: safePresentCount,
      absentCount,
      presenceRate,
      absenceRate,
      atRisk: absenceRate > 0.25,
    };
  }

  private async getAttendanceMetrics(
    prisma: Pick<PrismaService, 'attendanceRecord' | 'attendanceSession'>,
    courseId: string,
    studentId: string,
    excludeSessionId?: string,
    totalCount?: number,
  ): Promise<AttendanceMetrics> {
    const resolvedTotalCount =
      totalCount ??
      (await prisma.attendanceSession.count({
        where: {
          courseId,
        },
      }));

    const presentCount = await prisma.attendanceRecord.count({
      where: {
        studentId,
        present: true,
        session: {
          is: {
            courseId,
          },
        },
        ...(excludeSessionId ? { sessionId: { not: excludeSessionId } } : {}),
      },
    });

    return this.calculateAttendanceMetrics(resolvedTotalCount, presentCount);
  }

  /**
   * Return simple counts for a session: total, present and absent.
   * @param sessionId - Attendance session id
   */
  async getStats(sessionId: string) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: {
        id: sessionId,
      },
      select: {
        attendanceRecords: {
          select: {
            present: true,
          },
        },
      },
    });
    if (!session) {
      throw new NotFoundException('Attendance session not found');
    }
    const total = session.attendanceRecords.length;
    const present = session.attendanceRecords.filter((r) => r.present).length;
    const absent = total - present;
    return {
      total,
      present,
      absent,
    };
  }

  /**
   * Update a single attendance record. Ensures the requesting user owns
   * the course (teacher) before allowing updates.
   */
  async updateSessionRecord(
    id: string,
    updateAttendanceRecordDto: UpdateAttendanceRecordDto,
    userId: string,
  ) {
    // check if the course session owned by the teacher
    const record = await this.prisma.attendanceRecord.findUnique({
      where: {
        id,
      },
      select: {
        session: {
          select: {
            course: {
              select: {
                teacherId: true,
                semester: true,
              },
            },
          },
        },
      },
    });
    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }
    if (record.session.course.teacherId !== userId) {
      throw new ForbiddenException(
        'You are not the owner of this attendance record',
      );
    }
    try {
      const updatedRecord = await this.prisma.attendanceRecord.update({
        where: {
          id,
        },
        data: {
          present: updateAttendanceRecordDto.present,
        },
      });
      await clearCachedAdminStats(record.session.course.semester);
      return updatedRecord;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new ForbiddenException(
            'Foreign key constraint failed: ' + error.message,
          );
        }
      }
      console.error('Error updating attendance record:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException();
    }
  }

  /**
   * Fetch attendance records for a particular student in a course.
   */
  async getStudentRecords(courseId: string, studentId: string) {
    try {
      const records = await this.prisma.attendanceRecord.findMany({
        where: {
          studentId,
          session: {
            is: {
              courseId,
            },
          },
        },
        include: {
          session: true,
        },
      });
      return records;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new ForbiddenException(
            'Foreign key constraint failed: ' + error.message,
          );
        }
      }
      console.error('Error fetching student attendance records:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException();
    }
  }
}
