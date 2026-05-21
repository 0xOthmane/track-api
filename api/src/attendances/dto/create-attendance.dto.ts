import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class CreateAttendanceDto {
  @ApiProperty({ example: 'clp7x1f0a0000xv7t7v9a9c6b' })
  @IsString()
  @IsNotEmpty()
  readonly studentId!: string;

  @ApiProperty({ example: 'clp7x1f0a0000xv7t7v9a9c6b' })
  @IsString()
  @IsNotEmpty()
  readonly sessionId!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsNotEmpty()
  readonly present!: boolean;
}
