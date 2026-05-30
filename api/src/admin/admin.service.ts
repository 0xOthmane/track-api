import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { plainToInstance } from 'class-transformer';
import { AppLoggerService } from '../app-logger/app-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentImportResponseDto } from './dto/enrollment-import-response.dto';
import { AdminStatsResponseDto } from './dto/admin-stats-response.dto';
import { AdminSemesterSummaryResponseDto } from './dto/admin-semester-summary-response.dto';
import {
  clearCachedAdminStats,
  getCachedAdminStats,
  setCachedAdminStats,
} from './admin-stats-cache';

type AdminStatsPayload = {
  semester: string;
  totalStudents: number;
  totalCourses: number;
  averageGradePerCourse: Array<{
    courseId: string;
    courseName: string;
    average: number | null;
  }>;
  globalAtRiskCount: number;
};

/**
 * AdminService
 *
 * Provides admin-facing utilities such as importing enrollments from CSV,
 * generating semester reports, and caching admin statistics.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Generate a CSV string containing the semester report for all students
   * and courses in the provided semester.
   * @param semester - Semester identifier (e.g. "2026-Spring")
   * @returns CSV string (includes header row)
   */
  async getSemesterReportCsv(semester: string) {
    const rows = await this.getSemesterReportRows(semester);
    const lines = [
      [
        'Student name',
        'course name',
        'weighted average',
        'attendance rate',
        'atRisk',
      ].join(','),
    ];

    for (const row of rows) {
      lines.push(
        [
          this.escapeCsvValue(row.studentName),
          this.escapeCsvValue(row.courseName),
          row.weightedAverage === null ? '' : row.weightedAverage.toFixed(2),
          row.attendanceRate.toFixed(2),
          String(row.atRisk),
        ].join(','),
      );
    }

    return `${lines.join('\n')}\n`;
  }

  /**
   * Import enrollments from a CSV payload. Returns a DTO describing how many
   * rows were enrolled and which rows were skipped with reasons.
   * @param csv - CSV content (with headers `studentId` and `courseId`)
   */
  async importEnrollments(csv: string) {
    if (!csv?.trim()) {
      throw new BadRequestException('CSV content is required');
    }

    const rows = this.parseEnrollmentCsv(csv);
    if (!rows.length) {
      throw new BadRequestException('CSV content is empty');
    }

    const skipped: Array<{ row: number; reason: string }> = [];
    let enrolled = 0;

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;
      const studentId = String(row.studentId ?? '').trim();
      const courseId = String(row.courseId ?? '').trim();

      if (!studentId || !courseId) {
        skipped.push({
          row: rowNumber,
          reason: 'studentId and courseId are required',
        });
        continue;
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const course = await tx.course.findUnique({
          where: { id: courseId },
          select: { id: true, capacity: true, semester: true },
        });

        if (!course) {
          return { action: 'skipped' as const, reason: 'Course not found' };
        }

        const student = await tx.user.findUnique({
          where: { id: studentId },
          select: { id: true, role: true },
        });

        if (!student) {
          return { action: 'skipped' as const, reason: 'Student not found' };
        }

        if (student.role !== 'STUDENT') {
          return {
            action: 'skipped' as const,
            reason: 'User is not a student',
          };
        }

        const existing = await tx.enrollment.findFirst({
          where: { studentId, courseId },
          select: { id: true },
        });

        if (existing) {
          return {
            action: 'skipped' as const,
            reason: 'Student is already enrolled',
          };
        }

        const enrollmentCount = await tx.enrollment.count({
          where: { courseId },
        });

        if (enrollmentCount >= course.capacity) {
          return { action: 'skipped' as const, reason: 'Course is full' };
        }

        await tx.enrollment.create({
          data: {
            student: { connect: { id: studentId } },
            course: { connect: { id: courseId } },
          },
        });

        return { action: 'enrolled' as const, semester: course.semester };
      });

      if (result.action === 'enrolled') {
        enrolled += 1;
        await clearCachedAdminStats(result.semester);
        continue;
      }

      skipped.push({ row: rowNumber, reason: result.reason });
    }

    return plainToInstance(
      EnrollmentImportResponseDto,
      { enrolled, skipped },
      { excludeExtraneousValues: true },
    );
  }

  /**
   * Compute or retrieve cached admin statistics for a semester.
   * @param semester - Semester identifier
   */
  async getStats(semester: string) {
    if (!semester?.trim()) {
      throw new BadRequestException('Semester is required');
    }

    const cachedStats = await getCachedAdminStats<AdminStatsPayload>(semester);
    if (cachedStats) {
      return plainToInstance(AdminStatsResponseDto, cachedStats, {
        excludeExtraneousValues: true,
      });
    }

    const stats = await this.buildStats(semester);
    await setCachedAdminStats(semester, stats);

    return plainToInstance(AdminStatsResponseDto, stats, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Simulate sending a semester summary (logs the summary and returns a DTO
   * indicating the simulated delivery status).
   * @param semester - Semester identifier
   */
  async sendSemesterSummary(semester: string) {
    const stats = await this.getStats(semester);

    this.logger.info('Simulated semester summary email sent', {
      semester: stats.semester,
      subject: `Semester summary for ${stats.semester}`,
      recipient: 'semester-summary@simulated.local',
      body: this.buildSemesterSummary(stats),
      stats,
    });

    return plainToInstance(
      AdminSemesterSummaryResponseDto,
      {
        semester: stats.semester,
        sent: true,
        message: 'Simulated summary email logged successfully',
        stats,
      },
      { excludeExtraneousValues: true },
    );
  }

  private async buildStats(semester: string): Promise<AdminStatsPayload> {
    const rows = await this.getSemesterReportRows(semester);
    const courses = await this.prisma.course.findMany({
      where: { semester },
      select: { id: true, name: true },
    });

    const totalStudents = courses.length
      ? (
          await this.prisma.enrollment.groupBy({
            by: ['studentId'],
            where: { courseId: { in: courses.map((course) => course.id) } },
          })
        ).length
      : 0;

    const averageGradePerCourse = await Promise.all(
      courses.map(async (course) => {
        const aggregate = await this.prisma.grade.aggregate({
          where: { courseId: course.id },
          _avg: { value: true },
        });

        return {
          courseId: course.id,
          courseName: course.name,
          average: aggregate._avg.value ?? null,
        };
      }),
    );

    return {
      semester,
      totalStudents,
      totalCourses: courses.length,
      averageGradePerCourse,
      globalAtRiskCount: rows.filter((row) => row.atRisk).length,
    };
  }

  /**
   * Build the full set of report rows for a semester. Each row corresponds
   * to a student-course pairing with computed metrics (weighted average,
   * attendance rate, and at-risk flag).
   * @param semester - semester identifier
   * @returns Array of report rows used for CSV export and statistics
   */
  private async getSemesterReportRows(semester: string) {
    const courses = await this.prisma.course.findMany({
      where: { semester },
      select: {
        id: true,
        name: true,
        evaluationWeights: {
          select: {
            type: true,
            weight: true,
          },
        },
        enrollments: {
          select: {
            studentId: true,
            student: {
              select: {
                name: true,
              },
            },
          },
        },
        grades: {
          select: {
            studentId: true,
            evaluationType: true,
            value: true,
          },
        },
        attendanceSessions: {
          select: {
            attendanceRecords: {
              select: {
                studentId: true,
                present: true,
              },
            },
          },
        },
      },
    });

    const rows: Array<{
      studentName: string;
      courseName: string;
      weightedAverage: number | null;
      attendanceRate: number;
      atRisk: boolean;
    }> = [];

    for (const course of courses) {
      const attendanceByStudent = new Map<string, number>();
      const sessionCount = course.attendanceSessions.length;

      for (const session of course.attendanceSessions) {
        for (const record of session.attendanceRecords) {
          if (record.present) {
            attendanceByStudent.set(
              record.studentId,
              (attendanceByStudent.get(record.studentId) ?? 0) + 1,
            );
          }
        }
      }

      for (const enrollment of course.enrollments) {
        const studentGrades = course.grades.filter(
          (grade) => grade.studentId === enrollment.studentId,
        );
        const weightedAverage = this.calculateWeightedAverage(
          studentGrades,
          course.evaluationWeights,
        );
        const presentCount = attendanceByStudent.get(enrollment.studentId) ?? 0;
        const attendanceRate =
          sessionCount === 0 ? 0 : presentCount / sessionCount;
        const absenceRate = sessionCount === 0 ? 0 : 1 - attendanceRate;

        rows.push({
          studentName: enrollment.student.name,
          courseName: course.name,
          weightedAverage,
          attendanceRate,
          atRisk: absenceRate > 0.25,
        });
      }
    }

    return rows.sort((left, right) => {
      if (left.courseName === right.courseName) {
        return left.studentName.localeCompare(right.studentName);
      }

      return left.courseName.localeCompare(right.courseName);
    });
  }

  /**
   * Calculate a weighted average for a student's grades using the
   * provided evaluation weights. Returns `null` when no grades or weights
   * are available.
   * @param grades - array of grades with `evaluationType` and `value`
   * @param weights - array of weights with `type` and `weight`
   * @returns weighted average value or `null`
   */
  private calculateWeightedAverage(
    grades: Array<{ evaluationType: string; value: number }>,
    weights: Array<{ type: string; weight: number }>,
  ) {
    if (!grades.length || !weights.length) {
      return null;
    }

    const weightByType = new Map(
      weights.map((weight) => [weight.type, weight.weight]),
    );
    const gradeBuckets = new Map<string, { total: number; count: number }>();

    for (const grade of grades) {
      const bucket = gradeBuckets.get(grade.evaluationType) ?? {
        total: 0,
        count: 0,
      };
      bucket.total += grade.value;
      bucket.count += 1;
      gradeBuckets.set(grade.evaluationType, bucket);
    }

    let weightedTotal = 0;
    let totalWeight = 0;

    for (const [type, bucket] of gradeBuckets.entries()) {
      const weight = weightByType.get(type);
      if (weight === undefined) {
        continue;
      }

      weightedTotal += (bucket.total / bucket.count) * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return null;
    }

    return weightedTotal / totalWeight;
  }

  /**
   * Parse the enrollment CSV content into normalized records.
   * @param csv - CSV content string
   * @returns Array of objects with `studentId` and `courseId` as strings
   */
  private parseEnrollmentCsv(csv: string) {
    const records: Array<{
      studentId?: string | number | boolean | null;
      courseId?: string | number | boolean | null;
    }> = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    return records.map((record) => ({
      studentId: String(record.studentId ?? ''),
      courseId: String(record.courseId ?? ''),
    }));
  }

  /**
   * Escape a string value for inclusion in a CSV cell.
   * @param value - raw cell value
   * @returns escaped CSV-safe string
   */
  private escapeCsvValue(value: string) {
    if (!/[",\n]/.test(value)) {
      return value;
    }

    return `"${value.replace(/"/g, '""')}"`;
  }

  /**
   * Build a human-readable semester summary string from computed stats.
   * @param stats - computed admin stats DTO
   * @returns multiline string suitable for email bodies or logs
   */
  private buildSemesterSummary(stats: AdminStatsResponseDto) {
    const courseAverages = stats.averageGradePerCourse
      .map((course) => `${course.courseName}: ${course.average ?? 'n/a'}`)
      .join('; ');

    return [
      `Semester: ${stats.semester}`,
      `Total students: ${stats.totalStudents}`,
      `Total courses: ${stats.totalCourses}`,
      `At-risk students: ${stats.globalAtRiskCount}`,
      `Course averages: ${courseAverages || 'n/a'}`,
    ].join('\n');
  }
}
