import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isString } from 'class-validator';

export interface CursorPaginationQuery {
  cursor?: string;
  limit?: number;
}

@Injectable()
export class CursorPipe implements PipeTransform {
  transform(value: Record<string, string>): CursorPaginationQuery {
    const cursor = value.cursor;
    const limit = Math.min(parseInt(value.limit ?? '20', 10), 100);

    if (isNaN(limit) || limit <= 0) {
      throw new BadRequestException('Limit must be a positive integer');
    }

    if (cursor && !isString(cursor)) {
      throw new BadRequestException('Cursor must be a string');
    }

    return { cursor, limit };
  }
}
