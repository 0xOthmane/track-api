import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class EnrollmentResponseDto {
  @ApiProperty({ example: 'Introduction to Computer Science' })
  @Expose()
  readonly courseName!: string;

  @ApiProperty({
    example: 'An introductory course to computer science principles.',
    required: false,
    nullable: true,
  })
  @Expose()
  readonly courseDescription!: string | null;

  @ApiProperty({ example: 'Jane Doe' })
  @Expose()
  readonly studentName!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', format: 'date-time' })
  @Expose()
  readonly enrolledAt!: Date;
}
