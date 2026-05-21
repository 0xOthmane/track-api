import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core/services/reflector.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRequest } from '../../../types';
import { OwnerOptions } from './owner.decorator';
import { Request } from 'express';

type OwnedResource = {
  [key: string]: unknown;
};
type ResourceSource = Record<string, string | string[] | undefined>;

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
    const { model, field, param, source } = options;
    const request = context.switchToHttp().getRequest<Request & UserRequest>();
    const user = request.user;
    const resourceKey = param || 'id';
    const sourceKey = source ?? 'params';
    const resourceSource: ResourceSource =
      sourceKey === 'body'
        ? (request.body as ResourceSource)
        : sourceKey === 'query'
          ? (request.query as ResourceSource)
          : request.params;
    const resourceId = resourceSource?.[resourceKey];
    if (!resourceId || Array.isArray(resourceId)) {
      console.error('Invalid resource :', resourceSource);
      console.error('Invalid resource ID:', resourceId);
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
