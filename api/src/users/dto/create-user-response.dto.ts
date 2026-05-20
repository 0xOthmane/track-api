import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CreateUserResponseDto {
  @ApiProperty({ example: 'clp7x1f0a0000xv7t7v9a9c6b' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 'jane.doe@example.com', format: 'email' })
  @Expose()
  email!: string;
}
