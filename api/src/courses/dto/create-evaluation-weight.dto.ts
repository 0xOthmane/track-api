import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, Max, Min } from 'class-validator';
import { EvaluationType } from '../../generated/prisma/enums';

export class CreateEvaluationWeightDto {
  @ApiProperty({ example: 'EXAM', enum: EvaluationType })
  @IsEnum(EvaluationType)
  @IsNotEmpty({ message: 'Type is required' })
  readonly type!: EvaluationType;

  @ApiProperty({ example: 40 })
  @IsNumber({}, { message: 'Weight must be a number' })
  @Min(0, { message: 'Weight must be at least 0' })
  @Max(100, { message: 'Weight must be at most 100' })
  @IsNotEmpty({ message: 'Weight is required' })
  readonly weight!: number;
}
