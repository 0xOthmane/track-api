import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AdminService } from './admin.service';
import { Role } from '../common/decorators/role/role.decorator';
import { RoleGuard } from '../common/decorators/role/role.guard';
import { AdminStatsQueryDto } from './dto/admin-stats-query.dto';
import { EnrollmentImportResponseDto } from './dto/enrollment-import-response.dto';
import { AdminStatsResponseDto } from './dto/admin-stats-response.dto';
import { AdminSemesterSummaryResponseDto } from './dto/admin-semester-summary-response.dto';

@Controller('admin')
@UseGuards(RoleGuard)
@Role('ADMIN')
@ApiTags('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('semester/:semester')
  async getSemesterReport(
    @Param('semester') semester: string,
    @Res() res: Response,
  ) {
    const csv = await this.adminService.getSemesterReportCsv(semester);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="semester-${semester}.csv"`,
    );
    res.send(csv);
  }

  @Post('enrollments')
  @ApiConsumes('text/csv', 'text/plain')
  @ApiOkResponse({ type: EnrollmentImportResponseDto })
  async importEnrollments(@Body() csv: string) {
    return await this.adminService.importEnrollments(csv);
  }

  @Get('stats')
  @ApiOkResponse({ type: AdminStatsResponseDto })
  async getStats(@Query() query: AdminStatsQueryDto) {
    return await this.adminService.getStats(query.semester);
  }

  @Post('stats/:semester/summary')
  @ApiOkResponse()
  async sendSemesterSummary(
    @Param('semester') semester: string,
  ): Promise<AdminSemesterSummaryResponseDto> {
    return this.adminService.sendSemesterSummary(semester);
  }
}
