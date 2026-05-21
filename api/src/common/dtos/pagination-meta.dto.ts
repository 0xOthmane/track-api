import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ nullable: true })
  readonly nextCursor!: string | null;
}
