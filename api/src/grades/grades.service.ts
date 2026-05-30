import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ClsService } from 'nestjs-cls';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { PrismaService } from '../prisma/prisma.service';
import { type User } from '../generated/prisma/client';
import { plainToInstance } from 'class-transformer';
import { GradeResponseDto } from './dto/grade-response.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { CursorPaginationQuery } from '../common/pipes/cursor/cursor.pipe';
import { CourseAveragesResponseDto } from './dto/course-averages.dto';
import { ImportGradesDto } from './dto/import-grades.dto';
import { ImportGradesResponseDto } from './dto/import-grades-response.dto';
import { ImportGradesStatusDto } from './dto/import-grades-status.dto';
import { GRADES_IMPORT_QUEUE } from './grades-import.constants';
import {
  type ImportGradesJobData,
  type ImportGradesResult,
} from './grades-import.types';
import { clearCachedAdminStats } from '../admin/admin-stats-cache';

@Injectable()
export class GradesService {
  constructor(
    private prisma: PrismaService,
    private cls: ClsService,
    @InjectQueue(GRADES_IMPORT_QUEUE)
    private importQueue: Queue<ImportGradesJobData, ImportGradesResult>,
  ) {}
  /**
   * GradesService
   *
   * Responsible for creating, updating and querying grades. Supports
   * cursor-based pagination, importing grades via background jobs, and
   * computing course averages.
   */
  /**
   * Create a grade for a student in a course.
   * @param createGradeDto - payload with student, course, evaluation type and value
   * @param user - the creating user (used to set `createdBy`)
   */
  async create(createGradeDto: CreateGradeDto, user: User) {
    try {
      const grade = await this.prisma.grade.create({
        data: {
          value: createGradeDto.value,
          evaluationType: createGradeDto.evaluationType,
          course: {
            connect: { id: createGradeDto.courseId },
          },
          student: {
            connect: { id: createGradeDto.studentId },
          },
          createdBy: { connect: { id: user.id } },
        },
        include: {
          course: { select: { name: true, semester: true } },
          student: { select: { name: true } },
        },
      });
      await clearCachedAdminStats(grade.course.semester);
      return plainToInstance(GradeResponseDto, grade, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new NotFoundException('Course or student not found');
        }
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Grade already exists for this student and course',
          );
        }
      }
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException();
    }
  }

  /**
   * Find grades with cursor pagination. Teachers only see grades they created.
   */
  async findAll(params: CursorPaginationQuery, user: User) {
    const { cursor, limit } = params;
    const where =
      user.role === 'TEACHER' ? { createdById: user.id } : undefined;
    const grades = await this.prisma.grade.findMany({
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      where,
      include: {
        course: { select: { name: true } },
        student: { select: { name: true } },
      },
    });
    const nextCursor =
      grades.length === limit ? grades[grades.length - 1].id : null;
    return {
      data: plainToInstance(GradeResponseDto, grades, {
        excludeExtraneousValues: true,
      }),
      meta: { nextCursor },
    };
  }

  /**
   * Find a single grade by id.
   */
  async findOne(id: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id },
      include: {
        course: { select: { name: true } },
        student: { select: { name: true } },
      },
    });
    if (!grade) {
      throw new NotFoundException('Grade not found');
    }
    return plainToInstance(GradeResponseDto, grade, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update an existing grade.
   */
  async update(id: string, updateGradeDto: UpdateGradeDto) {
    try {
      const grade = await this.prisma.grade.update({
        where: { id },
        data: updateGradeDto,
        include: {
          course: { select: { name: true, semester: true } },
          student: { select: { name: true } },
        },
      });
      await clearCachedAdminStats(grade.course.semester);
      return plainToInstance(GradeResponseDto, grade, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Grade not found');
        }
      }
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException();
    }
  }

  /**
   * Remove a grade by id.
   */
  async remove(id: string) {
    try {
      const grade = await this.prisma.grade.delete({
        where: { id },
        include: {
          course: { select: { name: true, semester: true } },
          student: { select: { name: true } },
        },
      });
      await clearCachedAdminStats(grade.course.semester);
      return plainToInstance(GradeResponseDto, grade, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Grade not found');
        }
      }
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException();
    }
  }

  /**
   * Find grades for the authenticated student (cursor pagination).
   */
  async findMine(params: CursorPaginationQuery, user: User) {
    const { cursor, limit } = params;
    const grades = await this.prisma.grade.findMany({
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      where: { studentId: user.id },
      include: {
        course: { select: { name: true } },
        student: { select: { name: true } },
      },
    });
    const nextCursor =
      grades.length === limit ? grades[grades.length - 1].id : null;
    return {
      data: plainToInstance(GradeResponseDto, grades, {
        excludeExtraneousValues: true,
      }),
      meta: { nextCursor },
    };
  }

  /**
   * Find grades for a given course (cursor pagination).
   */
  async findByCourse(courseId: string, params: CursorPaginationQuery) {
    const { cursor, limit } = params;
    const grades = await this.prisma.grade.findMany({
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      where: { courseId },
      include: {
        course: { select: { name: true } },
        student: { select: { name: true } },
      },
    });
    const nextCursor =
      grades.length === limit ? grades[grades.length - 1].id : null;
    return {
      data: plainToInstance(GradeResponseDto, grades, {
        excludeExtraneousValues: true,
      }),
      meta: { nextCursor },
    };
  }

  /**
   * Compute averages for a course grouped by evaluation type and overall.
   */
  async getCourseAverages(courseId: string) {
    const byType = await this.prisma.grade.groupBy({
      by: ['evaluationType'],
      where: { courseId },
      _avg: { value: true },
      _count: { _all: true },
    });

    const overall = await this.prisma.grade.aggregate({
      where: { courseId },
      _avg: { value: true },
      _count: { _all: true },
    });

    return plainToInstance(
      CourseAveragesResponseDto,
      {
        courseId,
        overallAverage: overall._avg.value ?? null,
        overallCount: overall._count._all ?? 0,
        averages: byType.map((item) => ({
          evaluationType: item.evaluationType,
          average: item._avg.value ?? null,
          count: item._count._all ?? 0,
        })),
      },
      { excludeExtraneousValues: true },
    );
  }

  /**
   * Enqueue a CSV import job for grades. Returns a job id and status URL.
   */
  async enqueueImport(
    body: ImportGradesDto,
    file: Express.Multer.File,
    user: User,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('CSV file is required');
    }

    const csv = file.buffer.toString('utf-8');
    const correlationId = this.cls.get<string>('correlationId') ?? null;

    const job = await this.importQueue.add(
      'import',
      {
        courseId: body.courseId,
        csv,
        userId: user.id,
        correlationId,
      },
      {
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    );

    return plainToInstance(
      ImportGradesResponseDto,
      {
        jobId: String(job.id),
        statusUrl: `/grades/import/${job.id}`,
      },
      { excludeExtraneousValues: true },
    );
  }

  /**
   * Get status for an import job, enforcing access control for non-admins.
   */
  async getImportStatus(jobId: string, user: User) {
    const job = await this.importQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Import job not found');
    }

    if (user.role !== 'ADMIN' && job.data.userId !== user.id) {
      throw new ForbiddenException('You do not have access to this job');
    }

    const status = await job.getState();
    const result = (job.returnvalue as ImportGradesResult | undefined) ?? null;
    const error = job.failedReason ?? null;

    return plainToInstance(
      ImportGradesStatusDto,
      {
        jobId: String(job.id),
        status,
        progress: job.progress ?? 0,
        result,
        error,
      },
      { excludeExtraneousValues: true },
    );
  }
}
