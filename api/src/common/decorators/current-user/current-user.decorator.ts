import { createParamDecorator } from '@nestjs/common';
import { UserRequest } from '../../../types';

export const CurrentUser = createParamDecorator((_data, ctx) => {
  const req = ctx.switchToHttp().getRequest<UserRequest>();
  return req.user;
});
