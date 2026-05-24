import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AdminStatsResponseDto } from './admin-stats-response.dto';

export class AdminSemesterSummaryResponseDto {
  @ApiProperty({ example: 'Fall 2024' })
  @Expose()
  readonly semester!: string;

  @ApiProperty({ example: true })
  @Expose()
  readonly sent!: boolean;

  @ApiProperty({ example: 'Simulated summary email logged successfully' })
  @Expose()
  readonly message!: string;

  @ApiProperty({ type: () => AdminStatsResponseDto })
  @Expose()
  @Type(() => AdminStatsResponseDto)
  readonly stats!: AdminStatsResponseDto;
}
