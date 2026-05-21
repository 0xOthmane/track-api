import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { PaginationMetaDto } from '../../common/dtos/pagination-meta.dto';

export class UserResponseDto {
  @ApiProperty({ example: 'clp7x1f0a0000xv7t7v9a9c6b' })
  @Expose()
  readonly id!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @Expose()
  readonly name!: string;

  @ApiProperty({ example: 'jane.doe@example.com', format: 'email' })
  @Expose()
  readonly email!: string;

  @ApiProperty({ example: 'USER' })
  @Expose()
  readonly role!: string;

  @ApiProperty({ example: false })
  @Expose()
  readonly banned!: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', format: 'date-time' })
  @Expose()
  readonly createdAt!: Date;

  @ApiProperty({ example: '2024-01-02T00:00:00.000Z', format: 'date-time' })
  @Expose()
  readonly updatedAt!: Date;
}

export class UsersListResponseDto {
  @ApiProperty({ type: () => [UserResponseDto] })
  readonly data!: UserResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  readonly meta!: PaginationMetaDto;
}
