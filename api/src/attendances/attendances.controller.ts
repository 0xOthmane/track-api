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
  @Get()
  findAll() {
    return this.attendancesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attendancesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAttendanceRecordDto: UpdateAttendanceRecordDto,
  ) {
    return this.attendancesService.update(+id, updateAttendanceRecordDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attendancesService.remove(+id);
  }
}
