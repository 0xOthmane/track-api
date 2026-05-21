import { SetMetadata } from '@nestjs/common';

export const OWNER_KEY = 'owner';

type PrismaModel =
  | 'course'
  | 'grade'
  | 'enrollment'
  | 'evaluationWeight'
  | 'user';

export type OwnerOptions = {
  model: PrismaModel;
  field?: string;
  param?: string;
};
export const Owner = (...args: string[]) => SetMetadata(OWNER_KEY, args);
