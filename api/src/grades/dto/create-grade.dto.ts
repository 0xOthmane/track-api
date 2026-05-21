import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, Min } from 'class-validator';
import { EvaluationType } from '../../generated/prisma/enums';

export class CreateGradeDto {
  @ApiProperty({ example: 16 })
  @IsInt({ message: 'Value must be an integer' })
  @Min(0, { message: 'Value must be at least 0' })
  @Max(20, { message: 'Value must be at most 20' })
  readonly value!: number;

  @ApiProperty({ example: 'lWhZHtK7Wx5MVPKso64Q1GXzafBImMdS' })
  @IsString()
  readonly courseId!: string;

  @ApiProperty({ example: 'WlK0RmzfkhKhXEKEYOoRuT1xIIewDVAX' })
  @IsString()
  readonly studentId!: string;

  @ApiProperty({ example: EvaluationType.EXAM, enum: EvaluationType })
  readonly evaluationType!: EvaluationType;
}
