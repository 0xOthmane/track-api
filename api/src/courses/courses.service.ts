import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../generated/prisma/client';
import { PrismaClientKnownRequestError } from '../generated/prisma/internal/prismaNamespace';
import { plainToInstance } from 'class-transformer';
import { CourseResponseDto } from './dto/course-response.dto';
import { CursorPaginationQuery } from '../cursor/cursor.pipe';

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

      if (teacher.role !== 'TEACHER' || user.role !== 'ADMIN') {
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
          teacherId: createCourseDto.teacherId,
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
}
