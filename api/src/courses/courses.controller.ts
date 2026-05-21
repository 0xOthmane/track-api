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
import { UpdateCourseDto } from './dto/update-course.dto';
import { RoleGuard } from '../role/role.guard';
import { OwnerGuard } from '../owner/owner.guard';
import { Role } from '../role/role.decorator';
import { CurrentUser } from '../current-user/current-user.decorator';
import { ApiCreatedResponse } from '@nestjs/swagger';
import { type CursorPaginationQuery, CursorPipe } from '../cursor/cursor.pipe';
import { CoursesListResponseDto } from './dto/course-response.dto';

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
  create(@Body() createCourseDto: CreateCourseDto, @CurrentUser() user) {
    return this.coursesService.create(createCourseDto, user);
  }

  @Get()
  @ApiCreatedResponse({
    type: CoursesListResponseDto,
    description: 'List of courses with pagination.',
  })
  findAll(@Query(CursorPipe) params: CursorPaginationQuery) {
    return this.coursesService.findAll(params);
  }

  @Get(':id')
  @ApiCreatedResponse({
    type: CreateCourseDto,
    description: 'The course with the specified ID.',
  })
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Patch(':id')
  @ApiCreatedResponse({
    type: CreateCourseDto,
    description: 'The course with the specified ID has been updated.',
  })
  update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Delete(':id')
  @ApiCreatedResponse({
    type: CreateCourseDto,
    description: 'The course with the specified ID has been deleted.',
  })
  remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }
}
