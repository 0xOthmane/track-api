import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core/services/reflector.service';
import { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRequest } from '../../../types';
import { OwnerOptions } from './owner.decorator';

type OwnedResource = {
  [key: string]: unknown;
};

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<OwnerOptions>('owner', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) {
      return true;
    }
    const { model, field, param } = options;
    const user = context.switchToHttp().getRequest<UserRequest>().user;
    const resourceId = context.switchToHttp().getRequest<Request>().params[
      param || 'id'
    ];
    if (Array.isArray(resourceId)) {
      throw new BadRequestException('Invalid resource id');
    }
    let ressource: OwnedResource | null;
    switch (model) {
      case 'course':
        ressource = await this.prisma.course.findUnique({
          where: {
            id: resourceId,
          },
        });
        break;
      case 'grade':
        ressource = await this.prisma.grade.findUnique({
          where: {
            id: resourceId,
          },
        });
        break;
      case 'enrollment':
        ressource = await this.prisma.enrollment.findUnique({
          where: {
            id: resourceId,
          },
        });
        break;
      default:
        throw new BadRequestException('Invalid model');
    }

    if (!ressource) {
      throw new NotFoundException(`${model} with ID ${resourceId} not found`);
    }

    const isOwner = ressource[field || 'userId'] === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) throw new ForbiddenException();

    return true;
  }
}
