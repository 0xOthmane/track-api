import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { auth } from 'src/lib/auth';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { plainToInstance } from 'class-transformer';
import { CreateUserResponseDto } from './dto/create-user-response.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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
      return plainToInstance(CreateUserResponseDto, user.user, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('A user with this email already exists');
        }
      }

      throw error;
    }
  }

  findAll() {
    return `This action returns all users`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
