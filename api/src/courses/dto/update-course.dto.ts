import { PartialType, PickType } from '@nestjs/swagger';
import { CreateCourseDto } from './create-course.dto';

export class UpdateCourseDto extends PartialType(
  PickType(CreateCourseDto, [
    'name',
    'description',
    'capacity',
    'semester',
    'teacherId',
  ] as const),
) {}
