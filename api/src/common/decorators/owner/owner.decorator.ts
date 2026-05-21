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
  source?: 'params' | 'body' | 'query';
};
export const Owner = (options: OwnerOptions) => SetMetadata(OWNER_KEY, options);
