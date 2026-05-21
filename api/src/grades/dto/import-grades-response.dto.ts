import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ImportGradesResponseDto {
  @ApiProperty({ example: '1709205586916-0' })
  @Expose()
  readonly jobId!: string;

  @ApiProperty({ example: '/grades/import/1709205586916-0' })
  @Expose()
  readonly statusUrl!: string;
}
