import { PartialType, PickType } from '@nestjs/swagger';
import { CreateGradeDto } from './create-grade.dto';

export class UpdateGradeDto extends PartialType(
  PickType(CreateGradeDto, ['value']),
) {}
