import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class EnrollCourseDto {
  @ApiProperty({ example: 'clp7x1f0a0000xv7t7v9a9c6b' })
  @IsString()
  @IsNotEmpty({ message: 'Student ID is required' })
  readonly studentId!: string;
}
