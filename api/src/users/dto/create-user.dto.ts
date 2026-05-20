import { Transform, type TransformFnParams } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum UserRole {
  Student = 'STUDENT',
  Teacher = 'TEACHER',
  Admin = 'ADMIN',
}

export class CreateUserDto {
  @ApiProperty({ example: 'Jane Doe', minLength: 2, maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Name must be at most 50 characters long' })
  readonly name!: string;

  @ApiProperty({ example: 'jane.doe@example.com', format: 'email' })
  @Transform(({ value }: TransformFnParams) => String(value).toLowerCase())
  @IsEmail()
  @IsNotEmpty()
  readonly email!: string;

  @ApiProperty({ example: 'StrongPassword123', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  readonly password!: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  @IsNotEmpty()
  readonly role!: UserRole;
}
