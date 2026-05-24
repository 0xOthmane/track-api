import { PartialType } from '@nestjs/swagger';
import { CreateAttendanceSessionDto } from './create-attendance-session.dto';

export class UpdateAttendanceSessionDto extends PartialType(
  CreateAttendanceSessionDto,
) {}
