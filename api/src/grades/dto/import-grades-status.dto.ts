import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class ImportGradesRowErrorDto {
  @ApiProperty({ example: 3 })
  @Expose()
  readonly rowNumber!: number;

  @ApiProperty({ example: 'Student not found' })
  @Expose()
  readonly message!: string;
}

export class ImportGradesResultDto {
  @ApiProperty({ example: 12 })
  @Expose()
  readonly successCount!: number;

  @ApiProperty({ example: 2 })
  @Expose()
  readonly failureCount!: number;

  @ApiProperty({ type: () => [ImportGradesRowErrorDto] })
  @Expose()
  @Type(() => ImportGradesRowErrorDto)
  readonly errors!: ImportGradesRowErrorDto[];
}

export class ImportGradesStatusDto {
  @ApiProperty({ example: '1709205586916-0' })
  @Expose()
  readonly jobId!: string;

  @ApiProperty({ example: 'completed' })
  @Expose()
  readonly status!: string;

  @ApiProperty({ example: 100 })
  @Expose()
  readonly progress!: number | Record<string, unknown>;

  @ApiProperty({ type: () => ImportGradesResultDto, nullable: true })
  @Expose()
  @Type(() => ImportGradesResultDto)
  readonly result!: ImportGradesResultDto | null;

  @ApiProperty({ example: null, nullable: true })
  @Expose()
  readonly error!: string | null;
}
