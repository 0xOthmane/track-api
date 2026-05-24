import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

export class CreateAttendanceRecordDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  readonly present!: boolean;

  @ApiProperty({ example: '' })
  @IsString()
  readonly studentId!: string;
}
