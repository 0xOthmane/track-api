import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dtos/pagination-meta.dto';
import { Expose, Transform } from 'class-transformer';
import { Course, User, Grade } from '../../generated/prisma/client';

export class GradeResponseDto {
  @ApiProperty({ example: 'clp7x1f0a0000xv7t7v9a9c6b' })
  @Expose()
  readonly id!: string;

  @ApiProperty({ example: 14 })
  @Expose()
  readonly value!: number;

  @ApiProperty({ example: 'Final Exam' })
  @Expose()
  readonly evaluationType!: string;

  @ApiProperty({ example: 'Math 101' })
  @Expose()
  @Transform(({ obj }: { obj: Grade & { course?: Course } }) => obj.course?.name)
  readonly courseName!: string;

  @ApiProperty({ example: 'John Doe' })
  @Expose()
  @Transform(({ obj }: { obj: Grade & { student?: User } }) => obj.student?.name)
  readonly studentName!: string;
}

export class GradeListResponseDto {
  @ApiProperty({ type: () => [GradeResponseDto] })
  @Expose()
  readonly data!: GradeResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  @Expose()
  readonly meta!: PaginationMetaDto;
}
