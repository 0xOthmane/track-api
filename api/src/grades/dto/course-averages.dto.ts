import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class EvaluationAverageDto {
  @ApiProperty({ example: 'EXAM' })
  @Expose()
  readonly evaluationType!: string;

  @ApiProperty({ example: 14.5, nullable: true })
  @Expose()
  readonly average!: number | null;

  @ApiProperty({ example: 12 })
  @Expose()
  readonly count!: number;
}

export class CourseAveragesResponseDto {
  @ApiProperty({ example: 'lWhZHtK7Wx5MVPKso64Q1GXzafBImMdS' })
  @Expose()
  readonly courseId!: string;

  @ApiProperty({ example: 13.2, nullable: true })
  @Expose()
  readonly overallAverage!: number | null;

  @ApiProperty({ example: 24 })
  @Expose()
  readonly overallCount!: number;

  @ApiProperty({ type: () => [EvaluationAverageDto] })
  @Expose()
  @Type(() => EvaluationAverageDto)
  readonly averages!: EvaluationAverageDto[];
}
