import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RoleGuard } from '../common/decorators/role/role.guard';
import { Role } from '../common/decorators/role/role.decorator';
import { ApiCreatedResponse } from '@nestjs/swagger';
import {
  UserResponseDto,
  UsersListResponseDto,
} from './dto/create-user-response.dto';
import {
  type CursorPaginationQuery,
  CursorPipe,
} from '../common/pipes/cursor/cursor.pipe';

@Controller('users')
@UseGuards(RoleGuard)
@Role('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiCreatedResponse({
    type: UserResponseDto,
    description: 'The user has been successfully created.',
  })
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }

  @Get()
  @ApiCreatedResponse({
    type: UsersListResponseDto,
    description: 'List of users with pagination.',
  })
  async findAll(@Query(CursorPipe) params: CursorPaginationQuery) {
    return await this.usersService.findAll(params);
  }

  @Get(':id')
  @ApiCreatedResponse({
    type: UserResponseDto,
    description: 'The user with the specified ID.',
  })
  async findOne(@Param('id') id: string) {
    return await this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiCreatedResponse({
    type: UserResponseDto,
    description: 'The user has been successfully updated.',
  })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return await this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiCreatedResponse({
    type: UserResponseDto,
    description: 'The user has been successfully deleted.',
  })
  async remove(@Param('id') id: string) {
    return await this.usersService.remove(id);
  }
}
