import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { ApiTags } from '@nestjs/swagger';
import type { Express } from 'express';
import { Owner } from '../common/decorators/owner/owner.decorator';
import { OwnerGuard } from '../common/decorators/owner/owner.guard';
import { Role } from '../common/decorators/role/role.decorator';
import { RoleGuard } from '../common/decorators/role/role.guard';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { GradesService } from './grades.service';
import { CurrentUser } from '../common/decorators/current-user/current-user.decorator';
import { type User } from '../generated/prisma/client';
import { type CursorPaginationQuery } from '../common/pipes/cursor/cursor.pipe';
import { ImportGradesDto } from './dto/import-grades.dto';
import { ImportGradesRequestDto } from './dto/import-grades-request.dto';

@Controller('grades')
@ApiTags('grades')
@UseGuards(RoleGuard, OwnerGuard)
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Post()
  @Role('TEACHER')
  @Owner({ model: 'course', field: 'courseId' })
  create(@Body() createGradeDto: CreateGradeDto, @CurrentUser() user: User) {
    return this.gradesService.create(createGradeDto, user);
  }

  @Get()
  @Role('TEACHER', 'ADMIN')
  findAll(@Query() params: CursorPaginationQuery, @CurrentUser() user: User) {
    return this.gradesService.findAll(params, user);
  }

  @Get('me')
  @Role('STUDENT')
  findMine(@Query() params: CursorPaginationQuery, @CurrentUser() user: User) {
    return this.gradesService.findMine(params, user);
  }

  @Get('course/:id')
  @Role('TEACHER', 'ADMIN')
  @Owner({ model: 'course', field: 'teacherId' })
  findByCourse(
    @Param('id') id: string,
    @Query() params: CursorPaginationQuery,
  ) {
    return this.gradesService.findByCourse(id, params);
  }

  @Get('course/:id/averages')
  @Role('TEACHER', 'ADMIN')
  @Owner({ model: 'course', field: 'teacherId' })
  getCourseAverages(@Param('id') id: string) {
    return this.gradesService.getCourseAverages(id);
  }

  @Post('import')
  @Role('TEACHER')
  @Owner({
    model: 'course',
    field: 'teacherId',
    param: 'courseId',
    source: 'query',
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ImportGradesRequestDto })
  importGrades(
    @Body() body: ImportGradesDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.gradesService.enqueueImport(body, file, user);
  }

  @Get('import/:jobId')
  @Role('TEACHER', 'ADMIN')
  getImportStatus(@Param('jobId') jobId: string, @CurrentUser() user: User) {
    return this.gradesService.getImportStatus(jobId, user);
  }

  @Get(':id')
  @Role('TEACHER', 'ADMIN')
  findOne(@Param('id') id: string) {
    return this.gradesService.findOne(id);
  }

  @Patch(':id')
  @Role('TEACHER')
  @Owner({ model: 'grade', field: 'createdById' })
  update(@Param('id') id: string, @Body() updateGradeDto: UpdateGradeDto) {
    return this.gradesService.update(id, updateGradeDto);
  }

  @Delete(':id')
  @Role('TEACHER', 'ADMIN')
  @Owner({ model: 'grade', field: 'createdById' })
  remove(@Param('id') id: string) {
    return this.gradesService.remove(id);
  }
}
