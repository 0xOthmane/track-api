import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class CreateAttendanceSessionDto {
  @ApiProperty({ example: '2023-10-01T10:00:00Z' })
  @IsNotEmpty()
  @IsDateString()
  readonly date!: string;
}
