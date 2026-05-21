import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  PipeTransform,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CapacityPipe implements PipeTransform<string, Promise<string>> {
  constructor(private prisma: PrismaService) {}

  async transform(value: string): Promise<string> {
    if (!value) {
      throw new BadRequestException('Course ID is required');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: value },
      select: { id: true, capacity: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const enrollmentCount = await this.prisma.enrollment.count({
      where: { courseId: value },
    });

    if (enrollmentCount >= course.capacity) {
      throw new ConflictException('Course is full');
    }

    return value;
  }
}
