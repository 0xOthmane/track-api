import { SetMetadata } from '@nestjs/common';

export type RoleType = 'USER' | 'STUDENT' | 'TEACHER' | 'ADMIN';

export const ROLES_KEY = 'role';

export const Role = (...args: RoleType[]) => SetMetadata(ROLES_KEY, args);
