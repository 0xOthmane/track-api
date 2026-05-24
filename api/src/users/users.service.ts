import {
  ConflictException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { plainToInstance } from 'class-transformer';
import { CursorPaginationQuery } from '../common/pipes/cursor/cursor.pipe';
import { auth } from '../lib/auth';
import { PrismaService } from '../prisma/prisma.service';
import { UserResponseDto } from './dto/create-user-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * UsersService
   *
   * Manages user lifecycle through the external auth provider and Prisma.
   * Maps responses into `UserResponseDto` for controllers.
   */

  /**
   * Create a new user via the external auth API and return a sanitized DTO.
   */
  async create(createUserDto: CreateUserDto) {
    try {
      const user = await auth.api.createUser({
        body: {
          name: createUserDto.name,
          email: createUserDto.email,
          password: createUserDto.password,
          data: {
            role: createUserDto.role,
          },
        },
      });
      return plainToInstance(UserResponseDto, user.user, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('A user with this email already exists');
        }
      }

      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException();
    }
  }

  /**
   * List users with cursor pagination.
   */
  async findAll(params: CursorPaginationQuery) {
    const { cursor, limit } = params;
    const users = await this.prisma.user.findMany({
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    const nextCursor =
      users.length === limit ? users[users.length - 1].id : null;
    return {
      data: plainToInstance(UserResponseDto, users, {
        excludeExtraneousValues: true,
      }),
      meta: { nextCursor },
    };
  }

  /**
   * Retrieve a user by id.
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update user record.
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
      });
      return plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('User not found');
        }
        if (error.code === 'P2002') {
          throw new ConflictException('A user with this email already exists');
        }
      }
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException();
    }
  }

  /**
   * Delete a user by id.
   */
  async remove(id: string) {
    try {
      const user = await this.prisma.user.delete({
        where: { id },
      });
      return plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('User not found');
        }
      }
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException();
    }
  }
}
