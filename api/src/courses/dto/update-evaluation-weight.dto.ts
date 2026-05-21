import { PartialType } from '@nestjs/swagger';
import { CreateEvaluationWeightDto } from './create-evaluation-weight.dto';

export class UpdateEvaluationWeightDto extends PartialType(
  CreateEvaluationWeightDto,
) {}
