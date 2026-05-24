import { Expose, Type } from 'class-transformer';
import { TeacherResponseDto } from '../../users/dto/teacher-response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dtos/pagination-meta.dto';

export class CourseResponseDto {
  @ApiProperty({ example: 'clp7x1f0a0000xv7t7v9a9c6b' })
  @Expose()
  readonly id!: string;

  @ApiProperty({
    example: 'Introduction to Computer Science',
  })
  @Expose()
  readonly name!: string;

  @ApiProperty({
    example: 'An introductory course to computer science principles.',
  })
  @Expose()
  readonly description!: string;

  @ApiProperty({
    example: 30,
  })
  @Expose()
  readonly capacity!: number;

  @ApiProperty({
    example: 'Fall 2023',
  })
  @Expose()
  readonly semester!: string;

  @ApiProperty({ type: () => TeacherResponseDto, nullable: true })
  @Expose()
  @Type(() => TeacherResponseDto)
  readonly teacher!: TeacherResponseDto | null;
}

export class CoursesListResponseDto {
  @ApiProperty({ type: () => [CourseResponseDto] })
  readonly data!: CourseResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  readonly meta!: PaginationMetaDto;
}
