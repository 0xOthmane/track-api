import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateEvaluationWeightDto } from './dto/create-evaluation-weight.dto';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';
import { EvaluationWeightResponseDto } from './dto/evaluation-weight-response.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UpdateEvaluationWeightDto } from './dto/update-evaluation-weight.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../generated/prisma/client';
import { PrismaClientKnownRequestError } from '../generated/prisma/internal/prismaNamespace';
import { plainToInstance } from 'class-transformer';
import { CourseResponseDto } from './dto/course-response.dto';
import { CursorPaginationQuery } from '../common/pipes/cursor/cursor.pipe';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async create(createCourseDto: CreateCourseDto, user: User) {
    try {
      if (user.role === 'TEACHER' && user.id !== createCourseDto.teacherId) {
        throw new BadRequestException(
          'Teachers can only create courses for themselves',
        );
      }

      const teacher = await this.prisma.user.findUnique({
        where: { id: createCourseDto.teacherId },
        select: { id: true, role: true },
      });

      if (!teacher) {
        throw new NotFoundException('Teacher not found');
      }

      const allowedRoles = ['TEACHER', 'ADMIN'];

      if (!allowedRoles.includes(user.role)) {
        throw new UnauthorizedException(
          'User is not authorized to create course',
        );
      }

      const course = await this.prisma.course.create({
        data: {
          name: createCourseDto.name,
          description: createCourseDto.description,
          capacity: createCourseDto.capacity,
          semester: createCourseDto.semester,
          teacher: { connect: { id: createCourseDto.teacherId } },
        },
        include: {
          teacher: true,
        },
      });
      return plainToInstance(CourseResponseDto, course, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new NotFoundException('Teacher not found');
        }
      }
      throw error;
    }
  }

  async findAll(params: CursorPaginationQuery) {
    const { cursor, limit } = params;
    const courses = await this.prisma.course.findMany({
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: true,
      },
    });
    const nextCursor =
      courses.length === limit ? courses[courses.length - 1].id : null;
    return {
      data: plainToInstance(CourseResponseDto, courses, {
        excludeExtraneousValues: true,
      }),
      meta: { nextCursor },
    };
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        teacher: true,
      },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return plainToInstance(CourseResponseDto, course, {
      excludeExtraneousValues: true,
    });
  }

  async update(id: string, updateCourseDto: UpdateCourseDto) {
    try {
      const course = await this.prisma.course.update({
        where: { id },
        data: updateCourseDto,
        include: {
          teacher: true,
        },
      });
      return plainToInstance(CourseResponseDto, course, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new NotFoundException('Teacher not found');
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const course = await this.prisma.course.delete({
        where: { id },
      });
      return plainToInstance(CourseResponseDto, course, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Course not found');
        }
      }
      throw error;
    }
  }

  async enroll(courseId: string, studentId: string) {
    try {
      const enrollment = await this.prisma.$transaction(async (tx) => {
        const course = await tx.course.findUnique({
          where: { id: courseId },
          select: { id: true, name: true, description: true, capacity: true },
        });

        if (!course) {
          throw new NotFoundException('Course not found');
        }

        const student = await tx.user.findUnique({
          where: { id: studentId },
          select: { id: true, name: true, role: true },
        });

        if (!student) {
          throw new NotFoundException('Student not found');
        }
        if (student.role !== 'STUDENT') {
          throw new BadRequestException('User is not a student');
        }

        const enrollmentCount = await tx.enrollment.count({
          where: { courseId },
        });

        if (enrollmentCount >= course.capacity) {
          throw new ConflictException('Course is full');
        }

        return await tx.enrollment.create({
          data: {
            course: { connect: { id: courseId } },
            student: { connect: { id: studentId } },
          },
          include: {
            course: { select: { name: true, description: true } },
            student: { select: { name: true } },
          },
        });
      });

      return plainToInstance(
        EnrollmentResponseDto,
        {
          courseName: enrollment.course.name,
          courseDescription: enrollment.course.description,
          studentName: enrollment.student.name,
          enrolledAt: enrollment.enrolledAt,
        },
        { excludeExtraneousValues: true },
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Student is already enrolled in this course',
          );
        }

        if (error.code === 'P2003') {
          throw new NotFoundException('Course or student not found');
        }
      }

      throw error;
    }
  }

  async addWeight(courseId: string, dto: CreateEvaluationWeightDto) {
    await this.ensureCourseExists(courseId);

    const totalWeight = await this.getWeightsTotal(courseId);
    if (totalWeight + dto.weight > 100) {
      throw new BadRequestException('Total weight cannot exceed 100');
    }

    try {
      const weight = await this.prisma.evaluationWeight.create({
        data: {
          course: { connect: { id: courseId } },
          type: dto.type,
          weight: dto.weight,
        },
      });

      return plainToInstance(EvaluationWeightResponseDto, weight, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Weight type already exists');
        }

        if (error.code === 'P2003') {
          throw new NotFoundException('Course not found');
        }
      }

      throw error;
    }
  }

  async updateWeight(
    courseId: string,
    weightId: string,
    dto: UpdateEvaluationWeightDto,
  ) {
    const existing = await this.prisma.evaluationWeight.findFirst({
      where: { id: weightId, courseId },
    });

    if (!existing) {
      throw new NotFoundException('Evaluation weight not found');
    }

    if (dto.weight !== undefined) {
      const totalWeight = await this.getWeightsTotal(courseId);
      const nextTotal = totalWeight - existing.weight + dto.weight;
      if (nextTotal > 100) {
        throw new BadRequestException('Total weight cannot exceed 100');
      }
    }

    try {
      const weight = await this.prisma.evaluationWeight.update({
        where: { id: weightId },
        data: {
          course: { connect: { id: courseId } },
          type: dto.type,
          weight: dto.weight,
        },
      });

      return plainToInstance(EvaluationWeightResponseDto, weight, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Weight type already exists');
        }
      }

      throw error;
    }
  }

  async deleteWeight(courseId: string, weightId: string) {
    const existing = await this.prisma.evaluationWeight.findFirst({
      where: { id: weightId, courseId },
    });

    if (!existing) {
      throw new NotFoundException('Evaluation weight not found');
    }

    const weight = await this.prisma.evaluationWeight.delete({
      where: { id: weightId },
    });

    return plainToInstance(EvaluationWeightResponseDto, weight, {
      excludeExtraneousValues: true,
    });
  }

  private async ensureCourseExists(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }
  }

  private async getWeightsTotal(courseId: string) {
    const total = await this.prisma.evaluationWeight.aggregate({
      where: { courseId },
      _sum: { weight: true },
    });

    return total._sum.weight ?? 0;
  }
}
