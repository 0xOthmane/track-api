import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AdminStatsQueryDto {
  @ApiProperty({ example: 'Fall 2024' })
  @IsString()
  @IsNotEmpty()
  readonly semester!: string;
}
