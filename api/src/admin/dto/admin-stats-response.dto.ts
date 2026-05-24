import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class AdminCourseAverageDto {
  @ApiProperty({ example: 'course-id' })
  @Expose()
  readonly courseId!: string;

  @ApiProperty({ example: 'Introduction to Computer Science' })
  @Expose()
  readonly courseName!: string;

  @ApiProperty({ example: 14.5, nullable: true })
  @Expose()
  readonly average!: number | null;
}

export class AdminStatsResponseDto {
  @ApiProperty({ example: 'Fall 2024' })
  @Expose()
  readonly semester!: string;

  @ApiProperty({ example: 120 })
  @Expose()
  readonly totalStudents!: number;

  @ApiProperty({ example: 8 })
  @Expose()
  readonly totalCourses!: number;

  @ApiProperty({ type: () => [AdminCourseAverageDto] })
  @Expose()
  @Type(() => AdminCourseAverageDto)
  readonly averageGradePerCourse!: AdminCourseAverageDto[];

  @ApiProperty({ example: 17 })
  @Expose()
  readonly globalAtRiskCount!: number;
}
