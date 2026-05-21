import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ImportGradesDto {
  @ApiProperty({ example: 'lWhZHtK7Wx5MVPKso64Q1GXzafBImMdS' })
  @IsString()
  readonly courseId!: string;
}
