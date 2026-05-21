import { ApiProperty } from '@nestjs/swagger';
import { ImportGradesDto } from './import-grades.dto';

export class ImportGradesRequestDto extends ImportGradesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  readonly file!: unknown;
}
