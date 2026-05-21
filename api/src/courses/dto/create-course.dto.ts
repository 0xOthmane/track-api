import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({
    example: 'Introduction to Programming',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name must be at most 100 characters long' })
  @IsNotEmpty({ message: 'Name is required' })
  readonly name!: string;

  @ApiProperty({ example: 'A basic introduction to programming concepts.' })
  @IsString()
  readonly description!: string;

  @ApiProperty({ example: 30 })
  @IsInt({ message: 'Capacity must be an integer' })
  @IsNotEmpty({ message: 'Capacity is required' })
  readonly capacity!: number;

  @ApiProperty({ example: 'Fall 2023' })
  @IsString()
  @MinLength(8, { message: 'Semester must be at least 8 characters long' })
  @MaxLength(50, { message: 'Semester must be at most 50 characters long' })
  @IsNotEmpty({ message: 'Semester is required' })
  readonly semester!: string;

  @ApiProperty({ example: 'clp7x1f0a0000xv7t7v9a9c6b' })
  @IsString()
  @IsNotEmpty({ message: 'Teacher ID is required' })
  readonly teacherId!: string;
}
