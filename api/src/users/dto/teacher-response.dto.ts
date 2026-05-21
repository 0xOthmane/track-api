import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class TeacherResponseDto {
  @ApiProperty({ example: 'Jane Doe' })
  @Expose()
  readonly name!: string;

  @ApiProperty({ example: 'jane.doe@example.com', format: 'email' })
  @Expose()
  readonly email!: string;

  //   @ApiProperty({ example: 'USER' })
  //   @Expose()
  //   readonly role!: string;
}
