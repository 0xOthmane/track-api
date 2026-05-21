import { Injectable } from '@nestjs/common';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendancesService {
  constructor(private prisma: PrismaService) {}
  create(createAttendanceDto: CreateAttendanceDto) {
    try {
      const attendance = this.prisma.attendanceRecord.create({
        data: createAttendanceDto,
      });
      return attendance;
    } catch (error) {
      console.error('Error creating attendance record:', error);
      throw error;
    }
  }

  findAll() {
    return `This action returns all attendances`;
  }

  findOne(id: number) {
    return `This action returns a #${id} attendance`;
  }

  update(id: number, updateAttendanceDto: UpdateAttendanceDto) {
    return `This action updates a #${id} attendance`;
  }

  remove(id: number) {
    return `This action removes a #${id} attendance`;
  }
}
