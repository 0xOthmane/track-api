import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { EvaluationType } from '../../generated/prisma/enums';

export class EvaluationWeightResponseDto {
  @ApiProperty({ example: 'clp7x1f0a0000xv7t7v9a9c6b' })
  @Expose()
  readonly id!: string;

  @ApiProperty({ example: 'EXAM', enum: EvaluationType })
  @Expose()
  readonly type!: EvaluationType;

  @ApiProperty({ example: 40 })
  @Expose()
  readonly weight!: number;

  @ApiProperty({ example: 'clp7x1f0a0000xv7t7v9a9c6b' })
  @Expose()
  readonly courseId!: string;
}
