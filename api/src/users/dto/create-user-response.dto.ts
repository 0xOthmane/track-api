import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({ example: 'clp7x1f0a0000xv7t7v9a9c6b' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 'jane.doe@example.com', format: 'email' })
  @Expose()
  email!: string;

  @ApiProperty({ example: 'USER' })
  @Expose()
  role!: string;

  @ApiProperty({ example: false })
  @Expose()
  banned!: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', format: 'date-time' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-02T00:00:00.000Z', format: 'date-time' })
  @Expose()
  updatedAt!: Date;
}
