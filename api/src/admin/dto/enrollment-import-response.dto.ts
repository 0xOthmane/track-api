import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class EnrollmentImportSkippedDto {
  @ApiProperty({ example: 2 })
  @Expose()
  readonly row!: number;

  @ApiProperty({ example: 'Student is already enrolled' })
  @Expose()
  readonly reason!: string;
}

export class EnrollmentImportResponseDto {
  @ApiProperty({ example: 42 })
  @Expose()
  readonly enrolled!: number;

  @ApiProperty({ type: () => [EnrollmentImportSkippedDto] })
  @Expose()
  @Type(() => EnrollmentImportSkippedDto)
  readonly skipped!: EnrollmentImportSkippedDto[];
}
