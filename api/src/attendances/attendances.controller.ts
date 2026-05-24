import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Owner } from '../common/decorators/owner/owner.decorator';
import { OwnerGuard } from '../common/decorators/owner/owner.guard';
import { Role } from '../common/decorators/role/role.decorator';
import { RoleGuard } from '../common/decorators/role/role.guard';
import { AttendancesService } from './attendances.service';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { CreateAttendanceRecordsDto } from './dto/create-attendance-records.dto';
import { UpdateAttendanceRecordDto } from './dto/update-attendance-record.dto';
import { CurrentUser } from '../common/decorators/current-user/current-user.decorator';
import { type User } from '../generated/prisma/client';
import { ApiCreatedResponse } from '@nestjs/swagger';

@Controller('/courses/:courseId/attendance-sessions')
@UseGuards(RoleGuard, OwnerGuard)
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Post()
  @Role('TEACHER')
  @Owner({
    model: 'course',
    field: 'teacherId',
    param: 'courseId',
  })
  @ApiCreatedResponse({
    description: 'The attendance session has been successfully created.',
  })
  async createSession(
    @Param('courseId') courseId: string,
    @Body() createAttendanceSessionDto: CreateAttendanceSessionDto,
  ) {
    return await this.attendancesService.createSession(
      courseId,
      createAttendanceSessionDto,
    );
  }

  @Post(':sessionId/records')
  @Role('TEACHER')
  @Owner({
    model: 'course',
    field: 'teacherId',
    param: 'courseId',
  })
  @ApiCreatedResponse({
    description: 'The attendance records have been successfully created.',
  })
  async createRecord(
    @Param('courseId') courseId: string,
    @Param('sessionId') sessionId: string,
    @Body() createAttendanceRecordsDto: CreateAttendanceRecordsDto,
  ) {
    return await this.attendancesService.createRecord(
      courseId,
      sessionId,
      createAttendanceRecordsDto.records,
    );
  }
  @Get(':sessionId/stats')
  @Role('TEACHER', 'ADMIN')
  @Owner({
    model: 'course',
    field: 'teacherId',
    param: 'courseId',
  })
  @ApiCreatedResponse({
    description: 'The attendance session statistics.',
  })
  async getStats(@Param('sessionId') sessionId: string) {
    return await this.attendancesService.getStats(sessionId);
  }

  @Get('student-records')
  @Role('STUDENT')
  @ApiCreatedResponse({
    description:
      'The attendance records for the student in the specified course.',
  })
  async getStudentRecords(
    @Param('courseId') courseId: string,
    @CurrentUser() user: User,
  ) {
    return await this.attendancesService.getStudentRecords(courseId, user.id);
  }

  @Patch(':id')
  @Role('TEACHER')
  @ApiCreatedResponse({
    description: 'The attendance record has been successfully updated.',
  })
  async updateSessionRecord(
    @Param('id') id: string,
    @Body() updateAttendanceRecordDto: UpdateAttendanceRecordDto,
    @CurrentUser() user: User,
  ) {
    return await this.attendancesService.updateSessionRecord(
      id,
      updateAttendanceRecordDto,
      user.id,
    );
  }
}
