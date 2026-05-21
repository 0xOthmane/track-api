import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { parse } from 'csv-parse/sync';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../prisma/prisma.service';
import { EvaluationType } from '../generated/prisma/enums';
import { GRADES_IMPORT_QUEUE } from './grades-import.constants';
import {
  type ImportGradesJobData,
  type ImportGradesResult,
  type ParsedGradeRow,
} from './grades-import.types';

const HEADER_ALIASES = {
  courseid: 'courseId',
  course_id: 'courseId',
  studentid: 'studentId',
  student_id: 'studentId',
  studentemail: 'studentEmail',
  student_email: 'studentEmail',
  email: 'studentEmail',
  evaluationtype: 'evaluationType',
  evaluation_type: 'evaluationType',
  value: 'value',
} as const;

type HeaderKey = keyof typeof HEADER_ALIASES;

type HeaderMap = Partial<Record<(typeof HEADER_ALIASES)[HeaderKey], number>>;

@Processor(GRADES_IMPORT_QUEUE)
@Injectable()
export class GradesImportProcessor extends WorkerHost {
  private readonly logger = new Logger(GradesImportProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<ImportGradesJobData>): Promise<ImportGradesResult> {
    const { courseId, csv, userId, correlationId } = job.data;
    if (!csv?.trim()) {
      throw new BadRequestException('CSV content is required');
    }

    this.logger.log(
      `Starting grades import job ${job.id} for course ${courseId} (correlationId=${correlationId ?? 'n/a'})`,
    );

    const parsedRows = this.parseCsv(csv, courseId);
    const errors: ImportGradesResult['errors'] = [];
    let successCount = 0;

    for (const row of parsedRows) {
      try {
        const student = await this.findStudent(row.studentIdentifier);
        if (!student) {
          throw new BadRequestException('Student not found');
        }
        if (student.role !== 'STUDENT') {
          throw new BadRequestException('User is not a student');
        }

        await this.prisma.grade.create({
          data: {
            value: row.value,
            evaluationType: row.evaluationType,
            course: { connect: { id: row.courseId } },
            student: { connect: { id: student.id } },
            createdBy: { connect: { id: userId } },
          },
        });

        successCount += 1;
      } catch (error) {
        const message = this.getRowErrorMessage(error);
        errors.push({ rowNumber: row.rowNumber, message });
      }

      const processed = successCount + errors.length;
      await job.updateProgress(
        Math.round((processed / parsedRows.length) * 100),
      );
    }

    return {
      successCount,
      failureCount: errors.length,
      errors,
    };
  }

  private parseCsv(csv: string, jobCourseId: string) {
    const records = parse(csv, {
      relax_quotes: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (!records.length) {
      throw new BadRequestException('CSV content is empty');
    }

    const [firstRow, ...restRows] = records;
    const headerMap = this.buildHeaderMap(firstRow);
    const rows = headerMap ? restRows : records;

    return rows.map((row, index) =>
      this.parseRow(row, headerMap, jobCourseId, index + 1),
    );
  }

  private buildHeaderMap(row: string[]): HeaderMap | null {
    const normalized = row.map((value) =>
      value.trim().toLowerCase().replace(/\s+/g, ''),
    );

    const hasHeader = normalized.some((value) => value in HEADER_ALIASES);
    if (!hasHeader) {
      return null;
    }

    return normalized.reduce<HeaderMap>((map, value, index) => {
      if (value in HEADER_ALIASES) {
        const key = HEADER_ALIASES[value as HeaderKey];
        map[key] = index;
      }
      return map;
    }, {});
  }

  private parseRow(
    row: string[],
    headerMap: HeaderMap | null,
    jobCourseId: string,
    rowNumber: number,
  ): ParsedGradeRow & { rowNumber: number } {
    const courseId = this.getRowValue(row, headerMap, 'courseId', 0);
    const studentId = this.getRowValue(row, headerMap, 'studentId', 1);
    const studentEmail = this.getRowValue(row, headerMap, 'studentEmail', 1);
    const evaluationType = this.getRowValue(
      row,
      headerMap,
      'evaluationType',
      2,
    );
    const value = this.getRowValue(row, headerMap, 'value', 3);

    const resolvedCourseId = courseId || jobCourseId;
    if (!resolvedCourseId) {
      throw new BadRequestException('Course id is required');
    }

    if (resolvedCourseId !== jobCourseId) {
      throw new BadRequestException('Course id does not match import request');
    }

    const identifier = studentId || studentEmail;
    if (!identifier) {
      throw new BadRequestException('Student id or email is required');
    }

    const identifierType = studentEmail
      ? 'email'
      : identifier.includes('@')
        ? 'email'
        : 'id';

    const normalizedType = evaluationType?.toUpperCase();
    if (!normalizedType || !(normalizedType in EvaluationType)) {
      throw new BadRequestException('Invalid evaluation type');
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      throw new BadRequestException('Value must be a number');
    }
    if (numericValue < 0 || numericValue > 20) {
      throw new BadRequestException('Value must be between 0 and 20');
    }

    return {
      rowNumber,
      courseId: resolvedCourseId,
      studentIdentifier: identifier,
      studentIdentifierType: identifierType,
      evaluationType: normalizedType as EvaluationType,
      value: numericValue,
    };
  }

  private getRowValue(
    row: string[],
    headerMap: HeaderMap | null,
    key: keyof HeaderMap,
    fallbackIndex: number,
  ) {
    if (headerMap) {
      if (headerMap[key] === undefined) {
        return undefined;
      }

      return row[headerMap[key]];
    }

    return row[fallbackIndex];
  }

  private async findStudent(identifier: string) {
    if (identifier.includes('@')) {
      return this.prisma.user.findUnique({
        where: { email: identifier },
        select: { id: true, role: true },
      });
    }

    return this.prisma.user.findUnique({
      where: { id: identifier },
      select: { id: true, role: true },
    });
  }

  private getRowErrorMessage(error: unknown) {
    if (error instanceof BadRequestException) {
      return error.message;
    }

    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return 'Grade already exists for this student and course';
      }
      if (error.code === 'P2003') {
        return 'Course or student not found';
      }
    }

    return 'Failed to import grade';
  }
}
