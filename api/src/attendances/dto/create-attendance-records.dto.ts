import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { CreateAttendanceRecordDto } from './create-attendance-record.dto';

export class CreateAttendanceRecordsDto {
  @ApiProperty({ type: [CreateAttendanceRecordDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateAttendanceRecordDto)
  readonly records!: CreateAttendanceRecordDto[];
}
