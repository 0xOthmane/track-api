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
import { RoleGuard } from '../role/role.guard';
import { Role } from '../role/role.decorator';
import { ApiCreatedResponse } from '@nestjs/swagger';
import {
  UserResponseDto,
  UsersListResponseDto,
} from './dto/create-user-response.dto';
import { type CursorPaginationQuery, CursorPipe } from '../cursor/cursor.pipe';

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
  findAll(@Query(CursorPipe) params: CursorPaginationQuery) {
    return this.usersService.findAll(params);
  }

  @Get(':id')
  @ApiCreatedResponse({
    type: UserResponseDto,
    description: 'The user with the specified ID.',
  })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiCreatedResponse({
    type: UserResponseDto,
    description: 'The user has been successfully updated.',
  })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiCreatedResponse({
    type: UserResponseDto,
    description: 'The user has been successfully deleted.',
  })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
