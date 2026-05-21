import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateEvaluationWeightDto } from './dto/create-evaluation-weight.dto';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';
import { EvaluationWeightResponseDto } from './dto/evaluation-weight-response.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UpdateEvaluationWeightDto } from './dto/update-evaluation-weight.dto';
import { RoleGuard } from '../role/role.guard';
import { OwnerGuard } from '../owner/owner.guard';
import { Role } from '../role/role.decorator';
import { Owner } from '../owner/owner.decorator';
import { CurrentUser } from '../current-user/current-user.decorator';
import { ApiCreatedResponse } from '@nestjs/swagger';
import { type CursorPaginationQuery, CursorPipe } from '../cursor/cursor.pipe';
import { CoursesListResponseDto } from './dto/course-response.dto';
import { CapacityPipe } from './pipes/capacity.pipe';

@UseGuards(RoleGuard, OwnerGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Role('ADMIN', 'TEACHER')
  @ApiCreatedResponse({
    type: CreateCourseDto,
    description: 'The course has been successfully created.',
  })
  async create(@Body() createCourseDto: CreateCourseDto, @CurrentUser() user) {
    return await this.coursesService.create(createCourseDto, user);
  }

  @Get()
  @ApiCreatedResponse({
    type: CoursesListResponseDto,
    description: 'List of courses with pagination.',
  })
  async findAll(@Query(CursorPipe) params: CursorPaginationQuery) {
    return await this.coursesService.findAll(params);
  }

  @Get(':id')
  @ApiCreatedResponse({
    type: CreateCourseDto,
    description: 'The course with the specified ID.',
  })
  async findOne(@Param('id') id: string) {
    return await this.coursesService.findOne(id);
  }

  @Patch(':id')
  @ApiCreatedResponse({
    type: CreateCourseDto,
    description: 'The course with the specified ID has been updated.',
  })
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return await this.coursesService.update(id, updateCourseDto);
  }

  @Delete(':id')
  @ApiCreatedResponse({
    type: CreateCourseDto,
    description: 'The course with the specified ID has been deleted.',
  })
  async remove(@Param('id') id: string) {
    return await this.coursesService.remove(id);
  }

  @Post(':id/enroll')
  @Role('ADMIN')
  @ApiCreatedResponse({
    type: EnrollmentResponseDto,
    description: 'The student has been successfully enrolled.',
  })
  async enroll(
    @Param('id', CapacityPipe) courseId: string,
    @Body() enrollCourseDto: EnrollCourseDto,
  ) {
    return await this.coursesService.enroll(
      courseId,
      enrollCourseDto.studentId,
    );
  }

  @Post(':id/weights')
  @Role('TEACHER', 'ADMIN')
  @Owner({ model: 'course', field: 'teacherId', param: 'id' })
  @ApiCreatedResponse({
    type: EvaluationWeightResponseDto,
    description: 'The evaluation weight has been successfully created.',
  })
  async addWeight(
    @Param('id') courseId: string,
    @Body() dto: CreateEvaluationWeightDto,
  ) {
    return await this.coursesService.addWeight(courseId, dto);
  }

  @Patch(':id/weights/:weightId')
  @Role('TEACHER', 'ADMIN')
  @Owner({ model: 'course', field: 'teacherId', param: 'id' })
  @ApiCreatedResponse({
    type: EvaluationWeightResponseDto,
    description: 'The evaluation weight has been successfully updated.',
  })
  async updateWeight(
    @Param('id') courseId: string,
    @Param('weightId') weightId: string,
    @Body() dto: UpdateEvaluationWeightDto,
  ) {
    return await this.coursesService.updateWeight(courseId, weightId, dto);
  }

  @Delete(':id/weights/:weightId')
  @Role('TEACHER', 'ADMIN')
  @Owner({ model: 'course', field: 'teacherId', param: 'id' })
  @ApiCreatedResponse({
    type: EvaluationWeightResponseDto,
    description: 'The evaluation weight has been successfully deleted.',
  })
  async deleteWeight(
    @Param('id') courseId: string,
    @Param('weightId') weightId: string,
  ) {
    return await this.coursesService.deleteWeight(courseId, weightId);
  }
}
