import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { SafeUser } from '../types/safe-user.type';

export const CurrentUser = createParamDecorator(
  <K extends keyof SafeUser>(
    data: K | undefined,
    ctx: ExecutionContext,
  ): SafeUser | SafeUser[K] => {
    const user = ctx.switchToHttp().getRequest().user as SafeUser;

    return data ? user[data] : user;
  },
);
